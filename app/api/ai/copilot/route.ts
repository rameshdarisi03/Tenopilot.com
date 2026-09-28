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
import { isMockOccupantId } from "@/lib/firestoreService";

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

    // 1. Resolve or Assemble 100% Real Property Snapshot
    let snapshot: CopilotPropertySnapshot;

    if (liveSnapshot && typeof liveSnapshot === "object" && Array.isArray(liveSnapshot.occupants)) {
      snapshot = {
        ...liveSnapshot,
        currentDateAnchor: liveSnapshot.currentDateAnchor || new Date().toISOString().split("T")[0],
      };
    } else {
      // Server-side fallback: fetch live docs directly from Cloud Firestore SSOT
      const occupantsSnap = await getDocs(collection(db, "properties", propertyId, "occupants"));
      const rawOccupants: any[] = occupantsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // If property has genuine onboarded occupants, exclude legacy demo/mock IDs
      const genuineOccupants = rawOccupants.filter((o) => !isMockOccupantId(o.id));
      const occupants = genuineOccupants.length > 0 ? genuineOccupants : rawOccupants;

      const complaintsSnap = await getDocs(collection(db, "properties", propertyId, "complaints"));
      const complaints: any[] = complaintsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      let expenses: any[] = [];
      try {
        const expensesSnap = await getDocs(collection(db, "properties", propertyId, "expenses"));
        expenses = expensesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn("Failed to fetch expenses for property:", e);
      }

      let propName = "My PG Property";
      let propAddress = "";
      try {
        const propDoc = await getDoc(doc(db, "properties", propertyId));
        if (propDoc.exists()) {
          const data = propDoc.data();
          propName = data?.name || data?.propertyName || propName;
          propAddress = data?.address || data?.city || "";
        }
      } catch {}

      // Fetch Real Physical Bed Structure from properties/{propertyId}/layout/structure
      let totalBeds = 0;
      let occupiedBeds = 0;
      let totalBedsConfigured = false;
      const vacantRooms: Array<{
        roomNumber: string;
        floorName?: string;
        sharingType: number;
        vacantBedsCount: number;
        vacantBedCodes?: string[];
      }> = [];

      try {
        const structureDoc = await getDoc(doc(db, "properties", propertyId, "layout", "structure"));
        if (structureDoc.exists()) {
          const floors = (structureDoc.data()?.floors || []) as any[];
          if (Array.isArray(floors) && floors.length > 0) {
            totalBedsConfigured = true;
            floors.forEach((floor) => {
              (floor.rooms || []).forEach((room: any) => {
                const beds = room.beds || [];
                totalBeds += beds.length;
                const occBeds = beds.filter((b: any) => b.status === "Occupied").length;
                occupiedBeds += occBeds;
                const vacBeds = beds.filter((b: any) => b.status === "Available" || !b.status);
                if (vacBeds.length > 0) {
                  vacantRooms.push({
                    roomNumber: room.roomNumber,
                    floorName: floor.floorName,
                    sharingType: room.sharingType || beds.length,
                    vacantBedsCount: vacBeds.length,
                    vacantBedCodes: vacBeds.map((b: any) => b.bedCode || b.id).filter(Boolean),
                  });
                }
              });
            });
          }
        }
      } catch (err) {
        console.warn("Failed to read property layout for AI copilot:", err);
      }

      const activeOccupants = occupants.filter(
        (o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice"
      );

      if (!totalBedsConfigured) {
        totalBeds = activeOccupants.length;
        occupiedBeds = activeOccupants.length;
      }

      const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      snapshot = {
        propertyId,
        propertyName: propName,
        city: propAddress,
        currentDateAnchor: new Date().toISOString().split("T")[0],
        totalBeds,
        totalBedsConfigured,
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
          depositAmount: Number(o.depositAmount) || 0,
          arrearsBalance: Number(o.arrearsBalance) || 0,
          emergencyContact:
            typeof o.emergencyContact === "object" && o.emergencyContact
              ? `${(o.emergencyContact as any).name || ""} (${(o.emergencyContact as any).relation || ""}: ${(o.emergencyContact as any).phone || ""})`
              : typeof o.emergencyContact === "string"
              ? o.emergencyContact
              : o.guardianPhone || "",
        })),
        complaints: complaints.map((c) => ({
          id: c.id,
          complaintNumber: c.complaintNumber || c.id,
          tenantName: c.tenantName || "Tenant",
          tenantPhone: c.tenantPhone || "",
          roomNumber: c.roomNumber || "",
          category: c.category || "General",
          title: c.title || "",
          status: c.status || "OPEN",
          createdAt: c.createdAt || new Date().toISOString(),
          description: c.description || "",
        })),
        expenses: expenses.map((e) => ({
          id: e.id,
          category: e.category || "General",
          amount: Number(e.amount) || 0,
          date: e.date || e.createdAt || "",
          paidFrom: e.paidFrom || "Business Account",
          notes: e.notes || "",
        })),
        vacantRooms,
      };
    }

    // 2. Serialize ledger into token-dense, zero-hallucination grounded digest
    const snapshotText = serializePropertySnapshotForAI(snapshot);
    const systemPrompt = buildCopilotSystemPrompt(snapshotText, language);

    // 3. Query Gemini with dynamic waterfall ranking & deterministic temperature
    const modelsToTry = await getActiveGeminiModels(apiKey);
    let rawResponseText = "";
    let lastError: any = null;

    for (const model of modelsToTry) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // Strict 4s cap prevents 25s stalls

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
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
              temperature: 0.1, // Strict factual determinism
              maxOutputTokens: 512,
              thinkingConfig: {
                thinkingBudget: 0, // Disable thinking latency (eliminates 2-5s reasoning stall)
              },
            },
          }),
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errDetail = await res.text();
          throw new Error(`Model ${model} returned ${res.status}: ${errDetail}`);
        }

        const resJson = await res.json();
        const candidate = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          rawResponseText = candidate;
          break; // Successfully received response
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        console.warn(`Gemini model ${model} attempt failed:`, err?.name === "AbortError" ? "Timeout after 4000ms" : err?.message || err);
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
