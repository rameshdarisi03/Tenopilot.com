import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateStackedExpiry } from "@/lib/subscriptionEngine";
import { CreditBatch } from "@/lib/creditRolloverEngine";

export interface PlanActivationParams {
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  propertyId?: string | null;
  plan?: string;
  durationDays?: number;
  paymentMode?: string;
  amountPaid?: number;
  discountPercentage?: number;
  receiptNumber?: string;
  receiptUrl?: string | null;
  notes?: string;
  activatedBy?: string;
  requestId?: string | null;
  credits?: number | null;
  customCredits?: {
    whatsapp?: number;
    email?: number;
  };
}

export interface ActivationPipelineResult {
  success: boolean;
  message: string;
  targetPropertyIds: string[];
  plan: string;
  subscriptionPlan: "trial" | "pro";
  subscriptionStatus: "TRIAL" | "ACTIVE_PRO";
  planExpiresAt: string;
  provisionedCredits: {
    whatsapp: number;
    email: number;
  };
  propertyWalletBalances: Record<string, { whatsapp: number; email: number }>;
  transactionId: string;
}

/**
 * Resolves all property IDs associated with a user across all Firestore collections
 */
export async function resolveTargetPropertyIds(params: {
  propertyId?: string | null;
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<string[]> {
  const propertyIds = new Set<string>();

  if (params.propertyId) {
    propertyIds.add(params.propertyId.trim());
  }

  const cleanEmail = (params.email || "").toLowerCase().trim();
  const cleanPhone = (params.phone || "").replace(/\D/g, "");
  const pure10Phone = cleanPhone.slice(-10);

  // 1. Inspect users document by userId
  if (params.userId) {
    try {
      const uSnap = await getDoc(doc(db, "users", params.userId));
      if (uSnap.exists()) {
        const uData = uSnap.data();
        if (uData.assignedPropertyId) propertyIds.add(uData.assignedPropertyId);
        if (uData.propertyId) propertyIds.add(uData.propertyId);
        if (Array.isArray(uData.propertyIds)) {
          uData.propertyIds.forEach((pid: string) => pid && propertyIds.add(pid));
        }
      }
    } catch (e) {
      console.warn("Notice scanning users doc by userId in resolveTargetPropertyIds:", e);
    }
  }

  // 2. Inspect users document by email
  if (cleanEmail) {
    try {
      const q = query(collection(db, "users"), where("email", "==", cleanEmail));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.assignedPropertyId) propertyIds.add(data.assignedPropertyId);
        if (data.propertyId) propertyIds.add(data.propertyId);
        if (Array.isArray(data.propertyIds)) {
          data.propertyIds.forEach((pid: string) => pid && propertyIds.add(pid));
        }
      });
    } catch (e) {
      console.warn("Notice scanning users doc by email in resolveTargetPropertyIds:", e);
    }

    // 3. Inspect portfolio_properties collection
    try {
      const pSnap = await getDocs(query(collection(db, "portfolio_properties"), where("ownerEmail", "==", cleanEmail)));
      pSnap.docs.forEach((d) => propertyIds.add(d.id));
    } catch (e) {}

    // 4. Inspect founder_clients collection
    try {
      const fcDoc = await getDoc(doc(db, "founder_clients", cleanEmail));
      if (fcDoc.exists()) {
        const fcData = fcDoc.data();
        if (fcData.propertyId) propertyIds.add(fcData.propertyId);
        if (Array.isArray(fcData.propertyIds)) {
          fcData.propertyIds.forEach((pid: string) => pid && propertyIds.add(pid));
        }
      }
    } catch (e) {}

    // 5. Inspect founder_invites collection
    try {
      const invSnap = await getDocs(query(collection(db, "founder_invites"), where("ownerEmail", "==", cleanEmail)));
      invSnap.docs.forEach((d) => {
        propertyIds.add(`prop-${d.id}`);
        const iData = d.data();
        if (iData.propertyId) propertyIds.add(iData.propertyId);
      });
    } catch (e) {}
  }

  // 6. Inspect by phone number if present
  if (pure10Phone) {
    try {
      const invPhoneSnap = await getDocs(query(collection(db, "founder_invites"), where("ownerPhone", "==", pure10Phone)));
      invPhoneSnap.docs.forEach((d) => propertyIds.add(`prop-${d.id}`));
    } catch (e) {}
  }

  // Fallback: if no properties found and userId exists, guarantee a property id
  if (propertyIds.size === 0 && params.userId) {
    propertyIds.add(`prop-${params.userId}`);
  }

  return Array.from(propertyIds).filter(Boolean);
}

