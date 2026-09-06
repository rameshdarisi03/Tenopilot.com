import { NextRequest, NextResponse } from "next/server";
import { setDoc, doc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      customerEmail,
      customerName = "PG Owner",
      customerPhone = "",
      propertyId = "",
      propertyName = "TenoPilot PG",
      plan = "PRO_MONTHLY",
      amount = 999,
      paymentMode = "UPI",
      screenshotData = "",
      notes = "",
    } = body;

    if (!customerEmail && !userId) {
      return NextResponse.json(
        { success: false, message: "Customer email or userId is required." },
        { status: 400 }
      );
    }

    if (!screenshotData) {
      return NextResponse.json(
        { success: false, message: "Payment screenshot is required for offline verification." },
        { status: 400 }
      );
    }

    const cleanEmail = (customerEmail || "").toLowerCase().trim();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    const requestRecord = {
      id: requestId,
      userId: userId || null,
      customerEmail: cleanEmail,
      customerName,
      customerPhone,
      propertyId,
      propertyName,
      plan,
      amount: Number(amount),
      paymentMode,
      screenshotUrl: screenshotData,
      notes: notes || null,
      status: "PENDING", // PENDING | APPROVED | REJECTED | CANCELLED
      submittedAt: nowIso,
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    };

    // 1. Store request in subscription_requests collection
    await setDoc(doc(db, "subscription_requests", requestId), requestRecord);

    // 2. Mark pending flag on user document for fast client-side reactivity
    if (userId) {
      try {
        await setDoc(
          doc(db, "users", userId),
          {
            pendingPaymentRequest: true,
            lastPaymentRequestId: requestId,
            pendingPaymentPlan: plan,
            pendingPaymentAmount: Number(amount),
            pendingPaymentSubmittedAt: nowIso,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn(`Failed to update user doc for ${userId}:`, err);
      }
    }

    if (cleanEmail) {
      try {
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        for (const uDoc of snap.docs) {
          await setDoc(
            doc(db, "users", uDoc.id),
            {
              pendingPaymentRequest: true,
              lastPaymentRequestId: requestId,
              pendingPaymentPlan: plan,
              pendingPaymentAmount: Number(amount),
              pendingPaymentSubmittedAt: nowIso,
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.warn(`Failed to update user doc by email for ${cleanEmail}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment proof submitted successfully! Under review by founder.",
      requestId,
      request: requestRecord,
    });
  } catch (err: any) {
    console.error("POST /api/subscription/request error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to submit payment request" },
      { status: 500 }
    );
  }
}

// DELETE to cancel a pending request
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");

    if (!requestId) {
      return NextResponse.json({ success: false, message: "Request ID is required" }, { status: 400 });
    }

    await setDoc(
      doc(db, "subscription_requests", requestId),
      { status: "CANCELLED", cancelledAt: new Date().toISOString() },
      { merge: true }
    );

    // Clear pending flag on user
    if (userId) {
      await setDoc(doc(db, "users", userId), { pendingPaymentRequest: false }, { merge: true });
    }
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const q = query(collection(db, "users"), where("email", "==", cleanEmail));
      const snap = await getDocs(q);
      for (const uDoc of snap.docs) {
        await setDoc(doc(db, "users", uDoc.id), { pendingPaymentRequest: false }, { merge: true });
      }
    }

    return NextResponse.json({ success: true, message: "Request cancelled successfully" });
  } catch (err: any) {
    console.error("DELETE /api/subscription/request error:", err);
    return NextResponse.json({ success: false, message: err.message || "Failed to cancel request" }, { status: 500 });
  }
}
