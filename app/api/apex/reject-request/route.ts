import { NextRequest, NextResponse } from "next/server";
import { setDoc, doc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      requestId,
      userId,
      email,
      reason = "Payment proof could not be verified in bank records.",
      rejectedBy = "Founder Console",
    } = body;

    if (!requestId) {
      return NextResponse.json({ success: false, message: "Request ID is required" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    const rejectionData = {
      status: "REJECTED",
      rejectionReason: reason,
      reviewedAt: nowIso,
      reviewedBy: rejectedBy,
    };

    // 1. Mark request as REJECTED in platform_admin and subscription_requests
    try {
      await setDoc(
        doc(db, "platform_admin", "requests", "submissions", requestId),
        rejectionData,
        { merge: true }
      );
    } catch (adminErr) {
      console.warn("platform_admin rejection notice:", adminErr);
    }

    try {
      await setDoc(
        doc(db, "subscription_requests", requestId),
        rejectionData,
        { merge: true }
      );
    } catch (subErr) {
      console.warn("subscription_requests rejection notice:", subErr);
    }

    // 2. Clear pending status on user doc
    const userRejectPayload = {
      pendingPaymentRequest: false,
      pendingRequestData: null,
      lastPaymentRejectionReason: reason,
    };

    if (userId) {
      try {
        await setDoc(doc(db, "users", userId), userRejectPayload, { merge: true });
      } catch (err) {
        console.warn(`User doc reject update notice for ${userId}:`, err);
      }
    }

    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      try {
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        for (const uDoc of snap.docs) {
          await setDoc(doc(db, "users", uDoc.id), userRejectPayload, { merge: true });
        }
      } catch (err) {
        console.warn(`User email doc reject update notice for ${cleanEmail}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Request rejected successfully",
    });
  } catch (err: any) {
    console.error("POST /api/apex/reject-request error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to reject request" },
      { status: 500 }
    );
  }
}
