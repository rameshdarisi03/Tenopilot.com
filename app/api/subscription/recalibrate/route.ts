import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { evaluateSubscription } from "@/lib/subscriptionEngine";
import { getStoredPlatformConfig } from "@/lib/platformConfig";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json({ success: false, message: "propertyId is required." }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ success: false, message: "Firestore database not available." }, { status: 500 });
    }

    const cleanPropId = String(propertyId).trim();

    // 1. Fetch Property Doc
    const propRef = doc(db, "properties", cleanPropId);
    const propSnap = await getDoc(propRef);
    let ownerUid = "";
    let ownerEmail = "";
    let propertyName = cleanPropId;

    if (propSnap.exists()) {
      const pData = propSnap.data();
      ownerUid = pData.ownerUid || "";
      ownerEmail = (pData.ownerEmail || "").toLowerCase().trim();
      propertyName = pData.name || pData.propertyName || cleanPropId;
    }

    // 2. Fetch User Doc to evaluate subscription status
    let userData: any = null;
    if (ownerUid) {
      const uSnap = await getDoc(doc(db, "users", ownerUid));
      if (uSnap.exists()) userData = uSnap.data();
    }
    if (!userData && ownerEmail) {
      const uQ = query(collection(db, "users"), where("email", "==", ownerEmail));
      const uSnap = await getDocs(uQ);
      if (!uSnap.empty) userData = uSnap.docs[0].data();
    }

    const sub = evaluateSubscription(userData);
    const platformConfig = getStoredPlatformConfig();

    // If account has an active Pro subscription, determine entitlement quotas
    const proWAQuota = platformConfig.proWhatsAppCredits || 1000;
    const emailMultiplier = Number(userData?.emailMultiplier) || platformConfig.emailMultiplier || 3;
    const proEmailQuota = proWAQuota * emailMultiplier;
    const nowIso = new Date().toISOString();

    // 3. Recalibrate WhatsApp Wallet
    const waRef = doc(db, `properties/${cleanPropId}/whatsapp/wallet`);
    const waSnap = await getDoc(waRef);
    const waData = waSnap.exists() ? waSnap.data() : {};
    const existingWaTxs = Array.isArray(waData?.transactions) ? waData.transactions : [];

    let consumedWA = 0;
    existingWaTxs.forEach((tx: any) => {
      if (tx.type === "USAGE" && typeof tx.amount === "number") {
        consumedWA += Math.abs(tx.amount);
      }
    });

    const netWACredits = sub.isPro ? Math.max(0, proWAQuota - consumedWA) : (typeof waData.credits === "number" ? waData.credits : 25);

    const newWaTx = {
      id: `tx-wa-recal-${Date.now()}`,
      type: "PURCHASE",
      amount: netWACredits,
      balanceAfter: netWACredits,
      description: `Pro Plan Allocation (+${netWACredits} WhatsApp Credits after deducting ${consumedWA} used)`,
      timestamp: nowIso,
      status: "DELIVERED",
    };

    const newWaBatch = {
      id: `batch-wa-recal-${Date.now()}`,
      cycleId: `cycle-${Date.now()}`,
      source: "MONTHLY_QUOTA",
      initialCredits: proWAQuota,
      remainingCredits: netWACredits,
      grantedAt: nowIso,
      expiresAt: new Date(Date.now() + 120 * 86400000).toISOString(),
    };

    await setDoc(
      waRef,
      {
        credits: netWACredits,
        batches: [newWaBatch, ...(Array.isArray(waData.batches) ? waData.batches : [])],
        transactions: [newWaTx, ...existingWaTxs].slice(0, 100),
        updatedAt: nowIso,
        updatedBy: "Subscription Recalibration Engine",
      },
      { merge: true }
    );

    // 4. Recalibrate Email Wallet
    const emailRef = doc(db, `properties/${cleanPropId}/email/wallet`);
    const emailSnap = await getDoc(emailRef);
    const emailData = emailSnap.exists() ? emailSnap.data() : {};
    const existingEmailTxs = Array.isArray(emailData?.transactions) ? emailData.transactions : [];

    let consumedEmail = 0;
    existingEmailTxs.forEach((tx: any) => {
      if (tx.type === "USAGE" && typeof tx.amount === "number") {
        consumedEmail += Math.abs(tx.amount);
      }
    });

    const netEmailCredits = sub.isPro ? Math.max(0, proEmailQuota - consumedEmail) : (typeof emailData.credits === "number" ? emailData.credits : 75);

    const newEmailTx = {
      id: `tx-email-recal-${Date.now()}`,
      type: "PURCHASE",
      amount: netEmailCredits,
      balanceAfter: netEmailCredits,
      description: `Pro Plan Email Allocation (+${netEmailCredits} Email Credits after deducting ${consumedEmail} used)`,
      timestamp: nowIso,
      status: "DELIVERED",
    };

    await setDoc(
      emailRef,
      {
        credits: netEmailCredits,
        transactions: [newEmailTx, ...existingEmailTxs].slice(0, 100),
        updatedAt: nowIso,
        updatedBy: "Subscription Recalibration Engine",
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      propertyId: cleanPropId,
      propertyName,
      isPro: sub.isPro,
      whatsappCredits: netWACredits,
      consumedWA,
      emailCredits: netEmailCredits,
      consumedEmail,
      message: `Successfully recalibrated ${propertyName} wallet: ${netWACredits} WhatsApp Credits (${consumedWA} consumed) & ${netEmailCredits} Email Credits!`,
    });
  } catch (error: any) {
    console.error("Error in /api/subscription/recalibrate:", error);
    return NextResponse.json({ success: false, message: error.message || "Recalibration failed." }, { status: 500 });
  }
}
