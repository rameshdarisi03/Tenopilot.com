import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sendWhatsAppMessage } from "@/lib/whatsappService";
import { GET as scanAccountsGet } from "@/app/api/apex/scan-accounts/route";
import type { ScannedAccountRecord } from "@/app/api/apex/scan-accounts/route";

export const dynamic = "force-dynamic";

function formatDaysLeftLabel(status?: string, daysRemaining?: number): string {
  if (status === "EXPIRED") return "already expired";
  if (status === "GRACE_PERIOD") return "in grace period";
  const d = Number(daysRemaining ?? 3);
  if (d <= 0) return "today";
  if (d === 1) return "in 1 day";
  return `in ${d} days`;
}

async function runExpiryReminderJob(req: NextRequest) {
  try {
    // Optional CRON_SECRET verification if configured in Vercel env vars
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }
    }

    const scanRes = await scanAccountsGet(req);
    const scanData = await scanRes.json();

    if (!scanData?.success || !Array.isArray(scanData.accounts)) {
      return NextResponse.json(
        { success: false, message: "Failed to scan accounts for expiry check" },
        { status: 500 }
      );
    }

    const accounts: ScannedAccountRecord[] = scanData.accounts;
    const sentResults: any[] = [];
    let skippedCount = 0;

    for (const acc of accounts) {
      const isWithin3Days =
        (acc.subscriptionStatus === "PRO_PRE_EXPIRY" ||
          acc.subscriptionStatus === "ACTIVE_PRO" ||
          acc.subscriptionStatus === "TRIAL") &&
        acc.trialDaysLeft <= 3 &&
        acc.trialDaysLeft >= 0;

      const cleanDigits = (acc.phone || "").replace(/\D/g, "");
      if (!isWithin3Days || cleanDigits.length < 10) {
        skippedCount++;
        continue;
      }

      const cycleKey = acc.planExpiresAt || acc.expiryDateFormatted || acc.plan || "current_cycle";
      if (acc.expiryReminder3dSentFor === cycleKey) {
        skippedCount++;
        continue;
      }

      const primaryPropId = (acc.propertyIds && acc.propertyIds[0]) || "default";
      const daysLeftText = formatDaysLeftLabel(acc.subscriptionStatus, acc.trialDaysLeft);

      const res = await sendWhatsAppMessage({
        toPhone: acc.phone,
        recipientName: acc.displayName || "Partner",
        propertyId: primaryPropId,
        propertyName: acc.primaryPropertyName || "Your PG Workspace",
        type: "SUBSCRIPTION_EXPIRY_REMINDER",
        params: {
          expiryDate: acc.expiryDateFormatted || "upcoming billing date",
          daysLeftText,
        },
      });

      const nowIso = new Date().toISOString();

      if (res.success && db) {
        const updatePayload: Record<string, any> = {
          expiryReminder3dSentFor: cycleKey,
          lastExpiryNotifiedAt: nowIso,
          lastExpiryNotifiedMode: res.mode,
          expiryReminderCount: increment(1),
        };

        if (acc.userId) {
          await setDoc(doc(db, "users", acc.userId), updatePayload, { merge: true }).catch(() => {});
        }
        if (acc.email) {
          await setDoc(doc(db, "founder_clients", acc.email.toLowerCase().trim()), updatePayload, {
            merge: true,
          }).catch(() => {});
        }
      }

      sentResults.push({
        email: acc.email,
        phone: acc.phone,
        daysLeft: acc.trialDaysLeft,
        success: res.success,
        mode: res.mode,
        error: res.error,
      });
    }

    return NextResponse.json({
      success: true,
      checkedCount: accounts.length,
      sentCount: sentResults.filter((r) => r.success).length,
      failedCount: sentResults.filter((r) => !r.success).length,
      skippedCount,
      results: sentResults,
    });
  } catch (err: any) {
    console.error("Cron subscription-expiry error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Cron execution error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return runExpiryReminderJob(req);
}

export async function POST(req: NextRequest) {
  return runExpiryReminderJob(req);
}
