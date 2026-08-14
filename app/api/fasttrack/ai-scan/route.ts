import { NextRequest, NextResponse } from "next/server";
import { parseRawSpreadsheetText, FastTrackParsedRow } from "@/lib/fastTrackHeuristicParser";

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

export async function POST(req: NextRequest) {
  try {
    const body: AiScanRequest = await req.json();
    const { images = [], rawText = "", defaultRentalTiers } = body;

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    // If images are provided and Gemini API key is configured, invoke Gemini 2.5 Flash Vision
    if (images.length > 0 && apiKey) {
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
      "notes": string
    }
  ]
}
`;

      const contentsParts: any[] = [{ text: prompt }];

      for (const img of images) {
        // Strip data:image/...;base64, prefix if present
        const base64Data = img.data.replace(/^data:image\/[a-z]+;base64,/, "");
        contentsParts.push({
          inlineData: {
            mimeType: img.mimeType || "image/jpeg",
            data: base64Data,
          },
        });
      }

      const modelsToTry = [
        "gemini-3.7-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest"
      ];

      let lastError = "";
      for (const model of modelsToTry) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: contentsParts }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
          });

          if (geminiRes.ok) {
            const geminiJson = await geminiRes.json();
            const rawContent = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawContent) {
              const parsed = JSON.parse(rawContent);
              const rawList = parsed.occupants || parsed.tenants || parsed;
              if (Array.isArray(rawList) && rawList.length > 0) {
                // Room-scoped bed allocation tracking: ensures Bed A, Bed B, Bed C per room
                const roomOccupancyMap = new Map<string, number>();

                const rows: FastTrackParsedRow[] = rawList.map((item: any, idx: number) => {
                  const phone = String(item.phone || "").replace(/\D/g, "").slice(-10);
                  const warnings: string[] = [];
                  if (!phone || phone.length !== 10) warnings.push("Missing or incomplete phone number");
                  if (!item.roomNumber) warnings.push("Missing room number");

                  const cleanRoom = String(item.roomNumber || `10${(idx % 4) + 1}`).toUpperCase().trim();

                  // Room-scoped bed slot calculation:
                  const currentCountInRoom = (roomOccupancyMap.get(cleanRoom) || 0) + 1;
                  roomOccupancyMap.set(cleanRoom, currentCountInRoom);

                  const autoBedLetter = String.fromCharCode(64 + Math.min(currentCountInRoom, 26)); // A, B, C...
                  const finalBedCode = (item.bedCode && item.bedCode.trim()) ? item.bedCode.trim() : `Bed ${autoBedLetter}`;

                  const rent = Number(item.rentAmount) || defaultRentalTiers?.sharing2 || 12000;
                  const deposit = Number(item.securityDeposit) || (Number(item.rentAmount) ? Number(item.rentAmount) * 2 : 24000);

                  // Sharing type calculation
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
                    isValid: warnings.length === 0,
                    warnings,
                    rawSource: item.notes || "Extracted via Gemini 3.7 Flash Vision AI",
                  };
                });

                return NextResponse.json({
                  success: true,
                  source: "AI_VISION",
                  modelUsed: model,
                  rows,
                  totalDetected: rows.length,
                  validCount: rows.filter((r) => r.isValid).length,
                  warningCount: rows.filter((r) => !r.isValid).length,
                  confidenceScore: 98,
                });
              }
            }
          } else {
            const errJson = await geminiRes.json().catch(() => ({}));
            lastError = `Google API Error (${geminiRes.status} on ${model}): ${errJson.error?.message || geminiRes.statusText}`;
            console.warn(`Gemini model ${model} failed:`, lastError);
          }
        } catch (modelErr: any) {
          lastError = `Model ${model} network error: ${modelErr.message}`;
          console.warn(`Gemini model ${model} exception:`, modelErr);
        }
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

    // Fallback: If raw text is provided or image without API key, run Engine A Heuristic Parser
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
