import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");

    if (!userId && !email) {
      return NextResponse.json({ hasPending: false, request: null });
    }

    const cleanEmail = (email || "").toLowerCase().trim();

    // Query subscription_requests for PENDING status
    let pendingRequest: any = null;

    if (userId) {
      const qUser = query(
        collection(db, "subscription_requests"),
        where("userId", "==", userId),
        where("status", "==", "PENDING")
      );
      const snapUser = await getDocs(qUser);
      if (!snapUser.empty) {
        pendingRequest = { id: snapUser.docs[0].id, ...snapUser.docs[0].data() };
      }
    }

    if (!pendingRequest && cleanEmail) {
      const qEmail = query(
        collection(db, "subscription_requests"),
        where("customerEmail", "==", cleanEmail),
        where("status", "==", "PENDING")
      );
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        pendingRequest = { id: snapEmail.docs[0].id, ...snapEmail.docs[0].data() };
      }
    }

    return NextResponse.json({
      hasPending: !!pendingRequest,
      request: pendingRequest,
    });
  } catch (err: any) {
    console.error("GET /api/subscription/pending error:", err);
    return NextResponse.json({ hasPending: false, request: null }, { status: 500 });
  }
}
