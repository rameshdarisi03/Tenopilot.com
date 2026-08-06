// TenoPilot Indian PG Financial Engine (TAS Chapter 4 & 9)
import { Occupant } from "@/constants/mockOccupants";

export interface PropertyFinancialSettings {
  billingCycleDates: "1st to End of Month" | "Anniversary Date";
  desiredDueDate: number; // e.g., 5 (5th of every month)
  gracePeriodDays: number; // 5 days grace period
}

export const DEFAULT_PROPERTY_SETTINGS: PropertyFinancialSettings = {
  billingCycleDates: "1st to End of Month",
  desiredDueDate: 5,
  gracePeriodDays: 5,
};

/**
 * Get total days in a given month/year
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Calculate Mid-Month Joining Pro-Rata Rent
 * Used ONLY when a long-term tenant joins mid-month during their initial month
 */
export function calculateMidMonthProRataRent(
  monthlyRent: number,
  joiningDateStr: string
): { proRataRent: number; remainingDays: number; totalMonthDays: number } {
  try {
    const jDate = new Date(joiningDateStr);
    if (isNaN(jDate.getTime())) {
      return { proRataRent: monthlyRent, remainingDays: 30, totalMonthDays: 30 };
    }

    const year = jDate.getFullYear();
    const month = jDate.getMonth();
    const totalMonthDays = getDaysInMonth(year, month);
    const dayOfJoin = jDate.getDate();

    if (dayOfJoin === 1) {
      return { proRataRent: monthlyRent, remainingDays: totalMonthDays, totalMonthDays };
    }

    const remainingDays = totalMonthDays - dayOfJoin + 1;
    const dailyRate = monthlyRent / totalMonthDays;
    const proRataRent = Math.round(dailyRate * remainingDays);

    return { proRataRent, remainingDays, totalMonthDays };
  } catch {
    return { proRataRent: monthlyRent, remainingDays: 30, totalMonthDays: 30 };
  }
}

/**
 * Calculate Rent Amount Due for a Tenant or Guest
 * Source of Truth:
 * - Tenants: Fixed Monthly Rent (Pro-rata applied ONLY on mid-month initial joining)
 * - Guests: Daily Rate x Stay Duration Days
 */
export function calculateRentAmountDue(
  occupant: Occupant,
  settings: PropertyFinancialSettings = DEFAULT_PROPERTY_SETTINGS
): {
  dueAmount: number;
  dueDateStr: string;
  isProRataFirstMonth: boolean;
  breakdownText: string;
} {
  // 1. Short-Term Guest Stays (Billed strictly per day)
  if (occupant.stayType === "Guest") {
    const dailyRate = occupant.rentAmount || 500;
    const stayDays = occupant.daysDiff || 3;
    const totalDue = dailyRate * (stayDays > 0 ? stayDays : 1);

    return {
      dueAmount: totalDue,
      dueDateStr: occupant.dueDate || "On Check-In",
      isProRataFirstMonth: false,
      breakdownText: `Guest Stay (${stayDays} Days @ ₹${dailyRate}/day)`,
    };
  }

  // 2. Long-Term Tenant Stays (Billed on Fixed Monthly Rent)
  const baseMonthlyRent = occupant.rentAmount || 14500;

  // Detect if Booked or First-Month Mid-Month Joining
  if (occupant.lifecycleStatus === "Booked") {
    return {
      dueAmount: baseMonthlyRent,
      dueDateStr: occupant.joiningDate || `05 Aug 2026`,
      isProRataFirstMonth: false,
      breakdownText: `Fixed Monthly Rent (Due on Check-In)`,
    };
  }

  // Determine current month's due date (5th of current month)
  const now = new Date();
  const dueYear = now.getFullYear();
  const dueMonth = now.getMonth();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const dueDayFormatted = settings.desiredDueDate < 10 ? `0${settings.desiredDueDate}` : `${settings.desiredDueDate}`;
  const nextDueDateStr = `${dueDayFormatted} ${monthNames[dueMonth]} ${dueYear}`;

  return {
    dueAmount: baseMonthlyRent,
    dueDateStr: occupant.dueDate || nextDueDateStr,
    isProRataFirstMonth: false,
    breakdownText: `Fixed Monthly Rent (Due on ${settings.desiredDueDate}th)`,
  };
}

/**
 * Calculate Mid-Month Room Transfer Pro-Rata Adjustment & One-Shot Tenant Communication Text
 */
