import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateStackedExpiry } from "@/lib/subscriptionEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      email,
      plan = "PRO_MONTHLY",
      durationDays = 30,
      paymentMode = "UPI",
      amountPaid = 999,
      receiptNumber = "",
      receiptUrl = "",
      notes = "",
      activatedBy = "Founder Console",
      requestId = null,
    } = body;

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, message: "Customer email or userId is required." },
        { status: 400 }
      );
    }

    const cleanEmail = (email || "").toLowerCase().trim();
    const now = new Date();
    const nowIso = now.toISOString();

    // Check existing expiry and capacity limits for stacked renewal & add-ons
    let currentExpiryIso: string | null = null;
    let existingMaxProperties = 1;
    let existingExtensionPacks = 0;

    if (userId) {
      try {
        const existingSnap = await getDoc(doc(db, "users", userId));
        if (existingSnap.exists()) {
          const uData = existingSnap.data();
          if (uData?.planExpiresAt) {
            currentExpiryIso = uData.planExpiresAt;
          }
          if (uData?.maxPropertiesAllowed !== undefined) {
            existingMaxProperties = Number(uData.maxPropertiesAllowed) || 1;
          }
          if (uData?.tenantExtensionPacks !== undefined) {
            existingExtensionPacks = Number(uData.tenantExtensionPacks) || 0;
          }
        }
      } catch (e) {
        console.warn("Notice checking existing expiry:", e);
      }
    }
    if ((!currentExpiryIso || existingMaxProperties === 1) && cleanEmail) {
      try {
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const uData = snap.docs[0].data();
          if (uData?.planExpiresAt) currentExpiryIso = uData.planExpiresAt;
          if (uData?.maxPropertiesAllowed !== undefined) {
            existingMaxProperties = Number(uData.maxPropertiesAllowed) || 1;
          }
          if (uData?.tenantExtensionPacks !== undefined) {
            existingExtensionPacks = Number(uData.tenantExtensionPacks) || 0;
          }
        }
      } catch (e) {
        console.warn("User email lookup for expiry notice:", e);
      }
    }

    // Calculate stacked expiry date (extends from current expiry if still active)
    let expiryIso = calculateStackedExpiry(currentExpiryIso, Number(durationDays));

    const isTrialExtension = plan === "TRIAL_EXTENSION" || plan === "10_DAY_TRIAL";
    const resolvedSubscriptionStatus = isTrialExtension ? "TRIAL" : "ACTIVE_PRO";
    const resolvedSubscriptionPlan = isTrialExtension ? "trial" : "pro";
    const resolvedPlan = isTrialExtension ? "10_DAY_TRIAL" : plan;

    const updatePayload: Record<string, any> = {
      plan: resolvedPlan,
      subscriptionPlan: resolvedSubscriptionPlan,
      subscriptionStatus: resolvedSubscriptionStatus,
      planExpiresAt: expiryIso,
      lastPaymentMode: paymentMode,
      lastReceiptNumber: receiptNumber,
      lastReceiptUrl: receiptUrl || null,
      lastActivatedBy: activatedBy,
      lastActivatedAt: nowIso,
      pendingPaymentRequest: false,
      pendingRequestData: null,
      lastPaymentApprovedAt: nowIso,
      notes: notes || null,
      updatedAt: nowIso,
    };

    // If activating Multi-Property Add-on, increment maxPropertiesAllowed
    if (plan === "MULTI_PROPERTY_MONTHLY") {
      updatePayload.maxPropertiesAllowed = Math.max(1, existingMaxProperties) + 1;
    }

    // If activating Tenant Extension Pack, increment tenantExtensionPacks
    if (plan === "TENANT_EXTENSION_PACK_25") {
      updatePayload.tenantExtensionPacks = existingExtensionPacks + 1;
    }

    // 1. Update users collection (both by explicit userId and by email query)
    if (userId) {
      try {
        await setDoc(doc(db, "users", userId), updatePayload, { merge: true });
      } catch (err) {
        console.warn(`User doc update notice for ${userId}:`, err);
      }
    }
    if (cleanEmail) {
      try {
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        for (const uDoc of snap.docs) {
          await setDoc(doc(db, "users", uDoc.id), updatePayload, { merge: true });
        }
      } catch (err) {
        console.warn(`User email doc update notice for ${cleanEmail}:`, err);
      }
    }

    // 1b. If linked to an offline payment request, mark it APPROVED in platform_admin and subscription_requests
    if (requestId) {
      const approvalData = {
        status: "APPROVED",
        reviewedAt: nowIso,
        reviewedBy: activatedBy,
        activatedPlan: resolvedPlan,
      };

      try {
        await setDoc(
          doc(db, "platform_admin", "requests", "submissions", requestId),
          approvalData,
          { merge: true }
        );
      } catch (reqErr) {
        console.warn(`platform_admin approval notice for ${requestId}:`, reqErr);
      }

      try {
        await setDoc(
          doc(db, "subscription_requests", requestId),
          approvalData,
          { merge: true }
        );
      } catch (reqErr) {
        console.warn(`subscription_requests approval notice for ${requestId}:`, reqErr);
      }
    }

    // 2. Record immutable Audit Transaction in subscription_transactions
    const txnRecord = {
      id: `txn_apex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      customerEmail: cleanEmail,
      userId: userId || null,
      plan: resolvedPlan,
      durationDays: Number(durationDays),
      paymentMode: paymentMode,
      amountPaid: Number(amountPaid),
      receiptNumber: receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
      receiptUrl: receiptUrl || null,
      notes: notes || null,
      activatedBy: activatedBy,
      planExpiresAt: expiryIso,
      createdAt: nowIso,
      status: "COMPLETED",
    };

    try {
      await setDoc(doc(db, "platform_admin", "billing", "transactions", txnRecord.id), txnRecord);
    } catch (txnErr) {
      console.warn("platform_admin billing transaction notice:", txnErr);
    }

    try {
      await setDoc(doc(db, "subscription_transactions", txnRecord.id), txnRecord);
    } catch (txnErr) {
      console.warn("Failed to record subscription transaction:", txnErr);
    }

    // 3. Update founder_clients document
    try {
      await setDoc(
        doc(db, "founder_clients", cleanEmail),
        {
          ownerEmail: cleanEmail,
          plan: resolvedPlan,
          subscriptionStatus: resolvedSubscriptionStatus,
          planExpiresAt: expiryIso,
          lastPaymentMode: paymentMode,
          lastReceiptNumber: receiptNumber,
          activatedAt: nowIso,
          activatedBy: activatedBy,
        },
        { merge: true }
      );
    } catch (fcErr) {
      console.warn("founder_clients sync notice:", fcErr);
    }

    return NextResponse.json({
      success: true,
      message: `Plan ${plan} successfully activated for ${cleanEmail} via ${paymentMode}!`,
      transaction: txnRecord,
      planExpiresAt: expiryIso,
    });
  } catch (err: any) {
    console.error("POST /api/apex/activate-plan error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to activate customer plan" },
      { status: 500 }
    );
  }
}
