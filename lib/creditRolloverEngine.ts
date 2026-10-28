// TenoPilot Credit Rollover Engine (WhatsApp & Email SSOT)
// Automatically carries forward unused credits to upcoming months for a configurable duration (Default: 4 Months)
// Evaluates each property on its own independent timeline without cross-property interference

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_PLATFORM_CONFIG } from "./platformConfig";

export interface CreditBatch {
  id: string;
  cycleId: string;
  source: "MONTHLY_QUOTA" | "RECHARGE_PACK" | "STARTER_BONUS" | "ROLLOVER";
  initialCredits: number;
  remainingCredits: number;
  grantedAt: string;
  expiresAt: string | null; // null for non-expiring recharges, ISO string for expiring batches
}

export interface RolloverEvaluationResult {
  propertyId: string;
  evaluated: boolean;
  reason?: string;
  whatsappRollover?: {
    carriedForward: number;
    expiredCredits: number;
    newGrossBalance: number;
  };
  emailRollover?: {
    carriedForward: number;
    expiredCredits: number;
    newGrossBalance: number;
  };
}

/**
 * Deducts credits in FIFO order from batches (expiring first) behind the scenes
 * Returns updated batches and final gross balance
 */
export function deductFromBatchesFIFO(
  batches: CreditBatch[],
  amountToDeduct: number,
  fallbackGross: number
): { updatedBatches: CreditBatch[]; newGrossBalance: number } {
  let toDeduct = amountToDeduct;
  const now = Date.now();

  // Filter out completely expired batches first
  const activeBatches = batches.filter((b) => {
    if (!b.expiresAt) return true;
    return new Date(b.expiresAt).getTime() > now;
  });

  // Sort FIFO: Batches with earliest expiration first, non-expiring last
  activeBatches.sort((a, b) => {
    if (!a.expiresAt && !b.expiresAt) return new Date(a.grantedAt).getTime() - new Date(b.grantedAt).getTime();
    if (!a.expiresAt) return 1;
    if (!b.expiresAt) return -1;
    return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
  });

  const updatedBatches: CreditBatch[] = [];

  for (const batch of activeBatches) {
    if (toDeduct <= 0) {
      updatedBatches.push(batch);
      continue;
    }

    if (batch.remainingCredits <= toDeduct) {
      toDeduct -= batch.remainingCredits;
      updatedBatches.push({
        ...batch,
        remainingCredits: 0,
      });
    } else {
      updatedBatches.push({
        ...batch,
        remainingCredits: batch.remainingCredits - toDeduct,
      });
      toDeduct = 0;
    }
  }

  // Calculate new gross balance
  const batchSum = updatedBatches.reduce((acc, b) => acc + (b.remainingCredits || 0), 0);
  const newGrossBalance = Math.max(0, fallbackGross - amountToDeduct);

  return {
    updatedBatches: updatedBatches.filter((b) => b.remainingCredits > 0),
    newGrossBalance: Math.max(batchSum, newGrossBalance),
  };
}

/**
 * Evaluates and executes the credit rollover for an individual property based on its own subscription cycle
 */
