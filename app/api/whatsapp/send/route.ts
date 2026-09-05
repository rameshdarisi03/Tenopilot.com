import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage, WhatsAppSendParams, WhatsAppSendResult } from "@/lib/whatsappService";
import { evaluateSubscription } from "@/lib/subscriptionEngine";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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

    const results: WhatsAppSendResult[] = [];

    for (const msgPayload of messages) {
      const result = await sendWhatsAppMessage(msgPayload);
      results.push(result);
    }

    const successfulCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      totalSent: messages.length,
      successfulCount,
      failedCount,
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
