import { NextRequest, NextResponse } from "next/server";
import { sendBrevoEmail, BrevoSendParams, BrevoSendResult, isBrevoQuotaError } from "@/lib/brevoService";
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
      messages: BrevoSendParams[];
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
      const isMasterAdmin = userProfileData.role === "master_admin";
      if (!sub.canAccessProFeatures && !isMasterAdmin) {
        return NextResponse.json(
          {
            error: "🔒 Automated Email Reminders require an active trial or Pro Plan. Upgrade to Pro to send reminders.",
            requiresPro: true,
          },
          { status: 403 }
        );
      }
    }

    // 🔍 2. Resolve Custom Brevo Gateway Configuration
    // Check if property or client has an active custom Brevo key and founder permission
    let customGatewayConfig: {
      apiKey: string;
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
          pData?.customEmailGateway?.apiKey
        ) {
          customGatewayConfig = {
            apiKey: pData.customEmailGateway.apiKey,
            senderEmail: pData.customEmailGateway.senderEmail,
            senderName: pData.customEmailGateway.senderName,
          };
        }
      }
    } catch (err) {
      console.warn("Notice reading property email gateway settings:", err);
    }

    // 🚀 3. Execute Dispatches with Graceful Hot-Failover & Quota Detection
    const results: BrevoSendResult[] = [];
    let quotaFailoverOccurred = false;

    for (const msgPayload of messages) {
      let finalResult: BrevoSendResult;

      // If custom gateway is configured, try sending via client's Brevo account first
      if (customGatewayConfig) {
        finalResult = await sendBrevoEmail({
          ...msgPayload,
          customCredentials: customGatewayConfig,
          replyToEmail: cleanEmail || msgPayload.replyToEmail,
        });

        // If client's Brevo account encounters a quota/credit limit exhaustion:
        if (!finalResult.success && isBrevoQuotaError(finalResult.error)) {
          console.warn(
            `⚠️ Client custom Brevo quota exceeded for ${propertyId}. Triggering hot-failover to TenoPilot Central Backup.`
          );
          quotaFailoverOccurred = true;

          // Hot-Failover: Instant fallback to TenoPilot Central Brevo!
          const fallbackResult = await sendBrevoEmail({
            ...msgPayload,
            customCredentials: undefined, // uses platform central Brevo
            replyToEmail: cleanEmail || msgPayload.replyToEmail,
          });

          finalResult = {
            ...fallbackResult,
            fallbackUsed: true,
          };
        }
      } else {
        // Platform Central Brevo Default
        finalResult = await sendBrevoEmail({
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

    return NextResponse.json({
      success: true,
      totalSent: messages.length,
      successfulCount,
      failedCount,
      quotaFailoverOccurred,
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