export async function evaluateAndExecutePropertyRollover(
  propertyId: string,
  options?: { force?: boolean; freshMonthlyQuotaWa?: number; freshMonthlyQuotaEmail?: number }
): Promise<RolloverEvaluationResult> {
  if (!propertyId || !db) {
    return { propertyId, evaluated: false, reason: "Invalid property ID or missing database" };
  }

  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Fetch Global Platform Configuration for Rollover Months
    let rolloverMonths = DEFAULT_PLATFORM_CONFIG.creditRolloverMonths || 4;
    try {
      const configDoc = await getDoc(doc(db, "platform_admin", "config", "settings", "master_controls"));
      if (configDoc.exists()) {
        const cData = configDoc.data();
        if (typeof cData.creditRolloverMonths === "number" && cData.creditRolloverMonths >= 1) {
          rolloverMonths = cData.creditRolloverMonths;
        }
      }
    } catch (e) {
      console.warn("Notice reading master controls for credit rollover:", e);
    }

    // 2. Fetch Property Dedicated Subscription Cycle
    const cycleRef = doc(db, `properties/${propertyId}/subscription_cycle/active`);
    const cycleSnap = await getDoc(cycleRef);
    let cycleData = cycleSnap.exists() ? cycleSnap.data() : null;

    const cycleEndDate = cycleData?.cycleEndDate ? new Date(cycleData.cycleEndDate) : null;
    const isPastCycle = cycleEndDate ? now >= cycleEndDate : false;

    if (!isPastCycle && !options?.force) {
      return { propertyId, evaluated: false, reason: "Current billing cycle has not elapsed yet" };
    }

    const cycleNumber = Number(cycleData?.cycleNumber || 1);
    const rolloverBatchDurationMs = rolloverMonths * 30 * 24 * 60 * 60 * 1000;
    const batchExpiryIso = new Date(now.getTime() + rolloverBatchDurationMs).toISOString();

    // 3. Process WhatsApp Wallet Rollover
    const waWalletRef = doc(db, `properties/${propertyId}/whatsapp/wallet`);
    const waSnap = await getDoc(waWalletRef);
    let waResult = { carriedForward: 0, expiredCredits: 0, newGrossBalance: 0 };

    if (waSnap.exists()) {
      const waData = waSnap.data();
      const currentCredits = Number(waData.credits) || 0;
      const existingTxs = Array.isArray(waData.transactions) ? waData.transactions : [];
      let batches: CreditBatch[] = Array.isArray(waData.batches) ? waData.batches : [];

      // Filter out any expired batches
      const validBatches: CreditBatch[] = [];
      let expiredAmount = 0;

      for (const b of batches) {
        if (b.expiresAt && new Date(b.expiresAt).getTime() <= now.getTime()) {
          expiredAmount += b.remainingCredits || 0;
        } else {
          validBatches.push(b);
        }
      }

      const carryForwardAmount = Math.max(0, currentCredits - expiredAmount);

      // Create new rollover batch for the valid remaining balance
      const newRolloverBatch: CreditBatch = {
        id: `batch-wa-ro-${Date.now()}-${cycleNumber}`,
        cycleId: `cycle-${cycleNumber}`,
        source: "ROLLOVER",
        initialCredits: carryForwardAmount,
        remainingCredits: carryForwardAmount,
        grantedAt: nowIso,
        expiresAt: batchExpiryIso,
      };

      const finalBatches: CreditBatch[] = carryForwardAmount > 0 ? [newRolloverBatch] : [];

      // Add fresh monthly quota if specified
      if (options?.freshMonthlyQuotaWa && options.freshMonthlyQuotaWa > 0) {
        finalBatches.push({
          id: `batch-wa-fresh-${Date.now()}`,
          cycleId: `cycle-${cycleNumber + 1}`,
          source: "MONTHLY_QUOTA",
          initialCredits: options.freshMonthlyQuotaWa,
          remainingCredits: options.freshMonthlyQuotaWa,
          grantedAt: nowIso,
          expiresAt: batchExpiryIso,
        });
      }

      const newGross = carryForwardAmount + (options?.freshMonthlyQuotaWa || 0);

      // Record Rollover transaction in the ledger
      const rolloverTxs: any[] = [];
      if (carryForwardAmount > 0) {
        rolloverTxs.push({
          id: `tx-ro-${Date.now()}`,
          type: "ROLLOVER",
          amount: carryForwardAmount,
          balanceAfter: newGross,
          description: `+${carryForwardAmount} WhatsApp Credits carried forward to upcoming month (valid for ${rolloverMonths} months)`,
          timestamp: nowIso,
          status: "DELIVERED",
        });
      }

      await setDoc(
        waWalletRef,
        {
          credits: newGross,
          batches: finalBatches,
          rolloverValidityMonths: rolloverMonths,
          lastRolloverAt: nowIso,
          transactions: [...rolloverTxs, ...existingTxs].slice(0, 100),
          updatedAt: nowIso,
        },
        { merge: true }
      );

      waResult = {
        carriedForward: carryForwardAmount,
        expiredCredits: expiredAmount,
        newGrossBalance: newGross,
      };
    }

    // 4. Process Email Wallet Rollover
    const emailWalletRef = doc(db, `properties/${propertyId}/email/wallet`);
    const emailSnap = await getDoc(emailWalletRef);
    let emailResult = { carriedForward: 0, expiredCredits: 0, newGrossBalance: 0 };

    if (emailSnap.exists()) {
      const emailData = emailSnap.data();
      const currentEmailCredits = Number(emailData.credits) || 0;
      const existingEmailTxs = Array.isArray(emailData.transactions) ? emailData.transactions : [];
      let emailBatches: CreditBatch[] = Array.isArray(emailData.batches) ? emailData.batches : [];

      const validEmailBatches: CreditBatch[] = [];
      let expiredEmailAmount = 0;

      for (const b of emailBatches) {
        if (b.expiresAt && new Date(b.expiresAt).getTime() <= now.getTime()) {
          expiredEmailAmount += b.remainingCredits || 0;
        } else {
          validEmailBatches.push(b);
        }
      }

      const emailCarryForwardAmount = Math.max(0, currentEmailCredits - expiredEmailAmount);

      const newEmailRolloverBatch: CreditBatch = {
        id: `batch-email-ro-${Date.now()}-${cycleNumber}`,
        cycleId: `cycle-${cycleNumber}`,
        source: "ROLLOVER",
        initialCredits: emailCarryForwardAmount,
        remainingCredits: emailCarryForwardAmount,
        grantedAt: nowIso,
        expiresAt: batchExpiryIso,
      };

      const finalEmailBatches: CreditBatch[] = emailCarryForwardAmount > 0 ? [newEmailRolloverBatch] : [];

      if (options?.freshMonthlyQuotaEmail && options.freshMonthlyQuotaEmail > 0) {
        finalEmailBatches.push({
          id: `batch-email-fresh-${Date.now()}`,
          cycleId: `cycle-${cycleNumber + 1}`,
          source: "MONTHLY_QUOTA",
          initialCredits: options.freshMonthlyQuotaEmail,
          remainingCredits: options.freshMonthlyQuotaEmail,
          grantedAt: nowIso,
          expiresAt: batchExpiryIso,
        });
      }

      const newEmailGross = emailCarryForwardAmount + (options?.freshMonthlyQuotaEmail || 0);

      const rolloverEmailTxs: any[] = [];
      if (emailCarryForwardAmount > 0) {
        rolloverEmailTxs.push({
          id: `tx-email-ro-${Date.now()}`,
          type: "ROLLOVER",
          amount: emailCarryForwardAmount,
          balanceAfter: newEmailGross,
          description: `+${emailCarryForwardAmount} Email Credits carried forward to upcoming month (valid for ${rolloverMonths} months)`,
          timestamp: nowIso,
          status: "DELIVERED",
        });
      }

      await setDoc(
        emailWalletRef,
        {
          credits: newEmailGross,
          batches: finalEmailBatches,
          rolloverValidityMonths: rolloverMonths,
          lastRolloverAt: nowIso,
          transactions: [...rolloverEmailTxs, ...existingEmailTxs].slice(0, 100),
          updatedAt: nowIso,
        },
        { merge: true }
      );

      emailResult = {
        carriedForward: emailCarryForwardAmount,
        expiredCredits: expiredEmailAmount,
        newGrossBalance: newEmailGross,
      };
    }

    // 5. Advance Property Subscription Cycle to Next 30-Day Window
    const newCycleStart = nowIso;
    const newCycleEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await setDoc(
      cycleRef,
      {
        propertyId,
        cycleNumber: cycleNumber + 1,
        cycleStartDate: newCycleStart,
        cycleEndDate: newCycleEnd,
        durationDays: 30,
        lastRolloverAt: nowIso,
        rolloverMonthsApplied: rolloverMonths,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    return {
      propertyId,
      evaluated: true,
      whatsappRollover: waResult,
      emailRollover: emailResult,
    };
  } catch (error: any) {
    console.error(`Rollover evaluation error for property ${propertyId}:`, error);
    return { propertyId, evaluated: false, reason: error.message };
  }
}
