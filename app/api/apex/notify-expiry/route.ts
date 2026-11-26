import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sendWhatsAppMessage } from "@/lib/whatsappService";

export const dynamic = "force-dynamic";

function formatDaysLeftLabel(status?: string, daysRemaining?: number): string {
  if (status === "EXPIRED") return "already expired";
  if (status === "GRACE_PERIOD") return "in grace period";
  const d = Number(daysRemaining ?? 3);
  if (d <= 0) return "today";
  if (d === 1) return "in 1 day";
  return `in ${d} days`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      email,
      propertyId,
      propertyName,
      recipientName,
      phone,
      expiryDate,
      daysRemaining,
      subscriptionStatus,
    } = body;

    if (!phone || String(phone).replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { success: false, message: "Owner mobile number is missing or invalid." },
        { status: 400 }
      );
    }

    const daysLeftText = formatDaysLeftLabel(subscriptionStatus, daysRemaining);
    const formattedExpiry = expiryDate || "upcoming billing date";

    const result = await sendWhatsAppMessage({
      toPhone: String(phone),
      recipientName: recipientName || "Partner",
      propertyId: propertyId || "default",
      propertyName: propertyName || "Your PG Workspace",
      type: "SUBSCRIPTION_EXPIRY_REMINDER",
      params: {
        expiryDate: formattedExpiry,
        daysLeftText,
      },
    });

    const nowIso = new Date().toISOString();

    if (result.success && db) {
      const updatePayload: Record<string, any> = {
        lastExpiryNotifiedAt: nowIso,
        lastExpiryNotifiedMode: result.mode,
        expiryReminderCount: increment(1),
      };

      if (userId) {
        await setDoc(doc(db, "users", String(userId)), updatePayload, { merge: true }).catch((e) =>
          console.warn("Notice stamping lastExpiryNotifiedAt on user doc:", e)
        );
      }

      if (email) {
        const cleanEmail = String(email).toLowerCase().trim();
        await setDoc(doc(db, "founder_clients", cleanEmail), updatePayload, { merge: true }).catch((e) =>
          console.warn("Notice stamping lastExpiryNotifiedAt on founder_client doc:", e)
        );
      }
    }

    return NextResponse.json({
      success: result.success,
      result,
      lastExpiryNotifiedAt: result.success ? nowIso : undefined,
      message: result.success
        ? `WhatsApp expiry alert sent (${result.mode})`
        : result.error || "Failed to send WhatsApp expiry alert",
    });
  } catch (err: any) {
    console.error("POST /api/apex/notify-expiry error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
