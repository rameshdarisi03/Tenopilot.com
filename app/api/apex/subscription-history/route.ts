import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.toLowerCase().trim();
    const userId = searchParams.get("userId")?.trim();

    if (!email && !userId) {
      return NextResponse.json({ success: false, message: "Email or userId is required" }, { status: 400 });
    }

    const historyItems: any[] = [];
    const seenIds = new Set<string>();

    // 1. Fetch from subscription_transactions (Direct immutable audit log)
    try {
      const snap = await getDocs(collection(db, "subscription_transactions"));
      snap.docs.forEach((d) => {
        const data = d.data();
        const dEmail = (data.customerEmail || data.email || "").toLowerCase().trim();
        const dUid = data.userId || "";
        if ((email && dEmail === email) || (userId && dUid === userId)) {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            historyItems.push({
              id: d.id,
              date: data.createdAt || data.date || new Date().toISOString(),
              plan: data.plan || "PRO_MONTHLY",
              durationDays: Number(data.durationDays) || 30,
              amount: Number(data.amountPaid ?? data.amount) || 0,
              paymentMode: data.paymentMode || "OFFLINE_UPI",
              receiptNumber: data.receiptNumber || `REC-${d.id.slice(-6)}`,
              receiptUrl: data.receiptUrl || null,
              notes: data.notes || null,
              activatedBy: data.activatedBy || "Founder Apex Command",
              planExpiresAt: data.planExpiresAt || null,
              status: data.status || "COMPLETED",
            });
          }
        }
      });
    } catch (e) {
      console.warn("subscription_transactions query notice:", e);
    }

    // 2. Fetch from platform_admin/billing/transactions
    try {
      const snap = await getDocs(collection(db, "platform_admin", "billing", "transactions"));
      snap.docs.forEach((d) => {
        const data = d.data();
        const dEmail = (data.customerEmail || data.email || "").toLowerCase().trim();
        const dUid = data.userId || "";
        if ((email && dEmail === email) || (userId && dUid === userId)) {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            historyItems.push({
              id: d.id,
              date: data.createdAt || data.date || new Date().toISOString(),
              plan: data.plan || "PRO_MONTHLY",
              durationDays: Number(data.durationDays) || 30,
              amount: Number(data.amountPaid ?? data.amount) || 0,
              paymentMode: data.paymentMode || "OFFLINE_UPI",
              receiptNumber: data.receiptNumber || `REC-${d.id.slice(-6)}`,
              receiptUrl: data.receiptUrl || null,
              notes: data.notes || null,
              activatedBy: data.activatedBy || "Founder Apex Command",
              planExpiresAt: data.planExpiresAt || null,
              status: data.status || "COMPLETED",
            });
          }
        }
      });
    } catch (e) {
      console.warn("platform_admin billing query notice:", e);
    }

    // 3. Fetch from subscription_requests (approved or submitted payment requests)
    try {
      const snap = await getDocs(collection(db, "subscription_requests"));
      snap.docs.forEach((d) => {
        const data = d.data();
        const dEmail = (data.customerEmail || data.email || "").toLowerCase().trim();
        const dUid = data.userId || "";
        if ((email && dEmail === email) || (userId && dUid === userId)) {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            historyItems.push({
              id: d.id,
              date: data.createdAt || data.submittedAt || new Date().toISOString(),
              plan: data.plan || "PRO_MONTHLY",
              durationDays: Number(data.durationDays) || 30,
              amount: Number(data.amountPaid ?? data.amount) || 999,
              paymentMode: data.paymentMode || (data.utrNumber ? "OFFLINE_UPI" : "RAZORPAY_MOCK"),
              receiptNumber: data.receiptNumber || (data.utrNumber ? `UTR: ${data.utrNumber}` : `REQ-${d.id.slice(-6)}`),
              receiptUrl: data.proofImageUrl || data.receiptUrl || null,
              notes: data.notes || (data.utrNumber ? `UTR: ${data.utrNumber}` : "Subscription Request"),
              activatedBy: data.approvedBy || data.reviewedBy || "Founder Portal",
              planExpiresAt: data.planExpiresAt || null,
              status: data.status === "APPROVED" ? "COMPLETED" : (data.status === "REJECTED" ? "REJECTED" : data.status || "COMPLETED"),
              rejectionReason: data.rejectionReason || data.rejectReason || null,
            });
          }
        }
      });
    } catch (e) {
      console.warn("subscription_requests query notice:", e);
    }

    // 4. Fetch baseline user doc for initial registration / current plan if list is empty
    if (historyItems.length === 0) {
      let uData: any = null;
      if (userId) {
        try {
          const uSnap = await getDoc(doc(db, "users", userId));
          if (uSnap.exists()) uData = uSnap.data();
        } catch {}
      }
      if (!uData && email) {
        try {
          const uQ = query(collection(db, "users"), where("email", "==", email));
          const uSnap = await getDocs(uQ);
          if (!uSnap.empty) uData = uSnap.docs[0].data();
        } catch {}
      }

      if (uData) {
        const isPro = uData.plan === "PRO_MONTHLY" || uData.plan === "VIP_PASS" || uData.subscriptionPlan === "pro";
        historyItems.push({
          id: `hist_init_${uData.uid || "acc"}`,
          date: uData.createdAt || "2026-08-20T00:00:00.000Z",
          plan: isPro ? (uData.plan || "PRO_MONTHLY") : "10_DAY_TRIAL",
          durationDays: isPro ? 30 : 10,
          amount: isPro ? 999 : 0,
          paymentMode: uData.plan === "VIP_PASS" ? "FOUNDER_VIP_PASS" : (isPro ? "OFFLINE_APPROVAL" : "FREE_TRIAL"),
          receiptNumber: isPro ? "INITIAL-PRO-MIGRATION" : "ONBOARDING-TRIAL-PASS",
          receiptUrl: null,
          notes: isPro ? "Active Pro Subscription" : "Initial 10-Day Free Express Trial",
          activatedBy: "Platform System",
          planExpiresAt: uData.planExpiresAt || null,
          status: "COMPLETED",
        });
      }
    }

    // Sort newest first
    historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      history: historyItems,
      totalCount: historyItems.length,
    });
  } catch (err: any) {
    console.error("GET /api/apex/subscription-history error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
