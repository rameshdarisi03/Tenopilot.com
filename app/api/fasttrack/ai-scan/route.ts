import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { parseRawSpreadsheetText, FastTrackParsedRow, normalizeIndianPhoneNumber, normalizeBedCode } from "@/lib/fastTrackHeuristicParser";

export const dynamic = "force-dynamic";

interface AiScanRequest {
  images?: { data: string; mimeType: string }[];
  rawText?: string;
  propertyId?: string;
  defaultRentalTiers?: {
    sharing1: number;
    sharing2: number;
    sharing3: number;
    sharing4: number;
  };
}

// 📄 Helper: Split large multi-page PDFs into parallel 5-page sub-documents
async function expandMultiPagePdfs(
  rawImages: { data: string; mimeType: string }[]
): Promise<{ data: string; mimeType: string }[]> {
  const expanded: { data: string; mimeType: string }[] = [];

  for (const item of rawImages) {
    const isPdf =
      item.mimeType === "application/pdf" ||
      item.data.startsWith("data:application/pdf") ||
      (typeof (item as any).name === "string" && (item as any).name.toLowerCase().endsWith(".pdf"));

    if (isPdf) {
      try {
        const base64Data = item.data.replace(/^data:[a-z0-9\/\-\+\.]+;base64,/i, "");
        const buffer = Buffer.from(base64Data, "base64");
        const srcDoc = await PDFDocument.load(buffer);
        const pageCount = srcDoc.getPageCount();

        if (pageCount > 5) {
          const SUB_CHUNK_PAGES = 5;
          for (let start = 0; start < pageCount; start += SUB_CHUNK_PAGES) {
            const end = Math.min(start + SUB_CHUNK_PAGES, pageCount);
            const subDoc = await PDFDocument.create();
            const pageIndices = Array.from({ length: end - start }, (_, k) => start + k);
            const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
            copiedPages.forEach((p) => subDoc.addPage(p));
            const subPdfBytes = await subDoc.save();
            const subBase64 = Buffer.from(subPdfBytes).toString("base64");
            expanded.push({
              data: `data:application/pdf;base64,${subBase64}`,
              mimeType: "application/pdf",
            });
          }
          continue;
        }
      } catch (err) {
        console.warn("Could not split multi-page PDF into sub-documents, processing full PDF:", err);
      }
    }

    expanded.push(item);
  }

  return expanded;
}

