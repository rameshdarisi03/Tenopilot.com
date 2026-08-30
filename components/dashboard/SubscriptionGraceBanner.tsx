"use client";

import { useAuth } from "@/providers/AuthProvider";
import { evaluateSubscription } from "@/lib/subscriptionEngine";
import { Sparkles, Clock, AlertTriangle, ChevronRight, X } from "lucide-react";
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

  // Only display if in Grace Period or within 7-Day Pre-Expiry window or Expired
  if (!sub.inGracePeriod && !sub.isPreExpiry && sub.status !== "EXPIRED") {
    return null;
  }

  const isGrace = sub.inGracePeriod;
  const isPreExpiry = sub.isPreExpiry;
  const isExpired = sub.status === "EXPIRED";

  return (
    <div
      className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-medium border-b transition-all ${
        isGrace
          ? "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 text-amber-950 border-amber-300 dark:text-amber-200 dark:border-amber-500/30"
          : isPreExpiry
          ? "bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-blue-500/15 text-blue-950 border-blue-200 dark:text-blue-200 dark:border-blue-500/30"
          : "bg-gradient-to-r from-rose-500/20 via-red-500/20 to-rose-500/20 text-rose-950 border-rose-300 dark:text-rose-200 dark:border-rose-500/30"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isGrace ? (
          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
          </div>
        ) : isPreExpiry ? (
          <div className="p-1 rounded-lg bg-blue-500/20 text-blue-800 dark:text-blue-300 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div className="p-1 rounded-lg bg-rose-500/20 text-rose-800 dark:text-rose-300 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        )}

        <p className="truncate text-[11px] sm:text-xs">
          <strong>
            {isGrace
              ? `⏳ 7-Day Pro Grace Period Active (${sub.graceDaysRemaining} Days Left)`
              : isPreExpiry
              ? `💎 Pro Plan Renewal Due in ${sub.daysRemaining} Days`
              : `⚠️ Pro Subscription Expired`}
            :
          </strong>{" "}
          <span className="opacity-90">
            {isGrace
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
            isGrace
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : isPreExpiry
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-rose-600 hover:bg-rose-700 text-white"
          }`}
        >
          <span>{isGrace ? "Renew Now (₹999)" : isPreExpiry ? "Renew Early" : "Reactivate"}</span>
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
