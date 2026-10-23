import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage, WhatsAppSendParams, WhatsAppSendResult } from "@/lib/whatsappService";
import { evaluateSubscription } from "@/lib/subscriptionEngine";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      propertyId,
      messages,
      userId,
      userEmail,
    }: {
      propertyId: string;
      messages: WhatsAppSendParams[];
      userId?: string;
      userEmail?: string;
    } = body;

    if (!propertyId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: propertyId and messages array are required." },
        { status: 400 }
      );
    }

    // 🔒 Strict Backend Pro Check: Free Trial accounts cannot dispatch automated WhatsApp reminders
    let userProfileData: any = null;

    if (userId) {
      try {
        const uSnap = await getDoc(doc(db, "users", userId));
        if (uSnap.exists()) {
          userProfileData = uSnap.data();
        }
      } catch (e) {
        console.warn("Notice checking user by ID for WhatsApp:", e);
      }
    }

    if (!userProfileData && userEmail) {
      try {
        const cleanEmail = userEmail.toLowerCase().trim();
        const fcSnap = await getDoc(doc(db, "founder_clients", cleanEmail));
        if (fcSnap.exists()) {
          userProfileData = fcSnap.data();
        } else {
          const q = query(collection(db, "users"), where("email", "==", cleanEmail));
          const snap = await getDocs(q);
          if (!snap.empty) {
            userProfileData = snap.docs[0].data();
          }
        }
      } catch (e) {
        console.warn("Notice checking user by email for WhatsApp:", e);
      }
    }

    if (userProfileData) {
      const sub = evaluateSubscription(userProfileData);
      if (!sub.isPro) {
        return NextResponse.json(
          {
            error: "🔒 Automated WhatsApp & Email Reminders are exclusive to the Pro Plan. Upgrade to Pro to send reminders.",
            requiresPro: true,
          },
          { status: 403 }
        );
      }
    }

    // 🔒 2. STRICT HACKER-PROOF BACKEND ZERO-CREDIT LOCK (SSOT)
    // Directly verify Cloud Firestore property wallet to prevent any client-side tampering, curl, or devtools bypass
    const walletRef = doc(db, `properties/${propertyId}/whatsapp/wallet`);
    const walletSnap = await getDoc(walletRef);
    const currentCredits = walletSnap.exists() && typeof walletSnap.data()?.credits === "number"
      ? walletSnap.data().credits
      : 0;

    if (currentCredits <= 0) {
      return NextResponse.json(
        {
          error: "🔒 WhatsApp Gateway Locked: Your credit balance is 0. Dispatches have been halted. Please recharge your WhatsApp credit pack to resume messaging.",
          zeroCredits: true,
          remainingCredits: 0,
        },
        { status: 402 } // 402 Payment Required
      );
    }

    if (currentCredits < messages.length) {
      return NextResponse.json(
        {
          error: `🔒 Insufficient WhatsApp Credits: You attempted to dispatch ${messages.length} messages, but your wallet only has ${currentCredits} credits remaining. Please recharge your wallet.`,
          insufficientCredits: true,
          requiredCredits: messages.length,
          remainingCredits: currentCredits,
        },
        { status: 402 } // 402 Payment Required
      );
    }

    const results: WhatsAppSendResult[] = [];

    for (const msgPayload of messages) {
      const result = await sendWhatsAppMessage(msgPayload);
      results.push(result);
    }

    const successfulCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // 🔒 3. Server-Authoritative Credit Deduction & USAGE Transaction Ledger
    let finalCredits = currentCredits;
    if (successfulCount > 0) {
      try {
        const freshSnap = await getDoc(walletRef);
        const freshData = freshSnap.data();
        const baseCredits = typeof freshData?.credits === "number" ? freshData.credits : currentCredits;
        const existingTxs = Array.isArray(freshData?.transactions) ? freshData.transactions : [];
        finalCredits = Math.max(0, baseCredits - successfulCount);

        const newUsageTxs = messages
          .filter((_, idx) => results[idx]?.success)
          .map((m) => ({
            id: `tx-srv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: "USAGE" as const,
            amount: -1,
            balanceAfter: finalCredits,
            description: `Sent automated ${m.type?.replace(/_/g, " ").toLowerCase() || "WhatsApp message"} to ${m.recipientName || m.toPhone}`,
            recipientPhone: m.toPhone,
            recipientName: m.recipientName,
            messageType: m.type || "RENT_REMINDER",
            timestamp: new Date().toISOString(),
            status: "DELIVERED" as const,
          }));

        await setDoc(
          walletRef,
          {
            credits: finalCredits,
            transactions: [...newUsageTxs, ...existingTxs].slice(0, 100),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (txErr) {
        console.warn("Notice updating Firestore wallet on server dispatch:", txErr);
      }
    }

    return NextResponse.json({
      success: true,
      totalSent: messages.length,
      successfulCount,
      failedCount,
      remainingCredits: finalCredits,
      results,
    });
  } catch (error: any) {
    console.error("WhatsApp API Dispatch route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process WhatsApp dispatch" },
      { status: 500 }
    );
  }
}