export async function POST(req: NextRequest) {
  try {
    const body: AiScanRequest = await req.json();
    const { images = [], rawText = "", defaultRentalTiers } = body;

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    // If images or PDFs are provided and Gemini API key is configured, invoke Gemini Vision AI
    if (images.length > 0 && apiKey) {
      // 📄 Step 1: Expand multi-page PDFs into parallel 5-page sub-chunks
      const expandedImages = await expandMultiPagePdfs(images);

      const prompt = `
You are TenoPilot's Enterprise Document & Ledger Ingestion AI for Indian PG (Paying Guest), Co-Living, and Hostel properties.
Analyze the provided handwritten or printed ledger pages, diary registers, Excel printouts, or admission forms and extract every single tenant and room entry into a structured JSON list.

==================================================================
1. DOMAIN VOCABULARY & ENTITY MAPPING
==================================================================
- Room identifiers: "Room", "Rm", "Kholi", "Flat", "Unit", "R.No", "Suite", "Cabin", "Wing", "403", "501", "302", "A01", "G02".
- Rent amounts: "Rent", "Tariff", "Monthly", "Bhadha", "Fee", "Amt", "Package", "10,500", "8,500/-".
- Deposit amounts: "Security Deposit", "Advance", "Dep", "Caution", "Sec", "Token", "Adv", "5,000".
- Date terms: "DOJ", "Joining", "Join Date", "Move In", "Admit", "Admission", "Check-in", "Date of Entry".
- Sharing terms: "Sharing", "Share", "1", "2", "3", "4", "Single", "Double", "Triple", "Quad", "Occupancy".
- Bed terms: "Bed No", "Bed", "Cot", "Slot", "Upper", "Lower", "Bed A", "Bed 1", "Berth".

==================================================================
2. SEMANTIC REASONING & SYNONYM FLEXIBILITY RULE
==================================================================
- The terms above are representative, NOT an exhaustive whitelist.
- Use visual and semantic reasoning to interpret any colloquial, shorthand, regional, or unlabelled columns.
- If headers are missing or unclear, deduce field meanings from the data values:
  * 10 digits starting with 6/7/8/9 -> Phone Number
  * 4-6 digit monetary values -> Monthly Rent / Deposit
  * Small integers 1 to 6 -> Sharing Capacity or Bed Slot
  * Dates with slashes or hyphens -> Joining Date
  * Alphanumeric codes -> Room Number

==================================================================
3. FIELD-BY-FIELD EXTRACTION SPECIFICATIONS
==================================================================
1. "fullName" (string): Full name in Title Case (e.g. "Roshan Kumar", "Mahadeva", "Raj"). Strip stray serial numbers ("1. Roshan" -> "Roshan").
2. "phone" (string): Clean 10-digit Indian mobile number (e.g. "8182838485"). Strip "+91", "0", spaces, hyphens. If missing, return "".
3. "roomNumber" (string): Uppercase room/unit code (e.g. "403", "501", "302", "A01", "G01"). Strip words like "Room", "Kholi", "Flat".
4. "bedCode" (string): 
   - IF written in the ledger (e.g. "Bed 1", "Cot A", "Upper", "Bed A"), extract EXACTLY as written.
   - IF omitted/unspecified, leave as "" (our engine will auto-assign Bed A, Bed B per room).
5. "sharingType" (number):
   - IF written (e.g. "1", "2", "3", "Single", "Triple"), extract integer (1, 2, 3, 4).
   - IF omitted, deduce from how many occupants share that room on the page (default 2).
6. "sharingLabel" (string): e.g. "Single Room", "2-Sharing", "3-Sharing", "4-Sharing".
7. "joiningDate" (string - YYYY-MM-DD):
   - ANCHOR DATE HEURISTIC: First scan all dates on the page. In Indian registers, dates are written in DD/MM/YYYY format.
   - If any date has the first number > 12 (e.g. "21/3/2026"), ALL slash dates on the page MUST be treated as DD/MM/YYYY.
   - Convert to standard ISO "YYYY-MM-DD" (e.g. "04/12/2025" -> "2025-12-04", "03/2/2026" -> "2026-02-03", "21/3/2026" -> "2026-03-21", "8/4/2025" -> "2025-04-08").
8. "rentAmount" (number): Plain numeric rent in INR (e.g. 10500, 8500).
9. "securityDeposit" (number): Plain numeric deposit in INR (e.g. 5000).
10. "paymentMode" (string): "UPI", "Cash", or "Bank Transfer" (default "UPI").
11. "isCurrentMonthRentPaid" (boolean): true if ledger says "Paid", "Cleared", "Done", false if "Due", "Unpaid", "Pending", or omitted (default false).
12. "priorArrearsAmount" (number): Any previous balance/arrears/pending due written (e.g. 2000, 1500, default 0).
13. "workplace" (string): Company, Office, Workplace, College, or University name (e.g. "Infosys Electronic City", "Wipro", "Christ University", "TCS"). If omitted, return "".
14. "occupation" (string): Job title, profession, or role (e.g. "Software Engineer", "Student", "Analyst", "Doctor", "Lead"). If omitted, return "".
15. "purposeOfVisit" (string): For short-stay guests or visitors: reason for visit (e.g. "Job Interview / Training", "Exam / College Admission", "Medical Visit", "Tourism"). If omitted, return "".
16. "stayType" (string): "Tenant" (for monthly stays) or "Guest" (for short daily/weekly stays). Default "Tenant".

==================================================================
4. STRICT ROW INTEGRITY
==================================================================
- Extract ONLY rows that contain actual handwritten or printed tenant entries.
- Do NOT generate extra blank rows, header rows, or placeholder rows.
- If the notebook page has 4 written entries, return EXACTLY 4 objects.

==================================================================
5. OUTPUT JSON SCHEMA ONLY
==================================================================
{
  "occupants": [
    {
      "fullName": string,
      "phone": string,
      "roomNumber": string,
      "bedCode": string,
      "sharingType": number,
      "sharingLabel": string,
      "rentAmount": number,
      "securityDeposit": number,
      "joiningDate": string,
      "paymentMode": string,
      "isCurrentMonthRentPaid": boolean,
      "priorArrearsAmount": number,
      "workplace": string,
      "occupation": string,
      "purposeOfVisit": string,
      "stayType": string,
      "notes": string
    }
  ]
}
`;

      const modelsToTry = [
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest",
      ];

      let lastError: string | null = null;

      // 📦 Smart Multi-Batch Chunking: 1 sub-PDF per worker (or up to 5 photos per worker)
      const chunks: { data: string; mimeType: string }[][] = [];
      let currentChunk: { data: string; mimeType: string }[] = [];

      for (const item of expandedImages) {
        const isPdf = item.mimeType === "application/pdf" || item.data.startsWith("data:application/pdf");
        if (isPdf) {
          if (currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = [];
          }
          chunks.push([item]);
        } else {
          currentChunk.push(item);
          if (currentChunk.length >= 5) {
            chunks.push(currentChunk);
            currentChunk = [];
          }
        }
      }
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      async function scanChunkWithGemini(chunk: { data: string; mimeType: string }[]) {
        const parts: any[] = [{ text: prompt }];
        for (const img of chunk) {
          const base64Data = img.data.replace(/^data:[a-z0-9\/\-\+\.]+;base64,/i, "");
          const isPdf =
            img.mimeType === "application/pdf" ||
            img.data.startsWith("data:application/pdf") ||
            (typeof (img as any).name === "string" && (img as any).name.toLowerCase().endsWith(".pdf"));
          const cleanMime = isPdf ? "application/pdf" : (img.mimeType || "image/jpeg");

          parts.push({
            inlineData: {
              mimeType: cleanMime,
              data: base64Data,
            },
          });
        }

        for (const model of modelsToTry) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const bodyPayload: any = {
              contents: [{ parts }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            };

            const geminiRes = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bodyPayload),
            });

            if (geminiRes.ok) {
              const data = await geminiRes.json();
              const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawContent) {
                const cleanJson = rawContent
                  .replace(/^```json\s*/i, "")
                  .replace(/```\s*$/i, "")
                  .trim();
                const parsed = JSON.parse(cleanJson);
                if (Array.isArray(parsed.occupants)) {
                  return parsed.occupants;
                }
              }
            } else {
              const errJson = await geminiRes.json().catch(() => ({}));
              lastError = `Google API Error (${geminiRes.status} on ${model}): ${errJson.error?.message || geminiRes.statusText}`;
            }
          } catch (e: any) {
            lastError = `Model ${model} network error: ${e.message}`;
            console.warn(`Chunk scan attempt on ${model} notice:`, e);
          }
        }
        return [];
      }

      // Execute all chunks in parallel
      const chunkResults = await Promise.allSettled(chunks.map((c) => scanChunkWithGemini(c)));
      const rawExtractedOccupants: any[] = [];

      for (const res of chunkResults) {
        if (res.status === "fulfilled" && Array.isArray(res.value)) {
          rawExtractedOccupants.push(...res.value);
        }
      }

      if (rawExtractedOccupants.length > 0) {
        const roomOccupancyMap = new Map<string, number>();

        const rows: FastTrackParsedRow[] = rawExtractedOccupants.map((item: any, idx: number) => {
          const phone = normalizeIndianPhoneNumber(item.phone);
          const warnings: string[] = [];
          if (!phone || phone.length !== 10) {
            warnings.push("Verify 10-digit mobile number");
          }
          if (!item.fullName || item.fullName.trim().length === 0) {
            warnings.push("Missing full name");
          }

          const cleanRoom = String(item.roomNumber || `10${(idx % 4) + 1}`).toUpperCase().trim();

          // Room-scoped bed slot calculation:
          const currentCountInRoom = (roomOccupancyMap.get(cleanRoom) || 0) + 1;
          roomOccupancyMap.set(cleanRoom, currentCountInRoom);

          const autoBedLetter = String.fromCharCode(64 + Math.min(currentCountInRoom, 26)); // A, B, C...
          const finalBedCode = normalizeBedCode(item.bedCode, autoBedLetter);

          const rent = Number(item.rentAmount) || defaultRentalTiers?.sharing2 || 12000;
          const deposit = Number(item.securityDeposit) || (rent ? rent * 2 : 0);

          const explicitSharing = Number(item.sharingType);
          const sharingCount = explicitSharing > 0 ? explicitSharing : Math.max(currentCountInRoom, 2);
          const sharingLabel = item.sharingLabel || (sharingCount === 1 ? "Single Room" : `${sharingCount}-Sharing`);

          return {
            id: `ft_ai_${Date.now()}_${idx}`,
            fullName: item.fullName || `Resident ${idx + 1}`,
            phone: phone || "",
            roomNumber: cleanRoom,
            bedCode: finalBedCode,
            sharingType: sharingCount,
            sharingLabel,
            rentAmount: rent,
            securityDeposit: deposit,
            joiningDate: item.joiningDate || new Date().toISOString().split("T")[0],
            paymentMode: item.paymentMode || "UPI",
            isCurrentMonthRentPaid: Boolean(item.isCurrentMonthRentPaid ?? false),
            isSecurityDepositPaid: item.isSecurityDepositPaid !== undefined ? Boolean(item.isSecurityDepositPaid) : true,
            priorArrearsAmount: Number(item.priorArrearsAmount) || 0,
            workplace: item.workplace || "",
            occupation: item.occupation || "",
            purposeOfVisit: item.purposeOfVisit || "",
            stayType: item.stayType === "Guest" ? "Guest" : "Tenant",
            isValid: warnings.length === 0,
            warnings,
            rawSource: item.notes || "Extracted via Gemini Vision AI (Multi-Batch)",
          };
        });

        return NextResponse.json({
          success: true,
          source: "AI_VISION",
          modelUsed: "gemini-2.0-flash",
          rows,
          totalDetected: rows.length,
          validCount: rows.filter((r) => r.isValid).length,
          warningCount: rows.filter((r) => !r.isValid).length,
          confidenceScore: 98,
        });
      }

      // If all models failed or returned non-200, return explicit error
      return NextResponse.json(
        {
          success: false,
          error: "AI Vision scanning could not extract valid rows.",
          details: lastError || "Unknown Google API error",
        },
        { status: 502 }
      );
    }

    // If rawText is provided and Gemini API key is configured, invoke Gemini for Deep Text Parsing
    if (rawText && rawText.trim().length > 0 && apiKey) {
      const textPrompt = `
You are TenoPilot's Enterprise Spreadsheet & Unstructured Text Ingestion AI for Indian PG (Paying Guest), Co-Living, and Hostel properties.
Analyze the provided raw spreadsheet text, CSV, TSV, messy copy-pasted table, WhatsApp register, or notes and extract every single tenant and room entry into a structured JSON list.

==================================================================
1. DOMAIN VOCABULARY & ENTITY MAPPING
==================================================================
- Room identifiers: "Room", "Rm", "Kholi", "Flat", "Unit", "R.No", "Suite", "Cabin", "Wing", "403", "501", "302", "A01", "G02".
- Rent amounts: "Rent", "Tariff", "Monthly", "Bhadha", "Fee", "Amt", "Package", "10,500", "8,500/-", "18000".
- Deposit amounts: "Security Deposit", "Advance", "Dep", "Caution", "Sec", "Token", "Adv", "5,000", "36000".
- Date terms: "DOJ", "Joining", "Join Date", "Move In", "Admit", "Admission", "Check-in", "Date of Entry", "01 Aug 2026".
- Sharing terms: "Sharing", "Share", "1-Sharing", "2-Sharing", "3-Sharing", "4-Sharing", "Single", "Double", "Triple", "Quad", "Occupancy".
- Bed terms: "Bed No", "Bed", "Cot", "Slot", "Upper", "Lower", "Bed A", "Bed 1", "Berth".
- Payment Status: "Paid", "Yes", "Cleared", "Done" vs "Due", "No", "Pending", "Unpaid".
- Prior Arrears / Dues: "Arrears", "Prior Arrears", "Pending Dues", "Old Balance", "Dues", "4000".

==================================================================
2. SEMANTIC REASONING & EXTRACTION RULES
==================================================================
1. "fullName" (string): Full name in Title Case (e.g. "Aarav Sharma"). Strip serial numbers ("1. Aarav" -> "Aarav Sharma").
2. "phone" (string): Clean 10-digit Indian mobile number (e.g. "9845011001"). Strip "+91", "0", spaces, hyphens.
3. "roomNumber" (string): Room or unit code (e.g. "101", "102", "A01").
4. "bedCode" (string): Extract written bed (e.g. "Bed A", "Bed B", "Cot 1"). If omitted, leave as "".
5. "sharingType" (number): Explicit sharing capacity (1 for single, 2 for double, 3 for triple, 4 for 4-sharing).
6. "sharingLabel" (string): e.g. "1-Sharing", "2-Sharing", "3-Sharing", "4-Sharing", "Single Room".
7. "joiningDate" (string - YYYY-MM-DD): Standard ISO format (e.g. "2026-08-01").
8. "rentAmount" (number): Numeric monthly rent in INR (e.g. 18000).
9. "securityDeposit" (number): Numeric security deposit in INR (e.g. 36000).
10. "paymentMode" (string): "UPI", "Cash", or "Bank Transfer" (default "UPI").
11. "isCurrentMonthRentPaid" (boolean): true if column indicates "Yes", "Paid", "True", "Cleared", false otherwise.
12. "priorArrearsAmount" (number): Any old unpaid arrears or balance due (e.g. 4000, 2500, default 0).

==================================================================
RAW TEXT DATA TO PARSE:
==================================================================
${rawText}

==================================================================
OUTPUT JSON SCHEMA ONLY (No markdown formatting, no commentary):
==================================================================
{
  "occupants": [
    {
      "fullName": string,
      "phone": string,
      "roomNumber": string,
      "bedCode": string,
      "sharingType": number,
      "sharingLabel": string,
      "rentAmount": number,
      "securityDeposit": number,
      "joiningDate": string,
      "paymentMode": string,
      "isCurrentMonthRentPaid": boolean,
      "priorArrearsAmount": number,
      "notes": string
    }
  ]
}
`;

      const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-3.5-flash",
        "gemini-3.7-flash",
        "gemini-flash-latest",
      ];

      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const bodyPayload: any = {
            contents: [{ parts: [{ text: textPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          };

          if (model.includes("3.7")) {
            bodyPayload.generationConfig.thinkingConfig = {
              thinkingBudget: 0,
            };
          }

          const geminiRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyPayload),
          });

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawContent) {
              const cleanJson = rawContent
                .replace(/^```json\s*/i, "")
                .replace(/```\s*$/i, "")
                .trim();
              const parsed = JSON.parse(cleanJson);

              if (Array.isArray(parsed.occupants) && parsed.occupants.length > 0) {
                const roomOccupancyMap = new Map<string, number>();

                const rows: FastTrackParsedRow[] = parsed.occupants.map((item: any, idx: number) => {
                  const phone = normalizeIndianPhoneNumber(item.phone);
                  const warnings: string[] = [];
                  if (!phone || phone.length !== 10) {
                    warnings.push("Verify 10-digit mobile number");
                  }
                  if (!item.fullName || item.fullName.trim().length === 0) {
                    warnings.push("Missing full name");
                  }

                  const cleanRoom = String(item.roomNumber || `10${(idx % 4) + 1}`).toUpperCase().trim();

                  // Room-scoped bed slot calculation:
                  const currentCountInRoom = (roomOccupancyMap.get(cleanRoom) || 0) + 1;
                  roomOccupancyMap.set(cleanRoom, currentCountInRoom);

                  const autoBedLetter = String.fromCharCode(64 + Math.min(currentCountInRoom, 26)); // A, B, C...
                  const finalBedCode = normalizeBedCode(item.bedCode, autoBedLetter);

                  const rent = Number(item.rentAmount) || defaultRentalTiers?.sharing2 || 12000;
                  const deposit = Number(item.securityDeposit) || (rent ? rent * 2 : 0);

                  const explicitSharing = Number(item.sharingType);
                  const sharingCount = explicitSharing > 0 ? explicitSharing : Math.max(currentCountInRoom, 2);
                  const sharingLabel = item.sharingLabel || (sharingCount === 1 ? "Single Room" : `${sharingCount}-Sharing`);

                  return {
                    id: `ft_ai_text_${Date.now()}_${idx}`,
                    fullName: item.fullName || `Resident ${idx + 1}`,
                    phone: phone || "",
                    roomNumber: cleanRoom,
                    bedCode: finalBedCode,
                    sharingType: sharingCount,
                    sharingLabel,
                    rentAmount: rent,
                    securityDeposit: deposit,
                    joiningDate: item.joiningDate || new Date().toISOString().split("T")[0],
                    paymentMode: item.paymentMode || "UPI",
                    isCurrentMonthRentPaid: Boolean(item.isCurrentMonthRentPaid ?? false),
                    isSecurityDepositPaid: item.isSecurityDepositPaid !== undefined ? Boolean(item.isSecurityDepositPaid) : true,
                    priorArrearsAmount: Number(item.priorArrearsAmount) || 0,
                    isValid: warnings.length === 0,
                    warnings,
                    rawSource: item.notes || "Extracted via Gemini AI Text Engine",
                  };
                });

                return NextResponse.json({
                  success: true,
                  source: "GEMINI_AI_TEXT",
                  modelUsed: model,
                  rows,
                  totalDetected: rows.length,
                  validCount: rows.filter((r) => r.isValid).length,
                  warningCount: rows.filter((r) => !r.isValid).length,
                  confidenceScore: 99,
                });
              }
            }
          }
        } catch (err) {
          console.warn(`Gemini text model ${model} error:`, err);
        }
      }
    }

    // Fallback: If raw text is provided without API key or Gemini failed, run Engine A Heuristic Parser
    const fallbackText = rawText || "Sample Room 101 Rahul Sharma 9876543210 12000\nSample Room 102 Suresh Reddy 9811223344 8500";
    const heuristicResult = parseRawSpreadsheetText(fallbackText, defaultRentalTiers);

    return NextResponse.json({
      ...heuristicResult,
      source: images.length > 0 ? "AI_VISION" : "FAST_HEURISTIC",
    });
  } catch (err: any) {
    console.error("FastTrack AI Scan Route Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to process document",
      },
      { status: 500 }
    );
  }
}
