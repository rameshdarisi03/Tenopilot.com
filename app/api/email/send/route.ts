import { NextRequest, NextResponse } from "next/server";
import { sendSESEmail, SESSendParams, SESSendResult, isSESQuotaError } from "@/lib/sesService";
import { evaluateSubscription } from "@/lib/subscriptionEngine";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, increment } from "firebase/firestore";
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
      messages: SESSendParams[];
      userId?: string;
      userEmail?: string;
    } = body;

    if (!propertyId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: propertyId and messages array are required." },
        { status: 400 }
      );
    }

    // 🔒 1. Strict Backend Pro Check: Free Trial accounts cannot dispatch automated reminders
    let userProfileData: any = null;
    const cleanEmail = (userEmail || "").toLowerCase().trim();

    if (userId) {
      try {
        const uSnap = await getDoc(doc(db, "users", userId));
        if (uSnap.exists()) {
          userProfileData = uSnap.data();
        }
      } catch (e) {
        console.warn("Notice checking user by ID for Email:", e);
      }
    }

    if (!userProfileData && cleanEmail) {
      try {
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
        console.warn("Notice checking user by email for Email:", e);
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

    // 🔍 2. Resolve Custom Email Gateway Configuration & Authoritative Firestore Email Wallet Check
    let customGatewayConfig: {
      apiKey?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      region?: string;
      senderEmail?: string;
      senderName?: string;
    } | null = null;

    let isCustomGatewayAllowed = false;
    if (userProfileData?.allowedCustomEmailGateway) {
      isCustomGatewayAllowed = true;
    }

    try {
      const propSnap = await getDoc(doc(db, `properties/${propertyId}/settings/config`));
      if (propSnap.exists()) {
        const pData = propSnap.data();
        if (
          isCustomGatewayAllowed &&
          pData?.customEmailGateway?.enabled &&
          (pData?.customEmailGateway?.apiKey || pData?.customEmailGateway?.accessKeyId)
        ) {
          customGatewayConfig = {
            apiKey: pData.customEmailGateway.apiKey,
            accessKeyId: pData.customEmailGateway.accessKeyId,
            secretAccessKey: pData.customEmailGateway.secretAccessKey,
            region: pData.customEmailGateway.region,
            senderEmail: pData.customEmailGateway.senderEmail,
            senderName: pData.customEmailGateway.senderName,
          };
        }
      }
    } catch (err) {
      console.warn("Notice reading property email gateway settings:", err);
    }

    // 🔒 2b. STRICT BACKEND ZERO-CREDIT LOCK (SSOT)
    // If not using client's private BYO Brevo/SMTP gateway, check authoritative Firestore email wallet
    const emailWalletRef = doc(db, `properties/${propertyId}/email/wallet`);
    const emailWalletSnap = await getDoc(emailWalletRef);
    const currentEmailCredits = emailWalletSnap.exists() && typeof emailWalletSnap.data()?.credits === "number"
      ? emailWalletSnap.data().credits
      : 0;

    if (!customGatewayConfig) {
      if (currentEmailCredits <= 0) {
        return NextResponse.json(
          {
            error: "🔒 Email Gateway Locked: Your email credit balance is 0. Dispatches have been halted. Please recharge your email credit pack to resume messaging.",
            zeroCredits: true,
            remainingCredits: 0,
          },
          { status: 402 } // 402 Payment Required
        );
      }

      if (currentEmailCredits < messages.length) {
        return NextResponse.json(
          {
            error: `🔒 Insufficient Email Credits: You attempted to dispatch ${messages.length} emails, but your wallet only has ${currentEmailCredits} credits remaining. Please recharge your wallet.`,
            insufficientCredits: true,
            requiredCredits: messages.length,
            remainingCredits: currentEmailCredits,
          },
          { status: 402 } // 402 Payment Required
        );
      }
    }

    // 🚀 3. Execute Dispatches with Graceful Hot-Failover & Sandbox Detection
    const results: SESSendResult[] = [];
    let quotaFailoverOccurred = false;

    for (const msgPayload of messages) {
      let finalResult: SESSendResult;

      // If custom gateway is configured, try sending via client's credentials first
      if (customGatewayConfig) {
        finalResult = await sendSESEmail({
          ...msgPayload,
          customCredentials: customGatewayConfig,
          replyToEmail: cleanEmail || msgPayload.replyToEmail,
        });

        // If client's gateway encounters a quota/credit limit exhaustion:
        if (!finalResult.success && isSESQuotaError(finalResult.error)) {
          console.warn(
            `⚠️ Client custom email gateway quota/restriction for ${propertyId}. Triggering hot-failover to TenoPilot Central SES.`
          );
          quotaFailoverOccurred = true;

          // Hot-Failover: Instant fallback to TenoPilot Central Amazon SES!
          const fallbackResult = await sendSESEmail({
            ...msgPayload,
            customCredentials: undefined, // uses platform central SES
            replyToEmail: cleanEmail || msgPayload.replyToEmail,
          });

          finalResult = {
            ...fallbackResult,
            fallbackUsed: true,
          };
        }
      } else {
        // Platform Central Amazon SES Default
        finalResult = await sendSESEmail({
          ...msgPayload,
          customCredentials: undefined,
          replyToEmail: cleanEmail || msgPayload.replyToEmail,
        });
      }

      results.push(finalResult);
    }

    // 📊 4. Telemetry: If Quota Failover Occurred, record in founder_clients for Founder Visibility
    if (quotaFailoverOccurred && cleanEmail) {
      try {
        const fcRef = doc(db, "founder_clients", cleanEmail);
        const fcSnap = await getDoc(fcRef);
        const existingFallbacks = fcSnap.exists() ? fcSnap.data()?.fallbackEmailCount || 0 : 0;

        await setDoc(
          fcRef,
          {
            emailGatewayAlert: "QUOTA_EXCEEDED",
            fallbackEmailCount: existingFallbacks + results.filter((r) => r.fallbackUsed).length,
            lastEmailFallbackAt: new Date().toISOString(),
            lastEmailGatewayError: "Client custom Brevo quota exceeded. Central failover activated.",
          },
          { merge: true }
        );
      } catch (telemetryErr) {
        console.warn("Failed updating founder quota telemetry:", telemetryErr);
      }
    }

    const successfulCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // 🔒 5. Server-Authoritative Email Credit Deduction & USAGE Ledger
    // Deduct 1 credit for each message dispatched through TenoPilot Central SES (or fallback from client gateway)
    let finalEmailCredits = currentEmailCredits;
    const centralDispatchesCount = results.filter((r) => r.success && (!customGatewayConfig || r.fallbackUsed)).length;

    if (centralDispatchesCount > 0) {
      try {
        const freshSnap = await getDoc(emailWalletRef);
        const freshData = freshSnap.data();
        const baseCredits = typeof freshData?.credits === "number" ? freshData.credits : currentEmailCredits;
        const existingTxs = Array.isArray(freshData?.transactions) ? freshData.transactions : [];
        finalEmailCredits = Math.max(0, baseCredits - centralDispatchesCount);

        const newUsageTxs = messages
          .filter((_, idx) => results[idx]?.success && (!customGatewayConfig || results[idx]?.fallbackUsed))
          .map((m) => ({
            id: `tx-email-srv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: "USAGE" as const,
            amount: -1,
            balanceAfter: finalEmailCredits,
            description: `Sent automated ${m.type?.replace(/_/g, " ").toLowerCase() || "email"} to ${m.recipientName || m.toEmail}`,
            recipientEmail: m.toEmail,
            recipientName: m.recipientName,
            messageType: m.type || "RENT_REMINDER",
            timestamp: new Date().toISOString(),
            status: "DELIVERED" as const,
          }));

        await setDoc(
          emailWalletRef,
          {
            credits: finalEmailCredits,
            transactions: [...newUsageTxs, ...existingTxs].slice(0, 100),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (txErr) {
        console.warn("Notice updating Firestore Email wallet on server dispatch:", txErr);
      }
    }

    return NextResponse.json({
      success: true,
      totalSent: messages.length,
      successfulCount,
      failedCount,
      quotaFailoverOccurred,
      remainingCredits: finalEmailCredits,
      results,
    });
  } catch (error: any) {
    console.error("Email API Dispatch route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process Email dispatch" },
      { status: 500 }
    );
  }
}
