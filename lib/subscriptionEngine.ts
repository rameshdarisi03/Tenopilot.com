/**
 * TenoPilot Central Subscription & Billing Engine (SSOT)
 * Handles:
 * - 14-Day Free Trial
 * - Active Pro Subscription (Monthly & Annual)
 * - 7-Day Pre-Expiry Advance Reminder Window
 * - 7-Day Trusted Pro Grace Period (100% uninterrupted access)
 * - Seamless Stacked Renewals (no lost days on early renewal)
 */

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE_PRO"
  | "PRO_PRE_EXPIRY"
  | "GRACE_PERIOD"
  | "EXPIRED"
  | "SUSPENDED";

export interface EvaluatedSubscription {
  status: SubscriptionStatus;
  plan: string;
  isPro: boolean;
  daysRemaining: number;
  graceDaysRemaining: number;
  isPreExpiry: boolean; // True if within 7 days before expiry
  inGracePeriod: boolean; // True if expired but within 7 days grace
  canAccessProFeatures: boolean;
  expiryDateFormatted: string;
  badgeLabel: string;
  badgeColor: string;
  notificationMessage?: string;
  bannerMessage?: string;
}

const GRACE_PERIOD_DAYS = 7;
const PRE_EXPIRY_ALERT_DAYS = 7;

