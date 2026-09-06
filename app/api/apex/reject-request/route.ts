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

    // 1. Mark request as REJECTED
    await setDoc(
      doc(db, "subscription_requests", requestId),
      {
        status: "REJECTED",
        rejectionReason: reason,
        reviewedAt: nowIso,
        reviewedBy: rejectedBy,
      },
      { merge: true }
    );

    // 2. Clear pending status on user doc
    if (userId) {
      await setDoc(
        doc(db, "users", userId),
        {
          pendingPaymentRequest: false,
          lastPaymentRejectionReason: reason,
        },
        { merge: true }
      );
    }

    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const q = query(collection(db, "users"), where("email", "==", cleanEmail));
      const snap = await getDocs(q);
      for (const uDoc of snap.docs) {
        await setDoc(
          doc(db, "users", uDoc.id),
          {
            pendingPaymentRequest: false,
            lastPaymentRejectionReason: reason,
          },
          { merge: true }
        );
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
