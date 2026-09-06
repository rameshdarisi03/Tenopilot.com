import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = query(
      collection(db, "subscription_requests"),
      where("status", "==", "PENDING")
    );
    const snap = await getDocs(q);

    const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort newest first
    requests.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (err: any) {
    console.error("GET /api/apex/pending-requests error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to load pending requests", requests: [] },
      { status: 500 }
    );
  }
}