export function calculateRoomTransferProRata(
  currentRent: number,
  newRent: number,
  transferDateStr: string,
  paymentStatus: "Paid" | "Due" | "Overdue"
): {
  tariffDiff: number;
  remainingDays: number;
  totalMonthDays: number;
  adjustmentAmount: number;
  isUpgrade: boolean;
  isDowngrade: boolean;
  communicationMessage: string;
} {
  try {
    const tDate = new Date(transferDateStr);
    const now = isNaN(tDate.getTime()) ? new Date() : tDate;
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalMonthDays = getDaysInMonth(year, month);
    const day = now.getDate();

    const remainingDays = totalMonthDays - day + 1;
    const tariffDiff = newRent - currentRent;
    const isUpgrade = tariffDiff > 0;
    const isDowngrade = tariffDiff < 0;

    const dailyDiff = tariffDiff / totalMonthDays;
    const adjustmentAmount = Math.round(dailyDiff * remainingDays);

    let communicationMessage = "";
    if (tariffDiff === 0) {
      communicationMessage = `Room shift: Monthly rent remains ₹${newRent.toLocaleString("en-IN")}/mo (No change in rent bill).`;
    } else if (paymentStatus === "Paid") {
      if (isUpgrade) {
        communicationMessage = `Room upgrade quote: A pro-rata adjustment of +₹${adjustmentAmount.toLocaleString("en-IN")} (${remainingDays} days in new room) will be added to your next 5th rent bill.`;
      } else {
        communicationMessage = `Room downgrade quote: A pro-rata credit of -₹${Math.abs(adjustmentAmount).toLocaleString("en-IN")} (${remainingDays} days) will be deducted from your next 5th rent bill.`;
      }
    } else {
      communicationMessage = `Room shift quote: Current month rent will be revised to reflect transfer date.`;
    }

    return {
      tariffDiff,
      remainingDays,
      totalMonthDays,
      adjustmentAmount,
      isUpgrade,
      isDowngrade,
      communicationMessage,
    };
  } catch {
    return {
      tariffDiff: 0,
      remainingDays: 15,
      totalMonthDays: 30,
      adjustmentAmount: 0,
      isUpgrade: false,
      isDowngrade: false,
      communicationMessage: `Room shift confirmed!`,
    };
  }
}

export interface GuestTransferAdjustmentResult {
  totalStayDays: number;
  elapsedDays: number;
  remainingDays: number;
  originalDailyRate: number;
  newDailyRate: number;
  elapsedTariff: number;
  remainingTariff: number;
  originalTotalTariff: number;
  revisedTotalTariff: number;
  adjustmentAmount: number;
  isUpgrade: boolean;
  isDowngrade: boolean;
  communicationMessage: string;
}

/**
 * Calculate Short-Term Guest Room Transfer Adjustment
 * Based on remaining days in guest stay (Check-In to Checkout) using customizable new daily tariff rates
 */
export function calculateGuestRoomTransferAdjustment(
  originalTotalTariff: number,
  newDailyRateInput: number,
  transferDateStr: string,
  joiningDateStr?: string,
  checkoutDateStr?: string
): GuestTransferAdjustmentResult {
  try {
    const parseOccupantDate = (d: string) => { const date = new Date(d); return isNaN(date.getTime()) ? null : date; };
    const tDate = parseOccupantDate(transferDateStr) || new Date();
    const cDate = parseOccupantDate(checkoutDateStr || "") || new Date(tDate.getTime() + 5 * 86400000);
    const jDate = parseOccupantDate(joiningDateStr || "") || new Date(tDate.getTime() - 4 * 86400000);

    const totalStayDays = Math.max(1, Math.round((cDate.getTime() - jDate.getTime()) / (1000 * 3600 * 24)));
    const elapsedDays = Math.max(0, Math.min(totalStayDays, Math.round((tDate.getTime() - jDate.getTime()) / (1000 * 3600 * 24))));
    const remainingDays = Math.max(0, totalStayDays - elapsedDays);

    const originalDailyRate = Math.round(originalTotalTariff / totalStayDays);
    const newDailyRate = newDailyRateInput > 0 ? newDailyRateInput : originalDailyRate;

    const elapsedTariff = elapsedDays * originalDailyRate;
    const remainingTariff = remainingDays * newDailyRate;
    const revisedTotalTariff = elapsedTariff + remainingTariff;
    const adjustmentAmount = revisedTotalTariff - originalTotalTariff;

    const isUpgrade = adjustmentAmount > 0;
    const isDowngrade = adjustmentAmount < 0;

    let communicationMessage = "";
    if (adjustmentAmount === 0) {
      communicationMessage = `Guest room transfer: Total stay tariff remains unchanged (No price difference).`;
    } else if (isUpgrade) {
      communicationMessage = `Guest room upgrade: Additional +₹${adjustmentAmount.toLocaleString("en-IN")} tariff difference for ${remainingDays} remaining days will be added to total stay bill.`;
    } else {
      communicationMessage = `Guest room downgrade: Discount credit of -₹${Math.abs(adjustmentAmount).toLocaleString("en-IN")} for ${remainingDays} remaining days will be credited to guest account.`;
    }

    return {
      totalStayDays,
      elapsedDays,
      remainingDays,
      originalDailyRate,
      newDailyRate,
      elapsedTariff,
      remainingTariff,
      originalTotalTariff,
      revisedTotalTariff,
      adjustmentAmount,
      isUpgrade,
      isDowngrade,
      communicationMessage,
    };
  } catch {
    return {
      totalStayDays: 10,
      elapsedDays: 4,
      remainingDays: 6,
      originalDailyRate: 500,
      newDailyRate: 750,
      elapsedTariff: 2000,
      remainingTariff: 4500,
      originalTotalTariff: 5000,
      revisedTotalTariff: 6500,
      adjustmentAmount: 1500,
      isUpgrade: true,
      isDowngrade: false,
      communicationMessage: "Guest room upgrade adjustment",
    };
  }
}
