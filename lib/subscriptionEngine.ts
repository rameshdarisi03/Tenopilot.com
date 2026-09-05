/**
 * TenoPilot Central Subscription & Billing Engine (SSOT)
 * Handles:
 * - 10-Day Free Trial
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
export const DEFAULT_TRIAL_DAYS = 10;

export function evaluateSubscription(userProfile: any): EvaluatedSubscription {
  const now = Date.now();

  if (!userProfile) {
    return {
      status: "TRIAL",
      plan: "10_DAY_TRIAL",
      isPro: false,
      daysRemaining: DEFAULT_TRIAL_DAYS,
      graceDaysRemaining: 0,
      isPreExpiry: false,
      inGracePeriod: false,
      canAccessProFeatures: true,
      expiryDateFormatted: "10 Days",
      badgeLabel: `⚡ 10-Day Free Trial (${DEFAULT_TRIAL_DAYS}d Left)`,
      badgeColor: "amber",
    };
  }

  if (userProfile.status === "SUSPENDED" || userProfile.subscriptionStatus === "SUSPENDED") {
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

  const isProPlan =
    userProfile.plan === "PRO_MONTHLY" ||
    userProfile.plan === "PRO_ANNUAL" ||
    userProfile.plan === "VIP_PASS" ||
    userProfile.subscriptionPlan === "pro";

  // Authoritative Expiration Timestamp (Google Cloud Stamped SSOT)
  let expiryTime: number;
  if (userProfile.planExpiresAt) {
    expiryTime = new Date(userProfile.planExpiresAt).getTime();
  } else if (userProfile.trialEndsAtMs) {
    expiryTime = Number(userProfile.trialEndsAtMs);
  } else if (userProfile.createdAt) {
    const createdTime = new Date(userProfile.createdAt).getTime();
    expiryTime = isNaN(createdTime) ? 0 : createdTime + DEFAULT_TRIAL_DAYS * 86400000;
  } else {
    // ⚠️ Legacy account with no createdAt or planExpiresAt stamped in Firestore
    // Because this account was created historically in the past, its 10-day trial has elapsed.
    expiryTime = 0; // Expired!
  }

  const msDiff = expiryTime - now;
  const daysRemaining = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
  const expiryDateFormatted = !isNaN(expiryTime)
    ? new Date(expiryTime).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Active";

  // 1. PRO SUBSCRIPTIONS (With 7-Day Grace Period)
  if (isProPlan) {
    // A. Plan is actively valid
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

    // B. Plan has passed expiry — check 7-Day Trusted Grace Period
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

    // C. Grace period fully expired
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

  // 2. 10-DAY FREE TRIAL (Strict Cloud-Stapped SSOT)
  if (daysRemaining > 0) {
    return {
      status: "TRIAL",
      plan: userProfile.plan || "10_DAY_TRIAL",
      isPro: false,
      daysRemaining: daysRemaining,
      graceDaysRemaining: 0,
      isPreExpiry: daysRemaining <= 3,
      inGracePeriod: false,
      canAccessProFeatures: true,
      expiryDateFormatted: expiryDateFormatted,
      badgeLabel: `⚡ 10-Day Free Trial (${daysRemaining}d Left)`,
      badgeColor: "amber",
      notificationMessage:
        daysRemaining <= 3
          ? `Trial Ending Soon: Your 10-day free trial ends in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""}. Upgrade to Pro (₹999/mo) for uninterrupted management.`
          : undefined,
    };
  }

  // 3. FREE TRIAL EXPIRED (Option A: Graceful Read-Only with Action Gating)
  return {
    status: "EXPIRED",
    plan: "10_DAY_TRIAL",
    isPro: false,
    daysRemaining: 0,
    graceDaysRemaining: 0,
    isPreExpiry: false,
    inGracePeriod: false,
    canAccessProFeatures: false,
    expiryDateFormatted: "Expired",
    badgeLabel: `⚠️ Trial Expired`,
    badgeColor: "rose",
    notificationMessage: `Your 10-day free trial has expired. Upgrade to Pro for ₹999/mo to continue.`,
    bannerMessage: `⚠️ Free Trial Ended: Your 10-day free trial has completed. Upgrade to Pro (₹999/mo) to unlock tenant onboarding, FastTrack AI, and automated reminders.`,
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