export function evaluateSubscription(userProfile: any): EvaluatedSubscription {
  if (!userProfile) {
    return {
      status: "TRIAL",
      plan: "14_DAY_TRIAL",
      isPro: false,
      daysRemaining: 14,
      graceDaysRemaining: 0,
      isPreExpiry: false,
      inGracePeriod: false,
      canAccessProFeatures: true,
      expiryDateFormatted: "14 Days",
      badgeLabel: "⚡ 14-Day Free Trial",
      badgeColor: "amber",
    };
  }

  if (userProfile.status === "SUSPENDED") {
    return {
      status: "SUSPENDED",
      plan: userProfile.plan || "PRO_MONTHLY",
      isPro: false,
      daysRemaining: 0,
      graceDaysRemaining: 0,
      isPreExpiry: false,
      inGracePeriod: false,
      canAccessProFeatures: false,
      expiryDateFormatted: "Suspended",
      badgeLabel: "🔴 Account Suspended",
      badgeColor: "rose",
    };
  }

  const now = Date.now();
  const isProPlan =
    userProfile.plan === "PRO_MONTHLY" ||
    userProfile.plan === "PRO_ANNUAL" ||
    userProfile.plan === "VIP_PASS" ||
    userProfile.subscriptionPlan === "pro";

  // If Pro Plan with explicit planExpiresAt
  if (isProPlan && userProfile.planExpiresAt) {
    const expiryTime = new Date(userProfile.planExpiresAt).getTime();
    const expiryDateFormatted = new Date(expiryTime).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const msDiff = expiryTime - now;
    const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

    // 1. Plan is actively valid
    if (daysRemaining > 0) {
      const isPreExpiry = daysRemaining <= PRE_EXPIRY_ALERT_DAYS;

      return {
        status: isPreExpiry ? "PRO_PRE_EXPIRY" : "ACTIVE_PRO",
        plan: userProfile.plan || "PRO_MONTHLY",
        isPro: true,
        daysRemaining: daysRemaining,
        graceDaysRemaining: 0,
        isPreExpiry: isPreExpiry,
        inGracePeriod: false,
        canAccessProFeatures: true,
        expiryDateFormatted: expiryDateFormatted,
        badgeLabel: isPreExpiry
          ? `💎 Pro (Renews in ${daysRemaining}d)`
          : `💎 Pro Active`,
        badgeColor: isPreExpiry ? "amber" : "emerald",
        notificationMessage: isPreExpiry
          ? `Renewal Notice: Your Pro plan will renew in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""} (on ${expiryDateFormatted}). Early renewals stack automatically without losing any days.`
          : undefined,
        bannerMessage: isPreExpiry
          ? `💎 Pro Plan Renewal: Your cycle ends on ${expiryDateFormatted} (${daysRemaining} days left). Renew now to seamlessly extend your plan.`
          : undefined,
      };
    }

    // 2. Plan has passed expiry — check 7-Day Trusted Grace Period
    const graceExpiryTime = expiryTime + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    const graceMsDiff = graceExpiryTime - now;
    const graceDaysRemaining = Math.max(0, Math.ceil(graceMsDiff / (1000 * 60 * 60 * 24)));

    if (graceDaysRemaining > 0) {
      const graceEndFormatted = new Date(graceExpiryTime).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      return {
        status: "GRACE_PERIOD",
        plan: userProfile.plan || "PRO_MONTHLY",
        isPro: true,
        daysRemaining: 0,
        graceDaysRemaining: graceDaysRemaining,
        isPreExpiry: false,
        inGracePeriod: true,
        canAccessProFeatures: true, // 100% uninterrupted Pro access during grace period
        expiryDateFormatted: expiryDateFormatted,
        badgeLabel: `⏳ Pro Grace (${graceDaysRemaining}d Left)`,
        badgeColor: "amber",
        notificationMessage: `Grace Period Active: Your Pro plan ended on ${expiryDateFormatted}. Enjoy uninterrupted Pro services until ${graceEndFormatted} (${graceDaysRemaining} days remaining). Please renew to continue without interruption.`,
        bannerMessage: `⏳ Pro Plan Grace Period Active: Your monthly cycle expired on ${expiryDateFormatted}. All Pro operations remain active for ${graceDaysRemaining} more days. Renew now (₹999/mo) to keep uninterrupted access.`,
      };
    }

    // 3. Grace period fully expired
    return {
      status: "EXPIRED",
      plan: userProfile.plan || "PRO_MONTHLY",
      isPro: false,
      daysRemaining: 0,
      graceDaysRemaining: 0,
      isPreExpiry: false,
      inGracePeriod: false,
      canAccessProFeatures: false,
      expiryDateFormatted: expiryDateFormatted,
      badgeLabel: `⚠️ Plan Expired`,
      badgeColor: "rose",
      notificationMessage: `Your Pro plan and 7-day grace period have ended. Renew your plan to unlock full workspace access.`,
      bannerMessage: `⚠️ Subscription Expired: Your Pro subscription has ended. Renew today to continue managing tenants, dual ledgers, and automated WhatsApp receipts.`,
    };
  }

  // Fallback: 14-Day Free Trial
  const createdAt = userProfile.createdAt ? new Date(userProfile.createdAt).getTime() : now;
  const daysElapsed = Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)));
  const trialDaysRemaining = Math.max(0, 14 - daysElapsed);

  if (trialDaysRemaining > 0) {
    const trialExpiry = new Date(createdAt + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return {
      status: "TRIAL",
      plan: "14_DAY_TRIAL",
      isPro: false,
      daysRemaining: trialDaysRemaining,
      graceDaysRemaining: 0,
      isPreExpiry: trialDaysRemaining <= 3,
      inGracePeriod: false,
      canAccessProFeatures: true,
      expiryDateFormatted: trialExpiry,
      badgeLabel: `⚡ 14-Day Trial (${trialDaysRemaining}d Left)`,
      badgeColor: "amber",
      notificationMessage:
        trialDaysRemaining <= 3
          ? `Trial Ending Soon: Your 14-day free trial ends in ${trialDaysRemaining} day${trialDaysRemaining > 1 ? "s" : ""}. Upgrade to Pro (₹999/mo) for uninterrupted management.`
          : undefined,
    };
  }

  return {
    status: "EXPIRED",
    plan: "14_DAY_TRIAL",
    isPro: false,
    daysRemaining: 0,
    graceDaysRemaining: 0,
    isPreExpiry: false,
    inGracePeriod: false,
    canAccessProFeatures: false,
    expiryDateFormatted: "Expired",
    badgeLabel: `⚠️ Trial Expired`,
    badgeColor: "rose",
    notificationMessage: `Your 14-day free trial has expired. Upgrade to Pro for ₹999/mo to continue.`,
  };
}

/**
 * Calculates new stacked expiry date when a user renews.
 * If user has active days remaining, new duration is added to current expiry.
 * If user is expired or in grace, duration starts from now.
 */
export function calculateStackedExpiry(currentExpiryIso?: string | null, durationDays: number = 30): string {
  const now = Date.now();
  let baseTime = now;

  if (currentExpiryIso) {
    const currentExpiryTime = new Date(currentExpiryIso).getTime();
    // If current expiry is in the future, stack on top of it!
    if (!isNaN(currentExpiryTime) && currentExpiryTime > now) {
      baseTime = currentExpiryTime;
    }
  }

  const newExpiryTime = baseTime + Number(durationDays) * 24 * 60 * 60 * 1000;
  return new Date(newExpiryTime).toISOString();
}
