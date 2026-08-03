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