/**
 * Authoritative Plan Activation & Entitlements Provisioning Pipeline
 * Ensures all services, wallets, features, limits, and subscriptions are initialized atomically upon plan activation.
 */
export async function executePlanActivationPipeline(
  params: PlanActivationParams
): Promise<ActivationPipelineResult> {
  const {
    userId,
    email,
    phone,
    propertyId,
    plan = "PRO_MONTHLY",
    durationDays = 30,
    paymentMode = "UPI",
    amountPaid = 999,
    discountPercentage = 0,
    receiptNumber = "",
    receiptUrl = "",
    notes = "",
    activatedBy = "Founder Console",
    requestId = null,
    credits = null,
    customCredits,
  } = params;

  const cleanEmail = (email || "").toLowerCase().trim();
  const now = new Date();
  const nowIso = now.toISOString();

  // 🔍 1. Resolve Target Properties
  const targetPropertyIds = await resolveTargetPropertyIds({
    propertyId,
    userId,
    email: cleanEmail,
    phone,
  });

  // 💬 2. Detect if this is a dedicated WhatsApp credit package recharge
  const isWhatsAppRecharge =
    plan.startsWith("WHATSAPP") ||
    plan.startsWith("pack-") ||
    typeof credits === "number";

  const isTrialExtension = plan === "TRIAL_EXTENSION" || plan === "10_DAY_TRIAL" || plan === "trial";
  const resolvedSubscriptionPlan: "trial" | "pro" = isTrialExtension ? "trial" : "pro";
  const resolvedSubscriptionStatus: "TRIAL" | "ACTIVE_PRO" = isTrialExtension ? "TRIAL" : "ACTIVE_PRO";
  const resolvedPlan = isTrialExtension ? "10_DAY_TRIAL" : plan;

  // 📊 3. Calculate Stacked Expiry Date
  let currentExpiryIso: string | null = null;
  let existingMaxProperties = 1;
  let existingExtensionPacks = 0;

  if (userId) {
    try {
      const uSnap = await getDoc(doc(db, "users", userId));
      if (uSnap.exists()) {
        const u = uSnap.data();
        if (u.planExpiresAt) currentExpiryIso = u.planExpiresAt;
        if (typeof u.maxPropertiesAllowed === "number") existingMaxProperties = u.maxPropertiesAllowed;
        if (typeof u.tenantExtensionPacks === "number") existingExtensionPacks = u.tenantExtensionPacks;
      }
    } catch (e) {}
  }

  if (!currentExpiryIso && cleanEmail) {
    try {
      const q = query(collection(db, "users"), where("email", "==", cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const u = snap.docs[0].data();
        if (u.planExpiresAt) currentExpiryIso = u.planExpiresAt;
        if (typeof u.maxPropertiesAllowed === "number") existingMaxProperties = u.maxPropertiesAllowed;
        if (typeof u.tenantExtensionPacks === "number") existingExtensionPacks = u.tenantExtensionPacks;
      }
    } catch (e) {}
  }

  const expiryIso = calculateStackedExpiry(currentExpiryIso, Number(durationDays) || 30);

  // 🎁 4. Calculate Credits to Provision based on Plan
  let waCreditsToAdd = 0;
  let emailCreditsToAdd = 0;

  if (isWhatsAppRecharge) {
    waCreditsToAdd =
      Number(credits) ||
      (plan.includes("2000") || plan.includes("enterprise")
        ? 2000
        : plan.includes("750") || plan.includes("growth")
        ? 750
        : 250);
    emailCreditsToAdd = 0;
  } else if (customCredits?.whatsapp !== undefined || customCredits?.email !== undefined) {
    waCreditsToAdd = Number(customCredits?.whatsapp) || 0;
    emailCreditsToAdd = Number(customCredits?.email) || 0;
  } else if (isTrialExtension) {
    waCreditsToAdd = 25;
    emailCreditsToAdd = 50;
  } else {
    // Pro Plans Credit Allotments
    let baseProWa = 300;
    try {
      const cfgSnap = await getDoc(doc(db, "platform_admin", "config", "settings", "master_controls"));
      if (cfgSnap.exists() && typeof cfgSnap.data()?.proWhatsAppCredits === "number") {
        baseProWa = cfgSnap.data().proWhatsAppCredits;
      }
    } catch (e) {}

    if (plan === "PRO_ANNUAL" || plan === "ANNUAL_VIP" || plan === "VIP_PASS") {
      waCreditsToAdd = baseProWa * 12; // 3,600 credits
      emailCreditsToAdd = 12000;
    } else if (plan === "PRO_SEMI_ANNUAL") {
      waCreditsToAdd = baseProWa * 6; // 1,800 credits
      emailCreditsToAdd = 6000;
    } else if (plan === "PRO_QUARTERLY") {
      waCreditsToAdd = baseProWa * 3; // 900 credits
      emailCreditsToAdd = 3000;
    } else {
      // Default Pro Monthly (30 days)
      waCreditsToAdd = baseProWa; // 300 credits
      emailCreditsToAdd = 1000;
    }
  }

  // 4-Month Rollover Expiry Date for New Credit Batches
  const rolloverMonths = 4;
  const batchExpiryIso = new Date(now.getTime() + rolloverMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

  const propertyWalletBalances: Record<string, { whatsapp: number; email: number }> = {};

  // ⚡ 5. Atomically Provision Wallets & Settings for Every Discovered Property
  for (const propId of targetPropertyIds) {
    let finalWaBalance = 0;
    let finalEmailBalance = 0;

    // --- A. WhatsApp Wallet Provisioning ---
    try {
      const waWalletRef = doc(db, `properties/${propId}/whatsapp/wallet`);
      const waSnap = await getDoc(waWalletRef);
      const waData = waSnap.exists() ? waSnap.data() : null;
      const currentWaCredits = Number(waData?.credits) || 0;
      const existingWaTxs = Array.isArray(waData?.transactions) ? waData.transactions : [];
      const existingWaBatches: CreditBatch[] = Array.isArray(waData?.batches) ? waData.batches : [];

      finalWaBalance = currentWaCredits + waCreditsToAdd;

      const newWaBatch: CreditBatch = {
        id: `batch-wa-act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        cycleId: `cycle-${Date.now()}`,
        source: isWhatsAppRecharge ? "RECHARGE_PACK" : "MONTHLY_QUOTA",
        initialCredits: waCreditsToAdd,
        remainingCredits: waCreditsToAdd,
        grantedAt: nowIso,
        expiresAt: batchExpiryIso,
      };

      const newWaTx = {
        id: `tx-wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: isWhatsAppRecharge ? "PURCHASE" : "PURCHASE",
        amount: waCreditsToAdd,
        balanceAfter: finalWaBalance,
        description: isWhatsAppRecharge
          ? `Recharged +${waCreditsToAdd} WhatsApp Credits (${paymentMode})`
          : `Plan Activation Quota: ${resolvedPlan} (+${waCreditsToAdd} WhatsApp Credits)`,
        timestamp: nowIso,
        status: "DELIVERED",
      };

      await setDoc(
        waWalletRef,
        {
          credits: finalWaBalance,
          batches: [newWaBatch, ...existingWaBatches],
          rolloverValidityMonths: rolloverMonths,
          lastRolloverAt: nowIso,
          transactions: [newWaTx, ...existingWaTxs].slice(0, 100),
          updatedAt: nowIso,
          updatedBy: activatedBy,
        },
        { merge: true }
      );
    } catch (waErr) {
      console.warn(`Failed to provision WhatsApp wallet for ${propId}:`, waErr);
    }

    // --- B. Email Wallet Provisioning ---
    try {
      const emailWalletRef = doc(db, `properties/${propId}/email/wallet`);
      const emailSnap = await getDoc(emailWalletRef);
      const emailData = emailSnap.exists() ? emailSnap.data() : null;
      const currentEmailCredits = Number(emailData?.credits) || 0;
      const existingEmailTxs = Array.isArray(emailData?.transactions) ? emailData.transactions : [];
      const existingEmailBatches: CreditBatch[] = Array.isArray(emailData?.batches) ? emailData.batches : [];

      finalEmailBalance = currentEmailCredits + emailCreditsToAdd;

      const newEmailBatch: CreditBatch = {
        id: `batch-email-act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        cycleId: `cycle-${Date.now()}`,
        source: "MONTHLY_QUOTA",
        initialCredits: emailCreditsToAdd,
        remainingCredits: emailCreditsToAdd,
        grantedAt: nowIso,
        expiresAt: batchExpiryIso,
      };

      const newEmailTx = {
        id: `tx-email-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "PURCHASE",
        amount: emailCreditsToAdd,
        balanceAfter: finalEmailBalance,
        description: `Plan Activation Quota: ${resolvedPlan} (+${emailCreditsToAdd} Email Credits)`,
        timestamp: nowIso,
        status: "DELIVERED",
      };

      await setDoc(
        emailWalletRef,
        {
          credits: finalEmailBalance,
          batches: [newEmailBatch, ...existingEmailBatches],
          rolloverValidityMonths: rolloverMonths,
          lastRolloverAt: nowIso,
          transactions: [newEmailTx, ...existingEmailTxs].slice(0, 100),
          updatedAt: nowIso,
          updatedBy: activatedBy,
        },
        { merge: true }
      );
    } catch (emailErr) {
      console.warn(`Failed to provision Email wallet for ${propId}:`, emailErr);
    }

    propertyWalletBalances[propId] = {
      whatsapp: finalWaBalance,
      email: finalEmailBalance,
    };

    // --- C. Property Settings & Subscription Status Provisioning ---
    if (!isWhatsAppRecharge) {
      try {
        const propConfigRef = doc(db, `properties/${propId}/settings/config`);
        await setDoc(
          propConfigRef,
          {
            subscriptionPlan: resolvedSubscriptionPlan,
            subscriptionStatus: resolvedSubscriptionStatus,
            plan: resolvedPlan,
            planExpiresAt: expiryIso,
            lastActivatedAt: nowIso,
            lastActivatedBy: activatedBy,
            features: {
              whatsappCloud: true,
              emailGateway: true,
              autoReminders: true,
              digitalKyc: true,
              excelExports: true,
              digitalSignature: true,
              multiPartnerLedger: true,
            },
            updatedAt: nowIso,
          },
          { merge: true }
        );

        // Synchronize Active Subscription Cycle
        const cycleRef = doc(db, `properties/${propId}/subscription_cycle/active`);
        await setDoc(
          cycleRef,
          {
            cycleStartDate: nowIso,
            cycleEndDate: expiryIso,
            plan: resolvedPlan,
            status: "ACTIVE",
            updatedAt: nowIso,
          },
          { merge: true }
        );
      } catch (propErr) {
        console.warn(`Failed to update property settings for ${propId}:`, propErr);
      }
    }
  }

  // 📝 6. Record Immutable Billing Audit Transaction
  const txnId = `txn_apex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const txnRecord = {
    id: txnId,
    customerEmail: cleanEmail,
    userId: userId || null,
    plan: resolvedPlan,
    durationDays: isWhatsAppRecharge ? 0 : Number(durationDays),
    paymentMode: paymentMode,
    amountPaid: Number(amountPaid),
    propertyId: targetPropertyIds[0] || propertyId || null,
    propertyIds: targetPropertyIds,
    creditsAddedWa: waCreditsToAdd,
    creditsAddedEmail: emailCreditsToAdd,
    receiptNumber: receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
    receiptUrl: receiptUrl || null,
    notes: notes || `Plan activation for ${resolvedPlan} (+${waCreditsToAdd} WA, +${emailCreditsToAdd} Email)`,
    activatedBy: activatedBy,
    planExpiresAt: expiryIso,
    createdAt: nowIso,
    status: "COMPLETED",
  };

  try {
    await setDoc(doc(db, "platform_admin", "billing", "transactions", txnId), txnRecord);
    await setDoc(doc(db, "subscription_transactions", txnId), txnRecord);
  } catch (e) {
    console.warn("Failed recording billing audit transaction:", e);
  }

  // 👤 7. Update User Documents (Multi-Account & Omni-Auth Sync)
  if (!isWhatsAppRecharge) {
    const userUpdatePayload: Record<string, any> = {
      plan: resolvedPlan,
      subscriptionPlan: resolvedSubscriptionPlan,
      subscriptionStatus: resolvedSubscriptionStatus,
      planExpiresAt: expiryIso,
      lastPaymentMode: paymentMode,
      lastReceiptNumber: receiptNumber || txnRecord.receiptNumber,
      lastReceiptUrl: receiptUrl || null,
      lastActivatedBy: activatedBy,
      lastActivatedAt: nowIso,
      pendingPaymentRequest: false,
      pendingRequestData: null,
      lastPaymentApprovedAt: nowIso,
      updatedAt: nowIso,
    };

    if (userId) {
      try {
        await setDoc(doc(db, "users", userId), userUpdatePayload, { merge: true });
      } catch (e) {}
    }

    if (cleanEmail) {
      try {
        const q = query(collection(db, "users"), where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        for (const uDoc of snap.docs) {
          await setDoc(doc(db, "users", uDoc.id), userUpdatePayload, { merge: true });
        }
      } catch (e) {}

      // Update founder_clients document
      try {
        await setDoc(
          doc(db, "founder_clients", cleanEmail),
          {
            ownerEmail: cleanEmail,
            plan: resolvedPlan,
            subscriptionStatus: resolvedSubscriptionStatus,
            planExpiresAt: expiryIso,
            lastPaymentMode: paymentMode,
            lastReceiptNumber: receiptNumber || txnRecord.receiptNumber,
            activatedAt: nowIso,
            activatedBy: activatedBy,
            propertyId: targetPropertyIds[0] || null,
            propertyIds: targetPropertyIds,
          },
          { merge: true }
        );
      } catch (e) {}
    }

    // 8. If linked to an offline payment request, approve it
    if (requestId) {
      const approvalData = {
        status: "APPROVED",
        reviewedAt: nowIso,
        reviewedBy: activatedBy,
        activatedPlan: resolvedPlan,
      };
      try {
        await setDoc(doc(db, "platform_admin", "requests", "submissions", requestId), approvalData, { merge: true });
        await setDoc(doc(db, "subscription_requests", requestId), approvalData, { merge: true });
      } catch (e) {}
    }
  }

  return {
    success: true,
    message: isWhatsAppRecharge
      ? `Recharged +${waCreditsToAdd} WhatsApp credits!`
      : `Plan ${resolvedPlan} activated! Allotted +${waCreditsToAdd} WhatsApp and +${emailCreditsToAdd} Email credits across ${targetPropertyIds.length} properties.`,
    targetPropertyIds,
    plan: resolvedPlan,
    subscriptionPlan: resolvedSubscriptionPlan,
    subscriptionStatus: resolvedSubscriptionStatus,
    planExpiresAt: expiryIso,
    provisionedCredits: {
      whatsapp: waCreditsToAdd,
      email: emailCreditsToAdd,
    },
    propertyWalletBalances,
    transactionId: txnId,
  };
}
