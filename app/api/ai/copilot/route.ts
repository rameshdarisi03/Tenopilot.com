import { NextRequest, NextResponse } from "next/server";
import { getActiveGeminiModels } from "@/lib/geminiModelDiscovery";
import {
  serializePropertySnapshotForAI,
  buildCopilotSystemPrompt,
  CopilotPropertySnapshot,
  CopilotApiResponse,
} from "@/lib/aiCopilotPrompt";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId, question, language, liveSnapshot } = body;

    if (!propertyId || !question) {
      return NextResponse.json(
        { success: false, message: "propertyId and question are required." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    // 1. Resolve or Assemble Property Snapshot
    let snapshot: CopilotPropertySnapshot;

    if (liveSnapshot && typeof liveSnapshot === "object" && liveSnapshot.occupants) {
      snapshot = liveSnapshot;
    } else {
      // Server-side fallback: fetch live docs from Cloud Firestore
      const occupantsSnap = await getDocs(collection(db, "properties", propertyId, "occupants"));
      const occupants: any[] = occupantsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const complaintsSnap = await getDocs(collection(db, "properties", propertyId, "complaints"));
      const complaints: any[] = complaintsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      let propName = "My PG Property";
      try {
        const propDoc = await getDoc(doc(db, "properties", propertyId));
        if (propDoc.exists()) {
          propName = propDoc.data()?.name || propDoc.data()?.propertyName || propName;
        }
      } catch {}

      const totalBeds = occupants.length + 10;
      const occupiedBeds = occupants.filter((o) => o.lifecycleStatus === "Active").length;
      const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      snapshot = {
        propertyId,
        propertyName: propName,
        totalBeds,
        occupiedBeds,
        vacantBeds,
        occupancyRatePercentage: occupancyRate,
        occupants: occupants.map((o) => ({
          id: o.id,
          name: o.name || "Guest",
          phone: o.phone || "",
          roomNumber: o.roomNumber || "",
          bedCode: o.bedCode || "",
          rentAmount: Number(o.rentAmount) || 0,
          paymentStatus: o.paymentStatus || "Due",
          lifecycleStatus: o.lifecycleStatus || "Active",
          joiningDate: o.joiningDate || "",
          vacatingDate: o.vacatingDate || "",
          daysRemainingText: o.daysRemainingText || "",
        })),
        complaints: complaints.map((c) => ({
          id: c.id,
          complaintNumber: c.complaintNumber || c.id,
          tenantName: c.tenantName || "Tenant",
          roomNumber: c.roomNumber || "",
          category: c.category || "General",
          title: c.title || "",
          status: c.status || "OPEN",
          createdAt: c.createdAt || new Date().toISOString(),
        })),
      };
    }

    // 2. Serialize ledger into token-dense grounded snapshot
    const snapshotText = serializePropertySnapshotForAI(snapshot);
    const systemPrompt = buildCopilotSystemPrompt(snapshotText, language);

    // 3. Query Gemini with dynamic waterfall ranking
    const modelsToTry = await getActiveGeminiModels(apiKey);
    let rawResponseText = "";
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: systemPrompt },
                  { text: `USER QUESTION: "${question}"` },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
              maxOutputTokens: 1024,
            },
          }),
        });

        if (!res.ok) {
          const errDetail = await res.text();
          throw new Error(`Model ${model} returned ${res.status}: ${errDetail}`);
        }

        const resJson = await res.json();
        const candidate = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          rawResponseText = candidate;
          break; // Successfully obtained response!
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini model ${model} attempt failed:`, err?.message || err);
      }
    }

    if (!rawResponseText) {
      throw lastError || new Error("Failed to receive output from Gemini models.");
    }

    // 4. Parse Structured Output
    let parsed: CopilotApiResponse;
    try {
      const cleanJson = rawResponseText.replace(/^```json/i, "").replace(/```$/i, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        answer: rawResponseText,
        actionType: "GENERAL",
        suggestedChips: ["Who owes rent?", "Joined this week?", "Any open complaints?"],
      };
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error("POST /api/ai/copilot error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to process AI Copilot query.",
      },
      { status: 500 }
    );
  }
}
