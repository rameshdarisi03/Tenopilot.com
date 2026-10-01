import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_PLATFORM_CONFIG, PlatformConfig } from "@/lib/platformConfig";
import { evaluateSubscription } from "@/lib/subscriptionEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const masterDoc = await getDoc(
      doc(db, "platform_admin", "config", "settings", "master_controls")
    );

    if (masterDoc.exists()) {
      const data = masterDoc.data();
      const config: PlatformConfig = {
        proMonthlyPrice: Number(data.proMonthlyPrice) || DEFAULT_PLATFORM_CONFIG.proMonthlyPrice,
        proAnnualPrice: Number(data.proAnnualPrice) || DEFAULT_PLATFORM_CONFIG.proAnnualPrice,
        multiPropertyPrice: Number(data.multiPropertyPrice) || DEFAULT_PLATFORM_CONFIG.multiPropertyPrice,
        tenantPackPrice: Number(data.tenantPackPrice) || DEFAULT_PLATFORM_CONFIG.tenantPackPrice,
        trialDays: Number(data.trialDays) || DEFAULT_PLATFORM_CONFIG.trialDays,
        graceDays: Number(data.graceDays) || DEFAULT_PLATFORM_CONFIG.graceDays,
        proTenantLimit: Number(data.proTenantLimit) || DEFAULT_PLATFORM_CONFIG.proTenantLimit,
        trialTenantLimit: Number(data.trialTenantLimit) || DEFAULT_PLATFORM_CONFIG.trialTenantLimit,
        baseAllowedBuildings: Number(data.baseAllowedBuildings) || DEFAULT_PLATFORM_CONFIG.baseAllowedBuildings,
        proWhatsAppCredits: Number(data.proWhatsAppCredits) !== undefined && !isNaN(Number(data.proWhatsAppCredits)) ? Number(data.proWhatsAppCredits) : DEFAULT_PLATFORM_CONFIG.proWhatsAppCredits,
        trialWhatsAppCredits: Number(data.trialWhatsAppCredits) !== undefined && !isNaN(Number(data.trialWhatsAppCredits)) ? Number(data.trialWhatsAppCredits) : DEFAULT_PLATFORM_CONFIG.trialWhatsAppCredits,
        founderWhatsapp: String(data.founderWhatsapp || DEFAULT_PLATFORM_CONFIG.founderWhatsapp),
        founderUpiVpa: String(data.founderUpiVpa || DEFAULT_PLATFORM_CONFIG.founderUpiVpa),
        founderUpiName: String(data.founderUpiName || DEFAULT_PLATFORM_CONFIG.founderUpiName),
        updatedAt: data.updatedAt || null,
        updatedBy: data.updatedBy || null,
      };

      return NextResponse.json({
        success: true,
        config,
      });
    }

    return NextResponse.json({
      success: true,
      config: DEFAULT_PLATFORM_CONFIG,
    });
  } catch (err: any) {
    console.error("GET /api/apex/master-controls error:", err);
    return NextResponse.json(
      { success: false, message: err.message, config: DEFAULT_PLATFORM_CONFIG },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      proMonthlyPrice = DEFAULT_PLATFORM_CONFIG.proMonthlyPrice,
      proAnnualPrice = DEFAULT_PLATFORM_CONFIG.proAnnualPrice,
      multiPropertyPrice = DEFAULT_PLATFORM_CONFIG.multiPropertyPrice,
      tenantPackPrice = DEFAULT_PLATFORM_CONFIG.tenantPackPrice,
      trialDays = DEFAULT_PLATFORM_CONFIG.trialDays,
      graceDays = DEFAULT_PLATFORM_CONFIG.graceDays,
      proTenantLimit = DEFAULT_PLATFORM_CONFIG.proTenantLimit,
      trialTenantLimit = DEFAULT_PLATFORM_CONFIG.trialTenantLimit,
      baseAllowedBuildings = DEFAULT_PLATFORM_CONFIG.baseAllowedBuildings,
      proWhatsAppCredits = DEFAULT_PLATFORM_CONFIG.proWhatsAppCredits,
      trialWhatsAppCredits = DEFAULT_PLATFORM_CONFIG.trialWhatsAppCredits,
      founderWhatsapp = DEFAULT_PLATFORM_CONFIG.founderWhatsapp,
      founderUpiVpa = DEFAULT_PLATFORM_CONFIG.founderUpiVpa,
      founderUpiName = DEFAULT_PLATFORM_CONFIG.founderUpiName,
      updatedBy = "Founder Console",
    } = body;

    // 1. Fetch previous master settings to calculate additive delta
    let prevProCredits = DEFAULT_PLATFORM_CONFIG.proWhatsAppCredits;
    try {
      const prevDoc = await getDoc(
        doc(db, "platform_admin", "config", "settings", "master_controls")
      );
      if (prevDoc.exists()) {
        const pData = prevDoc.data();
        if (typeof pData.proWhatsAppCredits === "number") {
          prevProCredits = pData.proWhatsAppCredits;
        }
      }
    } catch (e) {
      console.warn("Notice reading previous master config for delta:", e);
    }

    const newProCredits = Math.max(0, Number(proWhatsAppCredits));
    const deltaCredits = newProCredits - prevProCredits;

    const payload: PlatformConfig = {
      proMonthlyPrice: Math.max(1, Number(proMonthlyPrice)),
      proAnnualPrice: Math.max(1, Number(proAnnualPrice)),
      multiPropertyPrice: Math.max(0, Number(multiPropertyPrice)),
      tenantPackPrice: Math.max(0, Number(tenantPackPrice)),
      trialDays: Math.max(1, Number(trialDays)),
      graceDays: Math.max(0, Number(graceDays)),
      proTenantLimit: Math.max(1, Number(proTenantLimit)),
      trialTenantLimit: Math.max(1, Number(trialTenantLimit)),
      baseAllowedBuildings: Math.max(1, Number(baseAllowedBuildings)),
      proWhatsAppCredits: newProCredits,
      trialWhatsAppCredits: Math.max(0, Number(trialWhatsAppCredits)),
      founderWhatsapp: String(founderWhatsapp).replace(/\D/g, "").slice(-10) || DEFAULT_PLATFORM_CONFIG.founderWhatsapp,
      founderUpiVpa: String(founderUpiVpa).trim() || DEFAULT_PLATFORM_CONFIG.founderUpiVpa,
      founderUpiName: String(founderUpiName).trim() || DEFAULT_PLATFORM_CONFIG.founderUpiName,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    // 2. Save to primary master_controls document
    await setDoc(
      doc(db, "platform_admin", "config", "settings", "master_controls"),
      payload,
      { merge: true }
    );

    // 3. Backward compatibility mirror to capacity document
    await setDoc(
      doc(db, "platform_admin", "config", "settings", "capacity"),
      {
        proTenantLimit: payload.proTenantLimit,
        trialTenantLimit: payload.trialTenantLimit,
        defaultAllowedProperties: payload.baseAllowedBuildings,
        multiPropertyPrice: payload.multiPropertyPrice,
        tenantExtensionPrice: payload.tenantPackPrice,
        updatedAt: payload.updatedAt,
        updatedBy: payload.updatedBy,
      },
      { merge: true }
    );

    // 4. 🎁 Automated Additive Delta Appender for Existing Pro Accounts
    // If Pro credits limit was raised (e.g. 300 -> 350, delta = +50),
    // append only the difference to their existing wallet without wiping consumed usage.
    let affectedAccountsCount = 0;
    if (deltaCredits > 0) {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        for (const uDoc of usersSnap.docs) {
          const uData = uDoc.data();
          const sub = evaluateSubscription(uData);

          if (sub.isPro || uData.subscriptionPlan === "PRO" || uData.plan === "PRO" || uData.isPro === true) {
            affectedAccountsCount++;
            const propIds: string[] = Array.isArray(uData.propertyIds) && uData.propertyIds.length > 0
              ? uData.propertyIds
              : [uData.primaryPropertyId || uData.propertyId || "sunshine-pg"].filter(Boolean);

            for (const propId of propIds) {
              const walletRef = doc(db, `properties/${propId}/whatsapp/wallet`);
              const wSnap = await getDoc(walletRef);
              const curCredits = wSnap.exists() && typeof wSnap.data().credits === "number"
                ? wSnap.data().credits
                : prevProCredits;
              const newBalance = curCredits + deltaCredits;
              const existingTxs = wSnap.exists() && Array.isArray(wSnap.data().transactions)
                ? wSnap.data().transactions
                : [];

              const bonusTx = {
                id: `tx-delta-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                type: "PURCHASE",
                amount: deltaCredits,
                balanceAfter: newBalance,
                description: `🎁 Platform Pro allocation bonus: Quota increased from ${prevProCredits} to ${newProCredits} (+${deltaCredits} credits)`,
                timestamp: new Date().toISOString(),
                status: "DELIVERED",
              };

              await setDoc(
                walletRef,
                {
                  credits: newBalance,
                  transactions: [bonusTx, ...existingTxs].slice(0, 100),
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );
            }

            // Also increment custom limit on user doc
            const curUserLimit = typeof uData.whatsappCreditsLimit === "number"
              ? uData.whatsappCreditsLimit
              : prevProCredits;
            await setDoc(
              doc(db, "users", uDoc.id),
              {
                whatsappCreditsLimit: curUserLimit + deltaCredits,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
        }
      } catch (err) {
        console.warn("Warning executing Pro credit delta append:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: deltaCredits > 0
        ? `Master controls saved! Appended +${deltaCredits} WhatsApp credits to ${affectedAccountsCount} active Pro accounts.`
        : "Master platform controls saved & broadcast successfully!",
      config: payload,
      deltaCredits,
      affectedAccountsCount,
    });
  } catch (err: any) {
    console.error("POST /api/apex/master-controls error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to update master controls" },
      { status: 500 }
    );
  }
}
