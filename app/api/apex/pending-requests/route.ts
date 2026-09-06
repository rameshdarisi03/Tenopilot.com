import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const itemsMap = new Map<string, any>();

    // 1. Fetch from platform_admin/requests/submissions (100% permitted by live rules)
    try {
      const col = collection(db, "platform_admin", "requests", "submissions");
      const q = query(col, where("status", "==", "PENDING"));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        itemsMap.set(d.id, { id: d.id, ...d.data() });
      });
    } catch (adminErr) {
      console.warn("platform_admin requests scan notice:", adminErr);
    }

    // 2. Fetch from subscription_requests (if rules allow)
    try {
      const q = query(collection(db, "subscription_requests"), where("status", "==", "PENDING"));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        if (!itemsMap.has(d.id)) {
          itemsMap.set(d.id, { id: d.id, ...d.data() });
        }
      });
    } catch (subErr) {
      console.warn("subscription_requests scan notice:", subErr);
    }

    // 3. Fallback: Check users flagged with pendingPaymentRequest
    try {
      const userQ = query(collection(db, "users"), where("pendingPaymentRequest", "==", true));
      const userSnap = await getDocs(userQ);
      userSnap.docs.forEach((uDoc) => {
        const uData = uDoc.data();
        if (uData.pendingRequestData && uData.pendingRequestData.id) {
          if (!itemsMap.has(uData.pendingRequestData.id)) {
            itemsMap.set(uData.pendingRequestData.id, uData.pendingRequestData);
          }
        }
      });
    } catch (userErr) {
      console.warn("users pending scan notice:", userErr);
    }

    const requests = Array.from(itemsMap.values());
    // Sort newest first
    requests.sort((a: any, b: any) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (err: any) {
    console.error("GET /api/apex/pending-requests error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to load pending requests", requests: [] },
      { status: 500 }
    );
  }
}
