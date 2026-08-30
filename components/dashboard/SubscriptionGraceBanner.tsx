"use client";

import { useAuth } from "@/providers/AuthProvider";
import { evaluateSubscription } from "@/lib/subscriptionEngine";
import { Sparkles, Clock, AlertTriangle, ChevronRight, X, Zap } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export function SubscriptionGraceBanner({ propertyId: propId }: { propertyId?: string }) {
  const { profile } = useAuth();
  const params = useParams();
  const propertyId = propId || (params?.propertyId as string) || "sunshine-pg";
  const [dismissed, setDismissed] = useState(false);

  if (!profile || dismissed) return null;

  const sub = evaluateSubscription(profile);

  // Only display if in Trial, Grace Period, 7-Day Pre-Expiry window, or Expired
  if (!sub.inGracePeriod && !sub.isPreExpiry && sub.status !== "EXPIRED" && sub.status !== "TRIAL") {
    return null;
  }

  const isTrial = sub.status === "TRIAL";
  const isGrace = sub.inGracePeriod;
  const isPreExpiry = sub.isPreExpiry;
  const isExpired = sub.status === "EXPIRED";

  return (
    <div
      className={`w-full px-4 py-2 flex items-center justify-between gap-3 text-xs font-medium border-b transition-all ${
        isTrial
          ? "bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 text-amber-950 border-amber-300/70"
          : isGrace
          ? "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 text-amber-950 border-amber-300"
          : isPreExpiry
          ? "bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-blue-500/15 text-blue-950 border-blue-200"
          : "bg-gradient-to-r from-rose-500/20 via-red-500/20 to-rose-500/20 text-rose-950 border-rose-300"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isTrial ? (
          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-800 shrink-0">
            <Zap className="w-3.5 h-3.5 text-[#c2652a]" />
          </div>
        ) : isGrace ? (
          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-800 shrink-0">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
          </div>
        ) : isPreExpiry ? (
          <div className="p-1 rounded-lg bg-blue-500/20 text-blue-800 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div className="p-1 rounded-lg bg-rose-500/20 text-rose-800 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        )}

        <p className="truncate text-[11px] sm:text-xs">
          <strong>
            {isTrial
              ? `⚡ 14-Day Free Express Trial: ${sub.daysRemaining} Days Remaining`
              : isGrace
              ? `⏳ 7-Day Pro Grace Period Active (${sub.graceDaysRemaining} Days Left)`
              : isPreExpiry
              ? `💎 Pro Plan Renewal Due in ${sub.daysRemaining} Days`
              : `⚠️ Pro Subscription Expired`}
            :
          </strong>{" "}
          <span className="opacity-90">
            {isTrial
              ? `Enjoying full free trial access. Upgrade to Pro for ₹999/mo to unlock unlimited features.`
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
            isTrial
              ? "bg-[#c2652a] hover:bg-[#964407] text-white"
              : isGrace
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : isPreExpiry
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-rose-600 hover:bg-rose-700 text-white"
          }`}
        >
          <span>{isTrial ? "Upgrade to Pro (₹999)" : isGrace ? "Renew Now (₹999)" : isPreExpiry ? "Renew Early" : "Reactivate"}</span>
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
