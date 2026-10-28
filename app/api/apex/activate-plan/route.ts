import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateStackedExpiry } from "@/lib/subscriptionEngine";
import { sendSESEmail } from "@/lib/sesService";
import { sendWhatsAppMessage, formatIndianPhoneNumber } from "@/lib/whatsappService";

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
      discountPercentage = 0,
      receiptNumber = "",
      receiptUrl = "",
      notes = "",
      activatedBy = "Founder Console",
      requestId = null,
      propertyId = null,
      credits = null,
    } = body;

    if (!email && !userId && !propertyId) {
      return NextResponse.json(
        { success: false, message: "Customer email, userId, or propertyId is required." },
        { status: 400 }
      );
    }

    const cleanEmail = (email || "").toLowerCase().trim();
    const now = new Date();
    const nowIso = now.toISOString();

    // 💬 Check if this is a dedicated WhatsApp Credits purchase / approval
    const isWhatsAppRecharge =
      plan.startsWith("WHATSAPP") ||
      plan.startsWith("pack-") ||
      typeof credits === "number";

    if (isWhatsAppRecharge) {
      const creditsToAdd =
        Number(credits) ||
        (plan.includes("2000") || plan.includes("enterprise")
          ? 2000
          : plan.includes("750") || plan.includes("growth")
          ? 750
          : 250);

      const targetPropId = propertyId || "prop-1788438308277";
      const walletRef = doc(db, `properties/${targetPropId}/whatsapp/wallet`);
      const wSnap = await getDoc(walletRef);
      const currentCredits = wSnap.exists() && typeof wSnap.data()?.credits === "number" ? wSnap.data().credits : 10;
      const currentTxs = wSnap.exists() && Array.isArray(wSnap.data()?.transactions) ? wSnap.data().transactions : [];
      const newBalance = currentCredits + creditsToAdd;

      const newTx = {
        id: `tx-buy-${Date.now()}`,
        type: "PURCHASE",
        amount: creditsToAdd,
        balanceAfter: newBalance,
        description: notes || `Recharged +${creditsToAdd} WhatsApp Credits (${paymentMode})`,
        timestamp: nowIso,
        status: "DELIVERED",
      };

      await setDoc(
        walletRef,
        {
          credits: newBalance,
          transactions: [newTx, ...currentTxs].slice(0, 100),
          updatedAt: nowIso,
          updatedBy: activatedBy,
        },
        { merge: true }
      );

      // If linked to an offline payment request, mark it APPROVED
      if (requestId) {
        const approvalData = {
          status: "APPROVED",
          reviewedAt: nowIso,
          reviewedBy: activatedBy,
          activatedPlan: plan,
        };
        try {
          await setDoc(doc(db, "platform_admin", "requests", "submissions", requestId), approvalData, { merge: true });
          await setDoc(doc(db, "subscription_requests", requestId), approvalData, { merge: true });
        } catch (e) {}
      }

      // Record immutable billing transaction
      const txnRecord = {
        id: `txn_apex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        customerEmail: cleanEmail || "property_admin@tenopilot.com",
        userId: userId || null,
        plan: plan,
        durationDays: 0,
        paymentMode: paymentMode,
        amountPaid: Number(amountPaid),
        propertyId: targetPropId,
        creditsAdded: creditsToAdd,
        receiptNumber: receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
        receiptUrl: receiptUrl || null,
        notes: notes || `WhatsApp Credits Purchase (+${creditsToAdd} credits)`,
        activatedBy: activatedBy,
        createdAt: nowIso,
        status: "COMPLETED",
      };

      try {
        await setDoc(doc(db, "platform_admin", "billing", "transactions", txnRecord.id), txnRecord);
        await setDoc(doc(db, "subscription_transactions", txnRecord.id), txnRecord);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Recharged +${creditsToAdd} WhatsApp credits for ${targetPropId}!`,
        transaction: txnRecord,
        newBalance,
      });
    }

    // Check existing expiry and capacity limits for stacked renewal & add-ons
    let currentExpiryIso: string | null = null;
    let existingMaxProperties = 1;
    let existingExtensionPacks = 0;
    let customerName = "Property Partner";
    let customerPhone = "";
    let customerPropName = "TenoPilot Coliving";
    let customerPropId = propertyId || "";

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
          if (uData?.displayName || uData?.name) customerName = uData.displayName || uData.name;
          if (uData?.phone) customerPhone = uData.phone;
          if (uData?.propertyName || uData?.pgName) customerPropName = uData.propertyName || uData.pgName;
          if (uData?.assignedPropertyId) customerPropId = uData.assignedPropertyId;
        }
      } catch (e) {
        console.warn("Notice checking existing expiry:", e);
      }
    }
    if ((!currentExpiryIso || existingMaxProperties === 1 || !customerPhone) && cleanEmail) {
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
          if (uData?.displayName || uData?.name) customerName = uData.displayName || uData.name;
          if (uData?.phone) customerPhone = uData.phone;
          if (uData?.propertyName || uData?.pgName) customerPropName = uData.propertyName || uData.pgName;
          if (uData?.assignedPropertyId) customerPropId = uData.assignedPropertyId;
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

    // If activating Multi-Property Add-on, increment maxPropertiesAllowed and lock individual override
    let isMultiPropertyAddon = false;
    let bumpedMaxProps: number | null = null;
    if (plan === "MULTI_PROPERTY_MONTHLY") {
      isMultiPropertyAddon = true;
      bumpedMaxProps = Math.max(1, existingMaxProperties) + 1;
      updatePayload.maxPropertiesAllowed = bumpedMaxProps;
      updatePayload.hasCustomLimitsOverride = true;
      updatePayload.customLimitsOverrideAt = nowIso;
      // 🛡️ Decouple: Do not overwrite base plan or stack onto Property #1's validity cycle
      delete updatePayload.plan;
      delete updatePayload.subscriptionPlan;
      if (currentExpiryIso) {
        updatePayload.planExpiresAt = currentExpiryIso;
      } else {
        delete updatePayload.planExpiresAt;
      }
    }

    // If activating Tenant Extension Pack, increment tenantExtensionPacks
    if (plan === "TENANT_EXTENSION_PACK_25") {
      updatePayload.tenantExtensionPacks = existingExtensionPacks + 1;
      updatePayload.hasCustomLimitsOverride = true;
      updatePayload.customLimitsOverrideAt = nowIso;
      // 🛡️ Decouple: Do not overwrite base plan or stack onto Property #1's validity cycle
      delete updatePayload.plan;
      delete updatePayload.subscriptionPlan;
      if (currentExpiryIso) {
        updatePayload.planExpiresAt = currentExpiryIso;
      } else {
        delete updatePayload.planExpiresAt;
      }
    }

    // 1. Update users collection (by explicit userId, email, verified phone, and linked accounts)
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

    // 1a. Omni-Auth Sync: Also update user records linked via Phone or primaryUid
    const cleanCustomerPhone = (body?.phone || customerPhone || "").replace(/\D/g, "");
    const pure10 = cleanCustomerPhone.slice(-10);
    if (pure10) {
      try {
        const qPhone1 = query(collection(db, "users"), where("phone", "==", pure10));
        const snap1 = await getDocs(qPhone1);
        for (const uDoc of snap1.docs) {
          await setDoc(doc(db, "users", uDoc.id), updatePayload, { merge: true });
        }
        const qPhone2 = query(collection(db, "users"), where("phone", "==", `91${pure10}`));
        const snap2 = await getDocs(qPhone2);
        for (const uDoc of snap2.docs) {
          await setDoc(doc(db, "users", uDoc.id), updatePayload, { merge: true });
        }
      } catch (err) {
        console.warn("User phone doc update notice in activate-plan:", err);
      }
    }
    if (userId) {
      try {
        const qPrimary = query(collection(db, "users"), where("primaryUid", "==", userId));
        const snapPrimary = await getDocs(qPrimary);
        for (const uDoc of snapPrimary.docs) {
          await setDoc(doc(db, "users", uDoc.id), updatePayload, { merge: true });
        }
      } catch (err) {
        console.warn("Primary linked doc update notice in activate-plan:", err);
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
      const fcUpdate: Record<string, any> = {
        ownerEmail: cleanEmail,
        plan: resolvedPlan,
        subscriptionStatus: resolvedSubscriptionStatus,
        planExpiresAt: expiryIso,
        lastPaymentMode: paymentMode,
        lastReceiptNumber: receiptNumber,
        activatedAt: nowIso,
        activatedBy: activatedBy,
      };

      if (isMultiPropertyAddon && bumpedMaxProps !== null) {
        fcUpdate.maxPropertiesAllowed = bumpedMaxProps;
        fcUpdate.hasCustomLimitsOverride = true;
        fcUpdate.customLimitsOverrideAt = nowIso;
      }

      await setDoc(doc(db, "founder_clients", cleanEmail), fcUpdate, { merge: true });
    } catch (fcErr) {
      console.warn("founder_clients sync notice:", fcErr);
    }

    // 4. Provision WhatsApp Credits for Pro Activation
    if (!isTrialExtension) {
      try {
        // Fetch platform config for default Pro WhatsApp credits
        let welcomeCredits = 300;
        try {
          const cfgSnap = await getDoc(doc(db, "platform_admin", "config", "settings", "master_controls"));
          if (cfgSnap.exists() && typeof cfgSnap.data()?.proWhatsAppCredits === "number") {
            welcomeCredits = cfgSnap.data()?.proWhatsAppCredits;
          }
        } catch (cfgErr) {
          console.warn("Notice reading master_controls for WhatsApp welcome credits:", cfgErr);
        }

        // Find all property wallets owned by this user
        const targetPropertyIds = new Set<string>();
        if (propertyId) targetPropertyIds.add(propertyId);

        if (cleanEmail) {
          try {
            const propSnap = await getDocs(query(collection(db, "portfolio_properties"), where("ownerEmail", "==", cleanEmail)));
            propSnap.docs.forEach((d) => targetPropertyIds.add(d.id));
          } catch (e) {}

          try {
            const fcSnap = await getDocs(query(collection(db, "founder_clients"), where("email", "==", cleanEmail)));
            fcSnap.docs.forEach((d) => {
              const dData = d.data();
              if (dData.propertyId) targetPropertyIds.add(dData.propertyId);
              if (Array.isArray(dData.propertyIds)) dData.propertyIds.forEach((pid: string) => targetPropertyIds.add(pid));
            });
          } catch (e) {}
        }

        if (userId) {
          try {
            const uPropSnap = await getDocs(query(collection(db, "portfolio_properties"), where("ownerUid", "==", userId)));
            uPropSnap.docs.forEach((d) => targetPropertyIds.add(d.id));
          } catch (e) {}
        }

        for (const propId of Array.from(targetPropertyIds)) {
          const walletRef = doc(db, `properties/${propId}/whatsapp/wallet`);
          const wSnap = await getDoc(walletRef);
          const currentCredits = wSnap.exists() && typeof wSnap.data()?.credits === "number" ? wSnap.data().credits : 0;
          const currentTxs = wSnap.exists() && Array.isArray(wSnap.data()?.transactions) ? wSnap.data().transactions : [];
          const newBalance = Math.max(currentCredits + welcomeCredits, welcomeCredits);

          const newTx = {
            id: `tx-pro-bonus-${Date.now()}`,
            type: "STARTER_BONUS",
            amount: welcomeCredits,
            balanceAfter: newBalance,
            description: `+${welcomeCredits} Pro Subscription Welcome Bonus (${plan})`,
            timestamp: nowIso,
            status: "DELIVERED",
          };

          await setDoc(
            walletRef,
            {
              credits: newBalance,
              transactions: [newTx, ...currentTxs].slice(0, 100),
              updatedAt: nowIso,
              updatedBy: activatedBy,
            },
            { merge: true }
          );
        }
      } catch (wErr) {
        console.warn("Notice provisioning Pro WhatsApp welcome bonus credits:", wErr);
      }

      // 5. Deliver Luxury Subscription Tax Invoice (PDF + Email + WhatsApp)
      try {
        const invoiceNumber = receiptNumber || `INV-${Date.now().toString().slice(-6)}`;
        const origin = process.env.NEXT_PUBLIC_APP_URL || "https://www.tenopilot.com";
        const validityPeriodStr = `${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} - ${new Date(expiryIso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
        const invoicePdfUrl = `${origin}/api/subscription/invoice/pdf?invoiceNo=${encodeURIComponent(invoiceNumber)}&ownerName=${encodeURIComponent(customerName)}&propertyName=${encodeURIComponent(customerPropName)}&ownerEmail=${encodeURIComponent(cleanEmail)}&ownerPhone=${encodeURIComponent(customerPhone)}&planName=${encodeURIComponent(resolvedPlan)}&amount=${amountPaid}${Number(discountPercentage) > 0 ? `&discount=${encodeURIComponent(String(discountPercentage))}` : ""}&validityPeriod=${encodeURIComponent(validityPeriodStr)}`;

        // Dispatch Email Invoice
        if (cleanEmail && cleanEmail.includes("@")) {
          sendSESEmail({
            toEmail: cleanEmail,
            recipientName: customerName,
            propertyId: customerPropId || "platform",
            propertyName: customerPropName,
            type: "SUBSCRIPTION_INVOICE",
            params: {
              receiptId: invoiceNumber,
              receiptUrl: invoicePdfUrl,
              amount: amountPaid,
              planName: resolvedPlan,
              validityPeriod: validityPeriodStr,
            },
          }).catch((err) => console.warn("Invoice email dispatch notice:", err));
        }

        // Dispatch WhatsApp Invoice
        if (customerPhone && customerPhone.length >= 10) {
          sendWhatsAppMessage({
            toPhone: formatIndianPhoneNumber(customerPhone),
            recipientName: customerName,
            propertyId: customerPropId || "platform",
            propertyName: customerPropName,
            type: "SUBSCRIPTION_INVOICE",
            params: {
              receiptId: invoiceNumber,
              receiptUrl: invoicePdfUrl,
              amount: amountPaid,
              planName: resolvedPlan,
            },
          }).catch((err) => console.warn("Invoice WhatsApp dispatch notice:", err));
        }
      } catch (invErr) {
        console.warn("Invoice delivery notice:", invErr);
      }
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
