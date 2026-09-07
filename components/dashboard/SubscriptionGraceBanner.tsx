"use client";

import { useAuth } from "@/providers/AuthProvider";
import { evaluateSubscription } from "@/lib/subscriptionEngine";
import { usePlatformConfig } from "@/lib/usePlatformConfig";
import { Sparkles, Clock, AlertTriangle, ChevronRight, X, Zap } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export function SubscriptionGraceBanner({ propertyId: propId }: { propertyId?: string }) {
  const { profile } = useAuth();
  const { config: platformConfig } = usePlatformConfig();
  const params = useParams();
  const propertyId = propId || (params?.propertyId as string) || "sunshine-pg";
  const [dismissed, setDismissed] = useState(false);

  if (!profile || dismissed) return null;

  const sub = evaluateSubscription(profile);

  const isPendingVerification = !!profile.pendingPaymentRequest;

  // Only display if pending verification, or in Trial, Grace Period, 7-Day Pre-Expiry window, or Expired
  if (!isPendingVerification && !sub.inGracePeriod && !sub.isPreExpiry && sub.status !== "EXPIRED" && sub.status !== "TRIAL") {
    return null;
  }

  const isTrial = !isPendingVerification && sub.status === "TRIAL";
  const isGrace = !isPendingVerification && sub.inGracePeriod;
  const isPreExpiry = !isPendingVerification && sub.isPreExpiry;
  const isExpired = !isPendingVerification && sub.status === "EXPIRED";

  return (
    <div
      className={`w-full px-4 py-2.5 transition-all flex items-center justify-between gap-3 text-xs border-b ${
        isPendingVerification
          ? "bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200"
          : isTrial
          ? "bg-[#fff8f6] border-[#eedad0] text-[#554339]"
          : isGrace
          ? "bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200"
          : isPreExpiry
          ? "bg-blue-500/15 border-blue-500/30 text-blue-900 dark:text-blue-200"
          : "bg-rose-500/15 border-rose-500/30 text-rose-900 dark:text-rose-200"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isPendingVerification ? (
          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            <Clock className="w-3.5 h-3.5 animate-spin" />
          </div>
        ) : isTrial ? (
          <div className="p-1 rounded-lg bg-amber-500/20 text-[#c2652a] shrink-0">
            <Zap className="w-3.5 h-3.5" />
          </div>
        ) : isGrace ? (
          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
          </div>
        ) : isPreExpiry ? (
          <div className="p-1 rounded-lg bg-blue-500/20 text-blue-700 dark:text-blue-300 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div className="p-1 rounded-lg bg-rose-500/20 text-rose-800 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        )}

        <p className="truncate text-[11px] sm:text-xs">
          <strong>
            {isPendingVerification
              ? `⏳ Payment Verification Pending`
              : isTrial
              ? `⚡ ${platformConfig.trialDays}-Day Free Express Trial: ${sub.daysRemaining} Days Remaining`
              : isGrace
              ? `⏳ ${platformConfig.graceDays}-Day Pro Grace Period Active (${sub.graceDaysRemaining} Days Left)`
              : isPreExpiry
              ? `💎 Pro Plan Renewal Due in ${sub.daysRemaining} Days`
              : `⚠️ Pro Subscription Expired`}
            :
          </strong>{" "}
          <span className="opacity-90">
            {isPendingVerification
              ? `Your payment proof has been submitted and is under review by the founder. Pro unlocks instantly upon verification.`
              : isTrial
              ? `Enjoying full free trial access. Upgrade to Pro for ₹${platformConfig.proMonthlyPrice}/mo to unlock unlimited features.`
              : isGrace
              ? `Your Pro cycle ended on ${sub.expiryDateFormatted}. All operations remain active.`
              : isPreExpiry
              ? `Renews on ${sub.expiryDateFormatted}. Early renewals stack seamlessly.`
              : `Renew now to restore full multi-property automation.`}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/p/${propertyId}/subscription`}
          className={`px-3 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all shadow-2xs ${
            isPendingVerification
              ? "bg-amber-600 hover:bg-amber-700 text-white animate-pulse"
              : isTrial
              ? "bg-[#c2652a] hover:bg-[#964407] text-white"
              : isGrace
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : isPreExpiry
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-rose-600 hover:bg-rose-700 text-white"
          }`}
        >
          <span>{isPendingVerification ? "Check Status" : isTrial ? `Upgrade to Pro (₹${platformConfig.proMonthlyPrice})` : isGrace ? `Renew Now (₹${platformConfig.proMonthlyPrice})` : isPreExpiry ? "Renew Early" : "Reactivate"}</span>
          <ChevronRight className="w-3 h-3" />
        </Link>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
