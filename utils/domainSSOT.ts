// TenoPilot Centralized Single Source of Truth (SSOT) Domain Engine
// Provides authoritative calculation functions for all Occupant, Property, and Financial domains.

import { Occupant, occupantStore, MOCK_OCCUPANTS_200, PaymentHistoryItem } from "@/constants/mockOccupants";
import { BedSlotConfig, RoomConfig } from "@/constants/propertyLayoutStore";
import { propertySettingsStore } from "@/constants/propertySettings";
import { normalizePhoneNumber } from "./security";
import { parseOccupantDate } from "./autoCheckInEngine";
export { parseOccupantDate } from "./autoCheckInEngine";

/**
 * 1. SSOT Occupant Vacating / Checkout Date Resolver
 */
export function getOccupantVacatingDate(occupant?: Partial<Occupant> | null): string | undefined {
  if (!occupant) return undefined;
  return occupant.vacatingDate;
}

/**
 * 2. SSOT Bed Slot Vacating Date Resolver
 */
export function getBedVacatingDate(bed?: BedSlotConfig | null): string | undefined {
  if (!bed) return undefined;
  return bed.occupant?.vacatingDate || bed.guestCheckoutDate || bed.vacatingDate || (bed.status === "Guest" ? bed.occupant?.dueDate : undefined);
}

/**
 * SSOT ISO Date Formatter ("YYYY-MM-DD" -> "06 Sep 2026")
 */
export function formatIsoToDisplayDate(isoDate?: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(monthIdx) || isNaN(day)) return isoDate;
  const dateObj = new Date(year, monthIdx, day);
  return dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * 3. SSOT Occupant Lifecycle Badge & Status Info
 */
export interface OccupantStatusBadge {
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotColor: string;
  isGuest: boolean;
  isBooked: boolean;
  isNotice: boolean;
  isActive: boolean;
  isOverdue?: boolean;
  isPast?: boolean;
}

export function getOccupantStatusBadge(occupant?: Partial<Occupant> | null): OccupantStatusBadge {
  if (!occupant) {
    return {
      label: "AVAILABLE 🟢",
      shortLabel: "Available",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotColor: "bg-emerald-500",
      isGuest: false,
      isBooked: false,
      isNotice: false,
      isActive: false,
      isOverdue: false,
      isPast: false,
    };
  }

  const isGuest = occupant.stayType === "Guest";
  const isPast = occupant.lifecycleStatus === "Past";
  const isBooked = occupant.lifecycleStatus === "Booked";
  const isNotice = occupant.lifecycleStatus === "Notice";
  const isActive = occupant.lifecycleStatus === "Active";

  // 🏁 0. Past / Checked-Out Resident (Alumni / Departed Guest)
  if (isPast) {
    return {
      label: "CHECKED OUT 🏁",
      shortLabel: "Checked Out",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-300 font-bold",
      dotColor: "bg-slate-400",
      isGuest,
      isBooked: false,
      isNotice: false,
      isActive: false,
      isOverdue: false,
      isPast: true,
    };
  }

  if (isGuest) {
    // 🏨 Guest Auto-Transition Rule:
    // There is no manual check-in process designed for guests.
    // When the scheduled check-in day arrives or passes (today >= check-in date),
    // the status automatically transitions from BOOKED GUEST to active GUEST!
    let isUpcomingGuest = isBooked;
    const checkInDate = parseOccupantDate(occupant.joiningDate || occupant.lastPaidDate || "");
    if (checkInDate) {
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const checkInMidnight = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate()).getTime();
      if (todayMidnight >= checkInMidnight) {
        isUpcomingGuest = false;
      } else {
        isUpcomingGuest = true;
      }
    }

    if (isUpcomingGuest) {
      return {
        label: "BOOKED GUEST 🟦",
        shortLabel: "Booked Guest",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
        dotColor: "bg-blue-500",
        isGuest: true,
        isBooked: true,
        isNotice: false,
        isActive: false,
        isOverdue: false,
      };
    }

    // Check if guest checkout date has passed without checkout
    const checkOutDateStr = occupant.vacatingDate || occupant.dueDate || occupant.guestCheckoutDate;
    if (checkOutDateStr) {
      const parsedCheckOut = parseOccupantDate(checkOutDateStr);
      if (parsedCheckOut) {
        const now = new Date();
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const checkOutMidnight = new Date(parsedCheckOut.getFullYear(), parsedCheckOut.getMonth(), parsedCheckOut.getDate()).getTime();
        if (todayMidnight > checkOutMidnight) {
          return {
            label: "CHECKOUT OVERDUE 🚨",
            shortLabel: "Overdue",
            badgeClass: "bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400 animate-pulse",
            dotColor: "bg-red-500",
            isGuest: true,
            isBooked: false,
            isNotice: false,
            isActive: true,
            isOverdue: true,
          };
        }
      }
    }

    return {
      label: "GUEST 🟣",
      shortLabel: "Guest",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      dotColor: "bg-purple-500",
      isGuest: true,
      isBooked: false,
      isNotice: false,
      isActive: true,
      isOverdue: false,
    };
  }

  if (isNotice) {
    const rawVacDate = occupant.vacatingDate;
    if (rawVacDate) {
      const parsedVac = parseOccupantDate(rawVacDate);
      if (parsedVac) {
        const now = new Date();
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const vacMidnight = new Date(parsedVac.getFullYear(), parsedVac.getMonth(), parsedVac.getDate()).getTime();
        if (todayMidnight > vacMidnight) {
          return {
            label: "VACATING OVERDUE 🚨",
            shortLabel: "Overdue",
            badgeClass: "bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400 animate-pulse",
            dotColor: "bg-red-500",
            isGuest: false,
            isBooked: false,
            isNotice: true,
            isActive: false,
            isOverdue: true,
          };
        }
      }
    }

    return {
      label: "NOTICE 🟧",
      shortLabel: "Notice",
      badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
      dotColor: "bg-orange-500",
      isGuest: false,
      isBooked: false,
      isNotice: true,
      isActive: false,
      isOverdue: false,
    };
  }

  if (isBooked) {
    // 🏠 Auto-Transition Rule: When scheduled check-in/joining date arrives or passes (today >= joiningDate),
    // the resident transitions automatically from BOOKED to ACTIVE!
    const checkInDate = parseOccupantDate(occupant.joiningDate || occupant.lastPaidDate || "");
    if (checkInDate) {
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const checkInMidnight = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate()).getTime();
      if (todayMidnight >= checkInMidnight) {
        return {
          label: "ACTIVE 🟢",
          shortLabel: "Active",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dotColor: "bg-emerald-500",
          isGuest: false,
          isBooked: false,
          isNotice: false,
          isActive: true,
        };
      }
    }

    return {
      label: "BOOKED 🟦",
      shortLabel: "Booked",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      dotColor: "bg-blue-500",
      isGuest: false,
      isBooked: true,
      isNotice: false,
      isActive: false,
    };
  }

  return {
    label: "ACTIVE 🟢",
    shortLabel: "Active",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
    isGuest: false,
    isBooked: false,
    isNotice: false,
    isActive: true,
  };
}

/**
 * 4. SSOT Guest Stay Timeline & Progress Bar Calculator
 */
export interface GuestStayTimeline {
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  progressPercent: number;
  isBooked: boolean;
  isPast?: boolean;
  statusText: string;
}

export function getGuestStayTimeline(
  joiningDateStr?: string,
  checkoutDateStr?: string,
  isBooked: boolean = false,
  isPast: boolean = false
): GuestStayTimeline {
  const parsedJoining = parseOccupantDate(joiningDateStr || "") || new Date();
  const parsedCheckout = parseOccupantDate(checkoutDateStr || "") || new Date();
  const now = new Date();

  // Normalize all dates to local calendar midnight to eliminate UTC/offset rounding bugs
  const joiningMidnight = new Date(parsedJoining.getFullYear(), parsedJoining.getMonth(), parsedJoining.getDate());
  const checkoutMidnight = new Date(parsedCheckout.getFullYear(), parsedCheckout.getMonth(), parsedCheckout.getDate());
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const totalDays = Math.max(
    1,
    Math.round((checkoutMidnight.getTime() - joiningMidnight.getTime()) / (1000 * 60 * 60 * 24))
  );

  // 🏁 Checked-Out / Completed Past Guest
  if (isPast) {
    return {
      totalDays,
      daysElapsed: totalDays,
      daysRemaining: 0,
      progressPercent: 100,
      isBooked: false,
      isPast: true,
      statusText: `Stay Completed / Checked Out (${checkoutDateStr || "Departed"})`,
    };
  }

  // 🏨 Guest Auto-Transition: Only considered Booked if check-in date is strictly in the FUTURE.
  // Once the day arrives (today >= check-in date), status transitions to GUEST!
  const isActuallyBooked = todayMidnight.getTime() < joiningMidnight.getTime();

  if (isActuallyBooked) {
    const daysUntilCheckIn = Math.max(
      1,
      Math.round((joiningMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
    );
    return {
      totalDays,
      daysElapsed: 0,
      daysRemaining: totalDays,
      progressPercent: 0,
      isBooked: true,
      statusText: `Check-In in ${daysUntilCheckIn} Day(s) (${joiningDateStr || "Upcoming"})`,
    };
  }

  const daysElapsed = Math.min(
    totalDays,
    Math.max(0, Math.round((todayMidnight.getTime() - joiningMidnight.getTime()) / (1000 * 60 * 60 * 24)))
  );
  const daysRemaining = Math.max(
    0,
    Math.round((checkoutMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
  );
  const progressPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));

  const isCheckoutPassed = todayMidnight.getTime() > checkoutMidnight.getTime();
  const isCheckoutToday = todayMidnight.getTime() === checkoutMidnight.getTime();

  let statusText = `${daysRemaining} Day(s) Remaining (Checkout: ${checkoutDateStr || "—"})`;
  if (isCheckoutPassed) {
    statusText = `Checkout Overdue (${checkoutDateStr || "—"})`;
  } else if (isCheckoutToday || daysRemaining === 0) {
    statusText = "Checkout Due Today";
  }

  return {
    totalDays,
    daysElapsed,
    daysRemaining,
    progressPercent,
    isBooked: false,
    statusText,
  };
}

/**
 * 5. SSOT Room Sharing Tariff Resolver
 */
export function getRoomTariff(room: Partial<RoomConfig>, propertyId?: string): number {
  if (room.customRentAmount && room.customRentAmount > 0) {
    return room.customRentAmount;
  }
  const settings = propertySettingsStore.getSettings(propertyId);
  const tiers = settings?.rentalTiers;
  if (room.sharingType === 1) return tiers?.sharing1 || 20000;
  if (room.sharingType === 2) return tiers?.sharing2 || 12000;
  if (room.sharingType === 3) return tiers?.sharing3 || 8500;
  if (room.sharingType === 4) return tiers?.sharing4 || 6000;
  return tiers?.sharing2 || 12000; // Default 2-sharing tariff
}

/**
 * 6. SSOT Pro-Rata Rent Calculation Engine for Mid-Month Joiners
 * Calculates exact rent due for remaining days in the joining month.
 * In "1st to End of Month" mode: pro-rates remaining days if joined mid-month.
 * In "Anniversary Date" mode: charges full monthly rent for the 1-month cycle.
 */
export function calculateProRataRent(
  monthlyRent: number,
  joiningDateStr?: string,
  billingCycleDates?: "1st to End of Month" | "Anniversary Date"
): {
  proRataAmount: number;
  totalDaysInMonth: number;
  remainingDays: number;
  isFullMonth: boolean;
  joiningDay: number;
} {
  const now = new Date();
  const joiningDate = parseOccupantDate(joiningDateStr || "") || now;

  // 📅 In Anniversary Date mode (Joining to Joining), billing is always full month cycle
  if (billingCycleDates === "Anniversary Date") {
    return {
      proRataAmount: monthlyRent,
      totalDaysInMonth: 30,
      remainingDays: 30,
      isFullMonth: true,
      joiningDay: joiningDate.getDate() || 1,
    };
  }

  // Check if joining date falls strictly within the CURRENT calendar month & year
  const isCurrentMonthJoining =
    joiningDate.getFullYear() === now.getFullYear() &&
    joiningDate.getMonth() === now.getMonth();

  // If established tenant joined in a previous month/year, standard full monthly cycle applies
  if (!isCurrentMonthJoining) {
    const totalDaysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return {
      proRataAmount: monthlyRent,
      totalDaysInMonth: totalDaysInCurrentMonth,
      remainingDays: totalDaysInCurrentMonth,
      isFullMonth: true,
      joiningDay: 1,
    };
  }

  const year = joiningDate.getFullYear();
  const month = joiningDate.getMonth();
  const joiningDay = joiningDate.getDate();

  // Get total days in joining month (e.g., 31 for Aug, 30 for Sep, 28/29 for Feb)
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  if (joiningDay <= 1) {
    return {
      proRataAmount: monthlyRent,
      totalDaysInMonth,
      remainingDays: totalDaysInMonth,
      isFullMonth: true,
      joiningDay: 1,
    };
  }

  const remainingDays = totalDaysInMonth - joiningDay + 1;
  const proRataAmount = Math.round((monthlyRent / totalDaysInMonth) * remainingDays);

  return {
    proRataAmount,
    totalDaysInMonth,
    remainingDays,
    isFullMonth: false,
    joiningDay,
  };
}

export interface OccupantLastPaidInfo {
  date: string;
  amount?: number;
  mode?: string;
  isPaid: boolean;
  displayText: string;
  subText?: string;
}

/**
 * SSOT Helper to resolve the occupant's last payment date, amount, and payment mode
 */
export function resolveOccupantLastPaidInfo(occupant?: Partial<Occupant> | null): OccupantLastPaidInfo {
  if (!occupant) {
    return { date: "—", isPaid: false, displayText: "—" };
  }

  const history = occupant.paymentHistory || [];
  const isDepositReceipt = (item: PaymentHistoryItem) => {
    const m = (item.month || "").toLowerCase();
    const r = (item.receiptNo || "").toLowerCase();
    return m.includes("deposit") || r.includes("dep");
  };

  const rentReceipts = history.filter((item) => !isDepositReceipt(item) && item.status === "PAID");
  const latestRent = rentReceipts.length > 0 ? rentReceipts[rentReceipts.length - 1] : null;

  if (latestRent && latestRent.amount > 0) {
    return {
      date: latestRent.date,
      amount: latestRent.amount,
      mode: latestRent.mode || "UPI",
      isPaid: true,
      displayText: latestRent.date,
      subText: `₹${latestRent.amount.toLocaleString("en-IN")}${latestRent.mode ? ` (${latestRent.mode})` : ""}`,
    };
  }

  // Fallback to occupant.lastPaidDate if present and not a placeholder string
  if (
    occupant.lastPaidDate &&
    occupant.lastPaidDate !== "Unpaid / Due Now" &&
    occupant.lastPaidDate !== "Reserved / Unpaid" &&
    !occupant.lastPaidDate.toLowerCase().includes("unpaid") &&
    !occupant.lastPaidDate.toLowerCase().includes("pending")
  ) {
    const defaultAmount = occupant.rentAmount || 0;
    return {
      date: occupant.lastPaidDate,
      amount: defaultAmount,
      isPaid: true,
      displayText: occupant.lastPaidDate,
      subText: defaultAmount > 0 ? `₹${defaultAmount.toLocaleString("en-IN")}` : undefined,
    };
  }

  if (occupant.lifecycleStatus === "Booked") {
    return {
      date: "Pending Check-In",
      isPaid: false,
      displayText: "Pending Check-In",
    };
  }

  return {
    date: "Unpaid / Due Now",
    isPaid: false,
    displayText: "Unpaid / Due Now",
  };
}

/**
 * SSOT Helper to resolve the occupant's current billing cycle payment due date
 * Supports both "1st to End of Month" and "Anniversary Date" (Joining Date to Joining Date)
 */

export interface BillingCycleContext {
  targetDueDate: Date;
  resetDate: Date;
  graceCutoffDate: Date;
  isPastGrace: boolean;
  isDueWindow: boolean;
  targetMonthKey: string; // e.g. "2026-11"
  hasCustomDueOverride: boolean;
  isCustomFuturePostponed: boolean;
}

/**
 * Returns the current date broken down in Indian Standard Time (IST, GMT+5:30)
 */
export function getNowIST(): { nowIST: Date; year: number; month: number; day: number } {
  const now = new Date();
  const istStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const nowIST = new Date(istStr);
  return {
    nowIST,
    year: nowIST.getFullYear(),
    month: nowIST.getMonth(),
    day: nowIST.getDate(),
  };
}

/**
 * SSOT Helper: Resolves the dynamic billing cycle windows according to Case 1 rules.
 * All date checks run strictly in Indian Standard Time (IST - UTC+05:30).
 * Triggers cycle reset on (n - 1) day where n is the due date.
 * For Due Date = 1st -> resets on the last day of the previous month.
 * Due period lasts until the grace days expire (e.g. Due 1st + 3 days grace = 1st, 2nd, 3rd are Due).
 * Overdue triggers the moment grace days finish (from the 4th onwards).
 *
 * For Individual Custom Due Overrides (e.g. TCS salary on 6th):
 * - Reset day is (6 - 1) = 5th.
 * - Due on 5th & 6th.
 * - Flips to Overdue immediately on 7th (zero secondary grace).
 * - Choice B: Prior to 5th (e.g. 1st-4th), marked as isCustomFuturePostponed = true (Low priority, auto-unchecked in reminders).
 */
export function resolveOccupantBillingCycleContext(
  occupant?: Partial<Occupant> | null,
  settings?: any
): BillingCycleContext {
  const isAnniversary = settings?.billingCycleDates === "Anniversary Date";
  const { nowIST, year, month, day } = getNowIST();
  const today = new Date(year, month, day);

  const hasCustomDueOverride = occupant?.customDueDay !== undefined && occupant?.customDueDay !== null && occupant.customDueDay > 0;
  let desiredDueDay = occupant?.customDueDay ?? settings?.desiredDueDate ?? occupant?.dueDay ?? 1;
  const propertyGraceDays = Math.max(0, Number(settings?.gracePeriodDays !== undefined ? settings.gracePeriodDays : 3));

  // If occupant has a custom postponed due date override, their extension WAS their grace period (0 secondary grace)
  const graceDays = hasCustomDueOverride ? 0 : propertyGraceDays;

  if (isAnniversary && occupant?.joiningDate) {
    const jDate = parseOccupantDate(occupant.joiningDate);
    if (jDate && !isNaN(jDate.getTime())) {
      desiredDueDay = occupant?.customDueDay ?? jDate.getDate();
    }
  }

  // Bound desiredDueDay to valid month days (1 to 31)
  desiredDueDay = Math.max(1, Math.min(31, desiredDueDay));

  let targetDueDate: Date;
  let resetDate: Date;

  if (desiredDueDay === 1) {
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    if (day === daysInCurrentMonth) {
      // (n-1) day for 1st of upcoming month! Resets today.
      targetDueDate = new Date(year, month + 1, 1);
      resetDate = new Date(year, month, daysInCurrentMonth);
    } else {
      // Active calendar month cycle
      const daysInPrevMonth = new Date(year, month, 0).getDate();
      targetDueDate = new Date(year, month, 1);
      resetDate = new Date(year, month - 1, daysInPrevMonth);
    }
  } else {
    // desiredDueDay > 1 (e.g. 5th, 30th, 31st) -> (n-1) day is (desiredDueDay - 1)
    if (day >= desiredDueDay - 1) {
      const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
      const safeDay = Math.min(desiredDueDay, daysInCurrentMonth);
      targetDueDate = new Date(year, month, safeDay);
      resetDate = new Date(year, month, Math.min(desiredDueDay - 1, daysInCurrentMonth));
    } else {
      // Prior to (n-1) day in the current calendar month
      const daysInPrevMonth = new Date(year, month, 0).getDate();
      const safeDay = Math.min(desiredDueDay, daysInPrevMonth);
      targetDueDate = new Date(year, month - 1, safeDay);
      resetDate = new Date(year, month - 1, Math.min(desiredDueDay - 1, daysInPrevMonth));
    }
  }

  // Guard: A resident's due date cannot be set in the past before the date they actually joined!
  if (occupant?.joiningDate) {
    const jDate = parseOccupantDate(occupant.joiningDate);
    if (jDate && !isNaN(jDate.getTime())) {
      const joinMidnight = new Date(jDate.getFullYear(), jDate.getMonth(), jDate.getDate());
      if (targetDueDate.getTime() < joinMidnight.getTime()) {
        targetDueDate = joinMidnight;
        resetDate = new Date(joinMidnight.getFullYear(), joinMidnight.getMonth(), joinMidnight.getDate() - 1);
      }
    }
  }

  // Grace cutoff: Due Date + (graceDays - 1) day end-of-day.
  // For standard Due 1st + 3 days grace => 1st, 2nd, 3rd are Due. Cutoff is 3rd midnight.
  // Today > 3rd (i.e. from 4th onwards) => isPastGrace = true (OVERDUE)!
  // For custom override (graceDays = 0) => graceCutoffDate = targetDueDate.
  // Today > targetDueDate (e.g. 7th for due on 6th) => isPastGrace = true (OVERDUE)!
  const graceCutoffDate = graceDays > 0
    ? new Date(targetDueDate.getFullYear(), targetDueDate.getMonth(), targetDueDate.getDate() + (graceDays - 1))
    : new Date(targetDueDate.getFullYear(), targetDueDate.getMonth(), targetDueDate.getDate());

  const isPastGrace = today.getTime() > graceCutoffDate.getTime();
  const isDueWindow = today.getTime() >= resetDate.getTime() && today.getTime() <= graceCutoffDate.getTime();
  const targetMonthKey = `${targetDueDate.getFullYear()}-${String(targetDueDate.getMonth() + 1).padStart(2, "0")}`;

  // Choice B: If occupant has custom due day in the current month (e.g. 6th),
  // and today is strictly before their reset day (e.g. 1st - 4th of month),
  // they are postponed to a future date in this month.
  const isCustomFuturePostponed = hasCustomDueOverride && day < desiredDueDay - 1;

  return {
    targetDueDate,
    resetDate,
    graceCutoffDate,
    isPastGrace,
    isDueWindow,
    targetMonthKey,
    hasCustomDueOverride,
    isCustomFuturePostponed,
  };
}

export function resolveOccupantPaymentDueDate(
  occupant?: Partial<Occupant> | null,
  settings?: any
): string {
  if (!occupant) return "—";
  const cycle = resolveOccupantBillingCycleContext(occupant, settings);
  const dayPadded = String(cycle.targetDueDate.getDate()).padStart(2, "0");
  const monthStr = cycle.targetDueDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return `${dayPadded} ${monthStr}`;
}


/**
 * Resolves whether an occupant has registered any vehicle numbers
 */
export function occupantHasRegisteredVehicle(occupant?: Partial<Occupant> | null): boolean {
  if (!occupant) return false;
  const single = occupant.vehicleNumber ? String(occupant.vehicleNumber).trim() : "";
  if (single.length > 0) return true;
  if (Array.isArray(occupant.vehicleNumbers)) {
    return occupant.vehicleNumbers.some((v) => v && String(v).trim().length > 0);
  }
  return false;
}

/**
 * Resolves the monthly parking fee for an occupant:
 * - If no vehicle registered: 0
 * - If individual override is set: returns individual override
 * - If individual override is undefined/empty: fallbacks to global propertySettings.parkingCharges
 * - Returns 0 if negative or invalid
 */
export function resolveOccupantParkingFee(
  occupant?: Partial<Occupant> | null,
  settings?: any
): number {
  if (!occupant) return 0;
  if (!occupantHasRegisteredVehicle(occupant)) return 0;

  const globalFee = settings?.parkingCharges !== undefined ? Number(settings.parkingCharges) : 0;
  const validGlobal = isNaN(globalFee) || globalFee < 0 ? 0 : globalFee;

  // 1. If occupant has an explicit custom exception set by owner
  if (occupant.isParkingException) {
    const parsed = Number(occupant.parkingCharges);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }

  // 2. If occupant has a non-zero parking fee already stored
  if (occupant.parkingCharges !== undefined && occupant.parkingCharges !== null && Number(occupant.parkingCharges) > 0) {
    return Number(occupant.parkingCharges);
  }

  // 3. Otherwise (unassigned or legacy 0 without explicit exception), inherit the property's global fee
  return validGlobal;
}

export interface FinancialStatementSummary {
  proRataRent: number;
  securityDepositRequired: number;
  priorArrears: number;
  parkingFee: number;
  remainingParkingDue: number;
  parkingBreakupText?: string;
  totalGrossDue: number;
  totalPaid: number;
  totalRentPaid: number;
  totalDepositPaid: number;
  remainingRentDue: number;
  remainingDepositDue: number;
  netOutstandingBalance: number;
  isFullyPaid: boolean;
  isPartialPaid: boolean;
  isDepositCleared: boolean;
  isOverdue: boolean;
  paymentStatusLabel: "Paid" | "Due" | "Overdue";
  depositStatusLabel: "PAID" | "PENDING" | "PARTIAL";
  statusBadgeText: string;
  dueDay: number;
  graceCutoffDay: number;
  isPastGrace: boolean;
  targetDueDateStr?: string;
  resetDateStr?: string;
  graceCutoffDateStr?: string;
  hasCustomDueOverride?: boolean;
  isCustomFuturePostponed?: boolean;
}

/**
 * 7. SSOT Unified Dual-Ledger Partial Payment & Financial Statement Resolver
 * Strictly segregates Security Deposit (Escrow) from Rent/Stay Tariff (Income).
 * Handles full life-cycle calculations for Migrated Tenants, Standard Tenants, and Short-Stay Guests.
 * Dynamically computes Overdue vs Due status based on property due date and grace period settings.
 */
export function calculateOccupantFinancialStatement(
  occupant: Partial<Occupant>,
  settings?: any
): FinancialStatementSummary {
  const isGuest = occupant.stayType === "Guest";
  const rawHistory = occupant.paymentHistory || [];
  // Exclude voided and cancelled receipts from ledger calculations
  const history = rawHistory.filter((item) => item.status !== "VOIDED" && (item as any).status !== "FAILED");

  const isAnniversary = settings?.billingCycleDates === "Anniversary Date";
  const includeDepositInOutstanding = Boolean(settings?.includeDepositInOutstanding);
  let desiredDueDay = occupant?.customDueDay ?? settings?.desiredDueDate ?? occupant.dueDay ?? 5;

  if (isAnniversary && occupant.joiningDate) {
    const jDate = parseOccupantDate(occupant.joiningDate);
    if (jDate && !isNaN(jDate.getTime())) {
      desiredDueDay = occupant?.customDueDay ?? jDate.getDate();
    }
  }

  // Resolve dynamic cycle context (Case 1: (n-1) reset trigger & grace window)
  const cycleCtx = resolveOccupantBillingCycleContext(occupant, settings);
  const graceDays = Math.max(0, Number(settings?.gracePeriodDays !== undefined ? settings.gracePeriodDays : 3));
  const now = new Date();
  const currentDay = now.getDate();
  const graceCutoffDay = cycleCtx.graceCutoffDate.getDate();
  const isPastGrace = cycleCtx.isPastGrace;

  if (isGuest) {
    // -------------------------------------------------------------------------
    // 🏨 GUEST FINANCIAL LEDGER (Package Tariff + Refundable Key Deposit)
    // -------------------------------------------------------------------------
    const stayTariff = occupant.rentAmount || 0;
    const securityDepositRequired =
      occupant.securityDeposit !== undefined ? occupant.securityDeposit : 1000;
    const priorArrears = 0;
    const totalGrossDue = stayTariff + securityDepositRequired;

    // Categorize receipts between deposit receipts and stay tariff receipts
    const depositReceipts = history.filter(
      (item) =>
        item.month === "Security Deposit" ||
        item.id?.includes("-dep-") ||
        item.receiptNo?.startsWith("#DEP-")
    );
    const rentReceipts = history.filter(
      (item) =>
        item.month !== "Security Deposit" &&
        !item.id?.includes("-dep-") &&
        !item.receiptNo?.startsWith("#DEP-")
    );

    const totalCollectedReceipts = history.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalDepositPaidFromReceipts = history.reduce((sum, item) => {
      if (item.depositAmount !== undefined && item.depositAmount > 0) return sum + item.depositAmount;
      if (item.month === "Security Deposit" || item.id?.includes("-dep-") || item.receiptNo?.startsWith("#DEP-")) {
        return sum + (item.amount || 0);
      }
      return sum;
    }, 0);
    const totalRentPaidFromReceipts = history.reduce((sum, item) => {
      if (item.rentAmount !== undefined && item.rentAmount > 0) return sum + item.rentAmount;
      if (item.month !== "Security Deposit" && !item.id?.includes("-dep-") && !item.receiptNo?.startsWith("#DEP-")) {
        return sum + (item.amount || 0);
      }
      return sum;
    }, 0);

    const isFullyPaidExplicitly = occupant.paymentStatus === "Paid" && occupant.depositStatus === "PAID";
    const hasCategorizedReceipts = depositReceipts.length > 0 || rentReceipts.length > 0;

    let totalDepositPaid = 0;
    let totalRentPaid = 0;
    let remainingDepositDue = securityDepositRequired;
    let remainingRentDue = stayTariff;
    let isDepositCleared = false;

    if (isFullyPaidExplicitly && totalCollectedReceipts === 0) {
      totalDepositPaid = securityDepositRequired;
      totalRentPaid = stayTariff;
      remainingDepositDue = 0;
      remainingRentDue = 0;
      isDepositCleared = true;
    } else if (hasCategorizedReceipts) {
      isDepositCleared =
        occupant.depositStatus === "PAID" || totalDepositPaidFromReceipts >= securityDepositRequired;
      const isRentCleared =
        occupant.paymentStatus === "Paid" || totalRentPaidFromReceipts >= stayTariff;

      totalDepositPaid = isDepositCleared && totalDepositPaidFromReceipts === 0
        ? securityDepositRequired
        : totalDepositPaidFromReceipts;
      totalRentPaid = isRentCleared && totalRentPaidFromReceipts === 0
        ? stayTariff
        : totalRentPaidFromReceipts;

      remainingDepositDue = isDepositCleared
        ? 0
        : Math.max(0, securityDepositRequired - totalDepositPaid);
      remainingRentDue = isRentCleared
        ? 0
        : Math.max(0, stayTariff - totalRentPaid);
    } else {
      // General or uncategorized payments
      const totalPaidRaw = totalCollectedReceipts;
      if (occupant.depositStatus === "PAID") {
        isDepositCleared = true;
        totalDepositPaid = securityDepositRequired;
        remainingDepositDue = 0;
        totalRentPaid = Math.min(stayTariff, totalPaidRaw);
        remainingRentDue = Math.max(0, stayTariff - totalRentPaid);
      } else {
        totalRentPaid = Math.min(stayTariff, totalPaidRaw);
        remainingRentDue = Math.max(0, stayTariff - totalRentPaid);
        totalDepositPaid = Math.min(securityDepositRequired, Math.max(0, totalPaidRaw - stayTariff));
        remainingDepositDue = Math.max(0, securityDepositRequired - totalDepositPaid);
        isDepositCleared = remainingDepositDue === 0;
      }
    }

    const parkingFee = resolveOccupantParkingFee(occupant, settings);
    const totalParkingPaid = history.reduce((sum, item) => sum + (item.parkingAmount || 0), 0);
    const remainingParkingDue = (occupant.paymentStatus === "Paid" || totalParkingPaid >= parkingFee)
      ? 0
      : Math.max(0, parkingFee - totalParkingPaid);

    const totalPaid = totalRentPaid + totalDepositPaid + totalParkingPaid;
    const netOutstandingBalance = (includeDepositInOutstanding
      ? remainingRentDue + remainingDepositDue
      : remainingRentDue) + remainingParkingDue;
    const parkingBreakupText = remainingParkingDue > 0
      ? `₹${remainingRentDue.toLocaleString("en-IN")} rent + ₹${remainingParkingDue.toLocaleString("en-IN")} parking fee`
      : undefined;
    const isFullyPaid = includeDepositInOutstanding
      ? netOutstandingBalance === 0
      : remainingRentDue === 0;
    const isPartialPaid = !isFullyPaid && totalPaid > 0;

    const isOverdue = !isFullyPaid && isPastGrace;
    const paymentStatusLabel: "Paid" | "Due" | "Overdue" = isFullyPaid
      ? "Paid"
      : isOverdue
      ? "Overdue"
      : "Due";

    const depositStatusLabel: "PAID" | "PENDING" | "PARTIAL" = isDepositCleared
      ? "PAID"
      : totalDepositPaid > 0
      ? "PARTIAL"
      : "PENDING";

    let statusBadgeText = "DUE 🟧";
    if (isFullyPaid) {
      statusBadgeText = "PAID 🟢";
    } else if (isOverdue) {
      if (isPartialPaid) {
        statusBadgeText = `PARTIAL (OVERDUE) 🔴 - ₹${netOutstandingBalance.toLocaleString("en-IN")} pending`;
      } else {
        statusBadgeText = "OVERDUE 🔴";
      }
    } else if (isPartialPaid) {
      statusBadgeText = `PARTIAL DUE (₹${netOutstandingBalance.toLocaleString("en-IN")}) 🟧`;
    } else {
      statusBadgeText = "DUE 🟧";
    }

    return {
      proRataRent: stayTariff,
      securityDepositRequired,
      priorArrears,
      parkingFee,
      remainingParkingDue,
      parkingBreakupText,
      totalGrossDue: totalGrossDue + parkingFee,
      totalPaid,
      totalRentPaid,
      totalDepositPaid,
      remainingRentDue,
      remainingDepositDue,
      netOutstandingBalance,
      isFullyPaid,
      isPartialPaid,
      isDepositCleared,
      isOverdue,
      paymentStatusLabel,
      depositStatusLabel,
      statusBadgeText,
      dueDay: desiredDueDay,
      graceCutoffDay,
      isPastGrace,
    };
  }

  // ---------------------------------------------------------------------------
  // 🏢 TENANT DUAL-LEDGER (Monthly Cycle / Pro-Rata Rent + Security Deposit)
  // ---------------------------------------------------------------------------
  const proRataRent = calculateProRataRent(
    occupant.rentAmount || 0,
    occupant.joiningDate,
    settings?.billingCycleDates
  ).proRataAmount;
  const securityDepositRequired =
    occupant.securityDeposit !== undefined ? occupant.securityDeposit : (occupant.rentAmount ? occupant.rentAmount * 2 : 0);
  const priorArrears = occupant.arrearsBalance || 0;

  // Separate deposit receipts from rent receipts in history
  const isDepositReceipt = (item: PaymentHistoryItem) => {
    const m = (item.month || "").toLowerCase();
    const r = (item.receiptNo || "").toLowerCase();
    return m.includes("deposit") || r.includes("dep");
  };

  const depositReceipts = history.filter(isDepositReceipt);
  const rentReceipts = history.filter((item) => !isDepositReceipt(item));

  const totalDepositPaidFromReceipts = history.reduce((sum, item) => {
    if (item.depositAmount !== undefined && item.depositAmount > 0) return sum + item.depositAmount;
    if (isDepositReceipt(item)) return sum + (item.amount || 0);
    return sum;
  }, 0);
  const totalRentPaidFromReceipts = history.reduce((sum, item) => {
    if (item.rentAmount !== undefined && item.rentAmount > 0) return sum + item.rentAmount;
    if (!isDepositReceipt(item)) return sum + (item.amount || 0);
    return sum;
  }, 0);

  // Deposit Clearance
  const baselineDepositPaid =
    totalDepositPaidFromReceipts > 0
      ? totalDepositPaidFromReceipts
      : occupant.depositStatus === "PAID"
      ? (occupant.securityDeposit || 0)
      : 0;

  const isDepositCleared =
    securityDepositRequired > 0
      ? baselineDepositPaid >= securityDepositRequired
      : occupant.depositStatus === "PAID";

  const remainingDepositDue = isDepositCleared
    ? 0
    : Math.max(0, securityDepositRequired - baselineDepositPaid);

  // Rent Clearance:
  // Evaluates receipts and payments against the current active billing cycle.
  // When an occupant has paid receipts matching proRataRent OR is explicitly marked Paid,
  // they remain Paid during their cleared billing cycle.
  const isRentCleared = occupant.paymentStatus === "Paid" || totalRentPaidFromReceipts >= proRataRent;
  const remainingRentDue = isRentCleared
    ? 0
    : Math.max(0, proRataRent - totalRentPaidFromReceipts);

  const parkingFee = resolveOccupantParkingFee(occupant, settings);
  const totalParkingPaidFromReceipts = history.reduce((sum, item) => sum + (item.parkingAmount || 0), 0);
  const remainingParkingDue = (occupant.paymentStatus === "Paid" || totalParkingPaidFromReceipts >= parkingFee)
    ? 0
    : Math.max(0, parkingFee - totalParkingPaidFromReceipts);

  // Net Outstanding Balance:
  // Includes rent dues, prior arrears, parking dues, and optionally security deposit
  const netOutstandingBalance = includeDepositInOutstanding
    ? remainingRentDue + remainingDepositDue + priorArrears + remainingParkingDue
    : remainingRentDue + priorArrears + remainingParkingDue;

  const parkingBreakupText = remainingParkingDue > 0
    ? `₹${remainingRentDue.toLocaleString("en-IN")} rent + ₹${remainingParkingDue.toLocaleString("en-IN")} parking fee`
    : undefined;

  // Gross package required for cycle
  const totalGrossDue = (isDepositCleared ? 0 : securityDepositRequired) + proRataRent + priorArrears + parkingFee;

  // Total payments tracked
  const effectiveDepositPaid = baselineDepositPaid;
  const effectiveRentPaid = isRentCleared && totalRentPaidFromReceipts === 0
    ? proRataRent
    : totalRentPaidFromReceipts;
  const totalPaid = effectiveDepositPaid + effectiveRentPaid + totalParkingPaidFromReceipts;

  const isFullyPaid = includeDepositInOutstanding
    ? netOutstandingBalance === 0
    : remainingRentDue === 0 && priorArrears === 0 && remainingParkingDue === 0;
  const isPartialPaid = !isFullyPaid && (totalRentPaidFromReceipts > 0 || totalDepositPaidFromReceipts > 0);
  const isOverdue = !isFullyPaid && (priorArrears > 0 || isPastGrace);

  const paymentStatusLabel: "Paid" | "Due" | "Overdue" = isFullyPaid
    ? "Paid"
    : isOverdue
    ? "Overdue"
    : "Due";

  const depositStatusLabel: "PAID" | "PENDING" | "PARTIAL" = isDepositCleared
    ? "PAID"
    : occupant.depositStatus === "PARTIAL" || totalDepositPaidFromReceipts > 0
    ? "PARTIAL"
    : "PENDING";

  // Dynamic Status Badge formatting matching exact business rules
  let statusBadgeText = "DUE 🟧";
  if (isFullyPaid) {
    statusBadgeText = "PAID 🟢";
  } else if (priorArrears > 0) {
    statusBadgeText = `OVERDUE (1 Month Arrears / ₹${netOutstandingBalance.toLocaleString("en-IN")}) 🔴`;
  } else if (isPastGrace) {
    if (isPartialPaid) {
      statusBadgeText = `PARTIAL (OVERDUE) 🔴 - ₹${netOutstandingBalance.toLocaleString("en-IN")} pending`;
    } else {
      statusBadgeText = "OVERDUE 🔴";
    }
  } else if (isPartialPaid) {
    statusBadgeText = `PARTIAL DUE (₹${netOutstandingBalance.toLocaleString("en-IN")}) 🟧`;
  } else {
    statusBadgeText = "DUE 🟧";
  }

  return {
    proRataRent,
    securityDepositRequired,
    priorArrears,
    parkingFee,
    remainingParkingDue,
    parkingBreakupText,
    totalGrossDue,
    totalPaid,
    totalRentPaid: effectiveRentPaid,
    totalDepositPaid: effectiveDepositPaid,
    remainingRentDue,
    remainingDepositDue,
    netOutstandingBalance,
    isFullyPaid,
    isPartialPaid,
    isDepositCleared,
    isOverdue,
    paymentStatusLabel,
    depositStatusLabel,
    statusBadgeText,
    dueDay: desiredDueDay,
    graceCutoffDay,
    isPastGrace,
    targetDueDateStr: cycleCtx.targetDueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    resetDateStr: cycleCtx.resetDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    graceCutoffDateStr: cycleCtx.graceCutoffDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    hasCustomDueOverride: cycleCtx.hasCustomDueOverride,
    isCustomFuturePostponed: cycleCtx.isCustomFuturePostponed,
  };
}

export interface BedOccupantsTimeline {
  activeOccupant?: Occupant;
  nextBooking?: Occupant;
  futureBookings: Occupant[];
  totalUpcomingCount: number;
}

/**
 * 🏢 Universal PMS Room Number Normalizer (Enterprise Standard)
 * Strips 'Room', 'RM', leading dashes, whitespace, and non-alphanumeric noise.
 * Examples: 'Room 101', 'RM 101', 'room-101', '101' -> '101'
 * 'A-101', 'Room A-101' -> 'a101'
 * 'G-01', 'Room G-01' -> 'g01'
 */
export function normalizeRoomNumber(room?: string): string {
  if (!room) return "";
  let clean = room.toLowerCase().trim();
  clean = clean.replace(/^(?:room|rm)\s*[-_.]?\s*/i, "");
  return clean.replace(/[^a-z0-9]/g, "");
}

/**
 * 🛏️ Universal Canonical Bed Index Resolver (PMS Enterprise Standard)
 * Converts any bed format (letter or number, with/without prefixes) into a deterministic 0-based index.
 * Index 0: 'Bed A', 'Bed 1', 'A', '1', 'b1', 'bed-a'
 * Index 1: 'Bed B', 'Bed 2', 'B', '2', 'b2', 'bed-b'
 * Index 2: 'Bed C', 'Bed 3', 'C', '3', 'b3', 'bed-c'
 * Returns -1 if no recognizable index is present.
 */
export function getCanonicalBedIndex(bedCode?: string): number {
  if (!bedCode) return -1;
  const clean = bedCode.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const rest = clean.replace(/^bed/, "");
  if (!rest) return -1;

  // 1. Pure Digit: '1' -> 0, '2' -> 1
  if (/^\d+$/.test(rest)) {
    const num = parseInt(rest, 10);
    return num > 0 ? num - 1 : 0;
  }

  // 2. Short form 'b1', 'b2'
  if (/^b\d+$/.test(rest)) {
    const num = parseInt(rest.slice(1), 10);
    return num > 0 ? num - 1 : 0;
  }

  // 3. Alpha character: 'a' -> 0, 'b' -> 1, ... 'z' -> 25
  const letterMatch = rest.match(/[a-z]/);
  if (letterMatch) {
    const charCode = letterMatch[0].charCodeAt(0);
    if (charCode >= 97 && charCode <= 122) {
      return charCode - 97;
    }
  }

  return -1;
}

/**
 * Standard Bed Label Normalizer ('Bed A', 'Bed B', 'Bed C'...)
 */
export function normalizeBedCode(bedCode?: string): string {
  const idx = getCanonicalBedIndex(bedCode);
  if (idx >= 0 && idx < 26) {
    const letter = String.fromCharCode(65 + idx);
    return `Bed ${letter}`;
  }
  const clean = (bedCode || "").trim();
  return clean ? (clean.toLowerCase().startsWith("bed") ? clean : `Bed ${clean}`) : "Bed A";
}

/**
 * Canonical Bed Key for hash maps and comparisons ('bed_0', 'bed_1'...)
 */
export function canonicalBedKey(bedCode?: string): string {
  const idx = getCanonicalBedIndex(bedCode);
  if (idx >= 0) return `bed_${idx}`;
  return (bedCode || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * 🏨 Enterprise Room-Bed Allocation Engine (PMS Global Standard)
 * Maps occupants in a room to physical beds deterministically:
 * Pass 1: Distinct exact canonical bed matches ('Bed 2' <-> 'Bed B', 'Bed 1' <-> 'Bed A')
 * Pass 2: Gracefully cascades ANY unassigned or duplicate occupants to remaining empty beds
 * Guarantees zero dropped residents when vacant beds physically exist in the room!
 */
export function allocateRoomOccupantsToBeds(
  bedsInRoom: BedSlotConfig[],
  roomOccupants: Occupant[]
): Map<string, Occupant> {
  const sortedBeds = [...bedsInRoom].sort((a, b) => getCanonicalBedIndex(a.bedCode) - getCanonicalBedIndex(b.bedCode));
  const assignedOccIds = new Set<string>();
  const bedMap = new Map<string, Occupant>();

  // Pass 1: Distinct Exact Canonical Bed Matches
  sortedBeds.forEach((b) => {
    const targetIdx = getCanonicalBedIndex(b.bedCode);
    const targetKey = canonicalBedKey(b.bedCode);
    const match = roomOccupants.find((o) => {
      if (assignedOccIds.has(o.id)) return false;
      const occIdx = getCanonicalBedIndex(o.bedCode);
      if (targetIdx !== -1 && occIdx !== -1) return targetIdx === occIdx;
      return canonicalBedKey(o.bedCode) === targetKey;
    });
    if (match) {
      assignedOccIds.add(match.id);
      if (b.id) bedMap.set(b.id, match);
      bedMap.set(b.bedCode, match);
      bedMap.set(targetKey, match);
      if (targetIdx !== -1) bedMap.set(`idx_${targetIdx}`, match);
    }
  });

  // Pass 2: Fill ANY remaining empty beds with remaining unassigned/duplicate occupants in room
  // Safety rule: Never force an occupant with a distinct explicit bedCode (e.g. Bed A) onto a different empty bed (e.g. Bed B)
  const remainingOccupants = roomOccupants.filter((o) => !assignedOccIds.has(o.id));
  sortedBeds.forEach((b) => {
    const targetIdx = getCanonicalBedIndex(b.bedCode);
    const targetKey = canonicalBedKey(b.bedCode);
    const isAlreadyAssigned =
      (b.id ? bedMap.has(b.id) : false) ||
      bedMap.has(b.bedCode) ||
      bedMap.has(targetKey) ||
      (targetIdx !== -1 ? bedMap.has(`idx_${targetIdx}`) : false);

    if (!isAlreadyAssigned && remainingOccupants.length > 0) {
      // Find the next eligible unassigned occupant:
      // Either an occupant with no bedCode, or whose canonical index matches this bed
      const eligibleIdx = remainingOccupants.findIndex((o) => {
        const occIdx = getCanonicalBedIndex(o.bedCode);
        return occIdx === -1 || occIdx === targetIdx;
      });

      if (eligibleIdx !== -1) {
        const [match] = remainingOccupants.splice(eligibleIdx, 1);
        assignedOccIds.add(match.id);
        if (b.id) bedMap.set(b.id, match);
        bedMap.set(b.bedCode, match);
        bedMap.set(targetKey, match);
        if (targetIdx !== -1) bedMap.set(`idx_${targetIdx}`, match);
      }
    }
  });

  return bedMap;
}

/**
 * 8. SSOT Bed Occupants Timeline & Multi-Booking Resolver (PMS Enterprise 2-Tier Engine)
 * Resolves current physical resident vs upcoming reservations for a bed slot.
 * Tier 1: Exact canonical bed index match ('Bed 2' <-> 'Bed B')
 * Tier 2: Resilient room fallback allocator for unassigned/duplicate residents so zero active tenants are dropped.
 */
export function getBedOccupantsTimeline(
  roomNumber: string,
  bedCode: string,
  bed: BedSlotConfig,
  propertyId?: string,
  allRoomBeds?: BedSlotConfig[]
): BedOccupantsTimeline {
  const allOccupants = propertyId ? occupantStore.getOccupants(propertyId) : (occupantStore.getOccupants() || []);

  const cleanRoom = normalizeRoomNumber(roomNumber);
  const targetBedIdx = getCanonicalBedIndex(bedCode);
  const targetKey = canonicalBedKey(bedCode);

  // Filter all occupants assigned to this room who are not Past
  const roomOccupants = allOccupants.filter((occ) => {
    const occRoom = normalizeRoomNumber(occ.roomNumber);
    return occRoom === cleanRoom && occ.lifecycleStatus !== "Past";
  });

  // 🏢 Enterprise 2-Pass Room-Bed Allocation
  const bedsInRoom = allRoomBeds && allRoomBeds.length > 0 ? allRoomBeds : [bed];
  const allocatedMap = allocateRoomOccupantsToBeds(bedsInRoom, roomOccupants);
  const allocatedOccupant =
    (bed.id ? allocatedMap.get(bed.id) : undefined) ||
    (targetBedIdx !== -1 ? allocatedMap.get(`idx_${targetBedIdx}`) : undefined) ||
    allocatedMap.get(bedCode) ||
    allocatedMap.get(targetKey);

  const matchingOccupants = allocatedOccupant ? [allocatedOccupant] : [];

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // 1. Primary Active or Notice Resident physically living in bed right now,
  // OR a Booked resident whose joining date has reached/passed (today >= joiningDate)
  const activeOccupant =
    matchingOccupants.find((occ) => {
      if (occ.lifecycleStatus === "Active" || occ.lifecycleStatus === "Notice") return true;
      if (occ.lifecycleStatus === "Booked") {
        const joinD = parseOccupantDate(occ.joiningDate);
        if (joinD) {
          const joinMidnight = new Date(joinD.getFullYear(), joinD.getMonth(), joinD.getDate()).getTime();
          return todayMidnight >= joinMidnight;
        }
      }
      return false;
    }) ||
    (bed.occupant &&
     bed.occupant.lifecycleStatus !== "Booked" &&
     bed.occupant.lifecycleStatus !== "Past" &&
     (bed.occupant.bedCode
       ? (targetBedIdx !== -1 && getCanonicalBedIndex(bed.occupant.bedCode) === targetBedIdx) || canonicalBedKey(bed.occupant.bedCode) === targetKey
       : targetBedIdx === 0)
      ? bed.occupant
      : undefined);

  // 2. Chronological list of upcoming pre-booked reservations strictly in the FUTURE (today < joiningDate)
  const bookedList = matchingOccupants
    .filter((occ) => {
      if (occ.id === activeOccupant?.id || occ.name?.toLowerCase() === activeOccupant?.name?.toLowerCase()) return false;
      if (occ.lifecycleStatus !== "Booked") return false;
      const joinD = parseOccupantDate(occ.joiningDate);
      if (joinD) {
        const joinMidnight = new Date(joinD.getFullYear(), joinD.getMonth(), joinD.getDate()).getTime();
        return joinMidnight > todayMidnight;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.joiningDate).getTime() || 0;
      const dateB = new Date(b.joiningDate).getTime() || 0;
      return dateA - dateB;
    });

  if (bookedList.length === 0 && (bed.status === "Booked" || bed.occupant?.lifecycleStatus === "Booked") && bed.occupant && bed.occupant.id !== activeOccupant?.id && bed.occupant.name?.toLowerCase() !== activeOccupant?.name?.toLowerCase()) {
    const bedJoinD = parseOccupantDate(bed.occupant.joiningDate);
    if (!bedJoinD || todayMidnight < new Date(bedJoinD.getFullYear(), bedJoinD.getMonth(), bedJoinD.getDate()).getTime()) {
      bookedList.push(bed.occupant);
    }
  }

  const nextBooking = bookedList[0];

  return {
    activeOccupant,
    nextBooking,
    futureBookings: bookedList,
    totalUpcomingCount: bookedList.length,
  };
}

/**
 * 🔍 Unmapped Room Occupants Finder (PMS Safety Net)
 * Discovers active residents in Firestore who belong to a room but exceed its current physical bed capacity.
 * (e.g. 3 active residents assigned to Room 104 with only 2 beds configured)
 */
export function getUnmappedRoomOccupants(
  roomNumber: string,
  roomBeds: BedSlotConfig[],
  propertyId?: string
): Occupant[] {
  const allOccupants = propertyId ? occupantStore.getOccupants(propertyId) : (occupantStore.getOccupants() || []);
  const cleanRoom = normalizeRoomNumber(roomNumber);

  const roomActiveOccupants = allOccupants.filter((occ) => {
    return normalizeRoomNumber(occ.roomNumber) === cleanRoom && occ.lifecycleStatus !== "Past";
  });

  if (roomActiveOccupants.length <= roomBeds.length) {
    return [];
  }

  const allocatedMap = allocateRoomOccupantsToBeds(roomBeds, roomActiveOccupants);
  const allocatedIds = new Set<string>();
  allocatedMap.forEach((occ) => allocatedIds.add(occ.id));

  return roomActiveOccupants.filter((o) => !allocatedIds.has(o.id));
}

export interface BedAvailabilityEvaluation {
  isAvailable: boolean;
  status: "Available" | "Occupied" | "Booked" | "VacatingSoon" | "Conflict" | "Hold";
  reason: string;
  vacatingDate?: string;
  vacatingNote?: string;
  occupantName?: string;
  activeOccupant?: Occupant;
  conflictingBooking?: Occupant;
}

function parseToMidnightTimestamp(dStr?: string): number | null {
  if (!dStr) return null;
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * 9. Date-Aware Bed Availability Evaluator
 * Evaluates whether a bed is available for move-in on a specific date (or date range for guests).
 * Checks active residents (with/without vacating date) and upcoming future bookings.
 */
export function evaluateBedAvailabilityForDate(
  roomNumber: string,
  bedCode: string,
  bed: BedSlotConfig,
  targetJoiningDate: string,
  propertyId?: string,
  targetVacatingDate?: string,
  stayType: "Tenant" | "Guest" = "Tenant"
): BedAvailabilityEvaluation {
  const timeline = getBedOccupantsTimeline(roomNumber, bedCode, bed, propertyId);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const targetStartTs = parseToMidnightTimestamp(targetJoiningDate) || now.getTime();
  const targetEndTs = parseToMidnightTimestamp(targetVacatingDate);

  // 0. Check if bed is locked on Hold (Self-KYC in progress)
  if (bed.status === "Hold" && !timeline.activeOccupant && !timeline.nextBooking) {
    const candidateName = bed.holdCandidate?.name ? `Hold (${bed.holdCandidate.name})` : "On Hold (Self-KYC)";
    return {
      isAvailable: false,
      status: "Hold",
      reason: `Bed is locked on Hold for ${bed.holdCandidate?.name || "incoming resident"} (Self-KYC in progress)`,
      occupantName: bed.holdCandidate?.name,
    };
  }

  // 1. Check Active / Current resident in the bed
  if (timeline.activeOccupant) {
    const occ = timeline.activeOccupant;
    const vacDateTs = parseToMidnightTimestamp(occ.vacatingDate);

    // If active resident has no vacating date -> Indefinite permanent stay -> NOT AVAILABLE
    if (!vacDateTs) {
      return {
        isAvailable: false,
        status: "Occupied",
        reason: `Occupied by ${occ.name} (Active resident)`,
        occupantName: occ.name,
        activeOccupant: occ,
      };
    }

    // If active resident has a vacating date, but target move-in is before they vacate
    if (targetStartTs < vacDateTs) {
      return {
        isAvailable: false,
        status: "Occupied",
        reason: `Occupied by ${occ.name} until ${occ.vacatingDate}`,
        occupantName: occ.name,
        vacatingDate: occ.vacatingDate,
        vacatingNote: `Vacating ${occ.vacatingDate}`,
        activeOccupant: occ,
      };
    }
  }

  // 2. Check Upcoming Bookings (e.g. Tenant V)
  if (timeline.futureBookings && timeline.futureBookings.length > 0) {
    for (const booking of timeline.futureBookings) {
      const bookStartTs = parseToMidnightTimestamp(booking.joiningDate);
      const bookEndTs = parseToMidnightTimestamp(booking.vacatingDate);

      if (stayType === "Tenant") {
        // A regular monthly tenant is an indefinite stay.
        // A bed that already has a future booking cannot accept another regular tenant!
        return {
          isAvailable: false,
          status: "Booked",
          reason: `Reserved for ${booking.name} (${booking.stayType === "Guest" ? "Guest" : "Tenant"}) starting ${booking.joiningDate}`,
          occupantName: booking.name,
          conflictingBooking: booking,
        };
      } else {
        // Short-stay guest
        if (bookStartTs) {
          // If guest check-out is on or before booking check-in -> guest fits in the window!
          if (targetEndTs && targetEndTs <= bookStartTs) {
            continue;
          }
          // Or if booking has an end date and guest arrives after booking leaves -> OK!
          if (bookEndTs && targetStartTs >= bookEndTs) {
            continue;
          }
          // Otherwise there is a collision
          return {
            isAvailable: false,
            status: "Conflict",
            reason: `Reserved for ${booking.name} starting ${booking.joiningDate}`,
            occupantName: booking.name,
            conflictingBooking: booking,
          };
        }
      }
    }
  }

  // 3. If active resident is vacating on or before target date -> Available as "Vacating Soon"
  if (timeline.activeOccupant && timeline.activeOccupant.vacatingDate) {
    const occ = timeline.activeOccupant;
    return {
      isAvailable: true,
      status: "VacatingSoon",
      reason: `Available from ${occ.vacatingDate} (${occ.name} vacating)`,
      vacatingDate: occ.vacatingDate,
      vacatingNote: `Vacating ${occ.vacatingDate}`,
      occupantName: occ.name,
      activeOccupant: occ,
    };
  }

  // 4. Clean available bed
  return {
    isAvailable: true,
    status: "Available",
    reason: "Available & ready for move-in",
  };
}

export interface ResidentVerificationResponse {
  isValid: boolean;
  status: "VALID" | "BOOKED" | "PAST" | "NOT_FOUND";
  occupant?: Occupant;
  errorMessage?: string;
}

/**
 * Strict As-of-Today Resident Complaint Verifier
 * - Only currently residing Active/Notice Tenants and Guests are allowed.
 * - Explicitly blocks 'Booked' occupants who have not onboarded yet.
 * - Explicitly blocks 'Past' occupants who have vacated.
 */
export function verifyResidentForComplaint(
  phoneInput: string,
  occupantsList: Occupant[]
): ResidentVerificationResponse {
  const cleanDigits = phoneInput.replace(/\D/g, "").slice(-10);
  if (cleanDigits.length < 10) {
    return { isValid: false, status: "NOT_FOUND" };
  }

  // 1. Find all matching records with this 10-digit phone number
  const matches = occupantsList.filter((o) => {
    const occPhoneClean = (o.phone || "").replace(/\D/g, "").slice(-10);
    return occPhoneClean === cleanDigits;
  });

  if (matches.length === 0) {
    return {
      isValid: false,
      status: "NOT_FOUND",
      errorMessage:
        "Mobile number not found in this property's resident directory. Please contact your property manager if you recently checked in.",
    };
  }

  // 2. Prioritize currently Active or Notice residents physically in the building
  const activeResident = matches.find(
    (o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice"
  );

  if (activeResident) {
    // Check if daily guest stay has expired
    if (activeResident.stayType === "Guest" && activeResident.dueDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const checkoutDate = new Date(activeResident.dueDate);
      checkoutDate.setHours(23, 59, 59, 999);
      if (!isNaN(checkoutDate.getTime()) && checkoutDate < now) {
        return {
          isValid: false,
          status: "PAST",
          errorMessage:
            "Access expired. Your guest stay ended on " +
            activeResident.dueDate +
            ". Only currently residing guests can log maintenance complaints.",
        };
      }
    }

    return {
      isValid: true,
      status: "VALID",
      occupant: activeResident,
    };
  }

  // 3. Block Booked residents who haven't moved in yet
  const bookedResident = matches.find((o) => o.lifecycleStatus === "Booked");
  if (bookedResident) {
    return {
      isValid: false,
      status: "BOOKED",
      errorMessage:
        `Your reservation (${bookedResident.name}) is booked starting ${bookedResident.joiningDate || "soon"}, but you have not onboarded yet. Maintenance requests can only be logged once you check in.`,
    };
  }

  // 4. Block Past / Vacated residents
  const pastResident = matches.find((o) => o.lifecycleStatus === "Past");
  if (pastResident) {
    return {
      isValid: false,
      status: "PAST",
      errorMessage:
        "Access expired. You are marked as a vacated resident in our records. If you are currently staying here, please contact management.",
    };
  }

  return {
    isValid: false,
    status: "NOT_FOUND",
    errorMessage:
      "Mobile number not found as an active occupant in this property.",
  };
}

/**
 * Strict As-of-Today Active Resident Verifier (Legacy Wrapper)
 */
export function getActiveResidentForToday(phoneInput: string, occupantsList: Occupant[]): Occupant | null {
  const res = verifyResidentForComplaint(phoneInput, occupantsList);
  return res.isValid && res.occupant ? res.occupant : null;
}

/**
 * 12. SSOT Property-Wide Rent Compliance & Overdue Calculator
 * Evaluates all active residents against property rent cycle settings (Calendar vs. Anniversary),
 * individual custom due dates, and grace periods with 100% mathematical accuracy.
 */
export interface PropertyRentComplianceSummary {
  totalActiveTenants: number;
  paidTenantsCount: number;
  overdueTenantsCount: number;   // Unpaid past grace period cutoff
  gracePendingCount: number;     // Unpaid but still within grace period window
  totalPendingDueCount: number;  // All tenants with pending balance (overdue + within grace)
  paidRatePct: string;
  totalCollectedThisCycle: number;
  totalPendingDueAmount: number;
  overduePendingAmount: number;
}

export function calculatePropertyRentComplianceSummary(
  occupantsList: Occupant[],
  settings?: any
): PropertyRentComplianceSummary {
  const activeOccupants = (occupantsList || []).filter(
    (o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice"
  );

  let paidTenantsCount = 0;
  let overdueTenantsCount = 0;
  let gracePendingCount = 0;
  let totalCollectedThisCycle = 0;
  let totalPendingDueAmount = 0;
  let overduePendingAmount = 0;

  activeOccupants.forEach((occ) => {
    const stmt = calculateOccupantFinancialStatement(occ, settings);
    totalCollectedThisCycle += stmt.totalRentPaid;

    if (stmt.isFullyPaid) {
      paidTenantsCount++;
    } else {
      totalPendingDueAmount += stmt.netOutstandingBalance;
      if (stmt.isOverdue || occ.paymentStatus === "Overdue" || (occ.daysDiff !== undefined && occ.daysDiff < 0)) {
        overdueTenantsCount++;
        overduePendingAmount += stmt.netOutstandingBalance;
      } else {
        gracePendingCount++;
      }
    }
  });

  const totalActiveTenants = activeOccupants.length;
  const paidRatePct =
    totalActiveTenants > 0
      ? ((paidTenantsCount / totalActiveTenants) * 100).toFixed(1)
      : "100.0";

  return {
    totalActiveTenants,
    paidTenantsCount,
    overdueTenantsCount,
    gracePendingCount,
    totalPendingDueCount: overdueTenantsCount + gracePendingCount,
    paidRatePct,
    totalCollectedThisCycle,
    totalPendingDueAmount,
    overduePendingAmount,
  };
}

export interface TenoPilotSearchEntity {
  name?: string;
  roomNumber?: string;
  phone?: string;
  vehicleNumber?: string;
  vehicleNumbers?: string[];
  vehiclePlate?: string;
  company?: string;
  workplace?: string;
  bedCode?: string;
  aadhaarNumber?: string;
}

/**
 * 🔍 Centralized TenoPilot Global Search Engine (SSOT)
 * Enforces authoritative tiered filtering rules:
 * - 1 to 3 Digits: Reserved for Room Number (e.g. '203' strictly matches Room 203; never matches middle of phone numbers)
 * - 4 Digits: Reserved for Bike / Vehicle Number (e.g. '5705' matches KA09JG5705)
 * - Minimum 5 Digits: Reserved for Mobile Number (filtered from first 5 digits of mobile number)
 * - Non-numeric / Alphanumeric: Matches Name, Room, Bed Code, Workplace, or Vehicle Plate
 */
export function matchesTenoPilotSearch(
  entity: TenoPilotSearchEntity,
  rawQuery: string
): boolean {
  const query = (rawQuery || "").trim().toLowerCase();
  if (!query) return true;

  const isPureDigits = /^\d+$/.test(query);
  const cleanDigits = query.replace(/\D/g, "");

  // =========================================================================
  // 1. TIERED PURE NUMERIC SEARCH LOGIC
  // =========================================================================
  if (isPureDigits) {
    const digitCount = cleanDigits.length;

    // TIER 1: 1 to 3 Digits -> Strictly Room Number (or exact digit word in name)
    if (digitCount <= 3) {
      const cleanRm = (entity.roomNumber || "").trim().toLowerCase();
      // Room match: exact room or room starts with query (e.g. "203", "101")
      const roomMatch = cleanRm === cleanDigits || cleanRm.startsWith(cleanDigits);

      // Name word match only if name has that exact standalone number (e.g. "305 Uday Friend")
      const nameWords = (entity.name || "").toLowerCase().split(/[\s,/-]+/).filter(Boolean);
      const nameExactWordMatch = nameWords.includes(cleanDigits);

      return Boolean(roomMatch || nameExactWordMatch);
    }

    // TIER 2: 4 Digits -> Strictly Bike / Vehicle Registration Number (or 4-digit room)
    if (digitCount === 4) {
      const cleanRm = (entity.roomNumber || "").trim().toLowerCase();
      if (cleanRm === cleanDigits) return true;

      const vList: string[] = [];
      if (entity.vehicleNumber) vList.push(entity.vehicleNumber);
      if (entity.vehiclePlate) vList.push(entity.vehiclePlate);
      if (Array.isArray(entity.vehicleNumbers)) {
        entity.vehicleNumbers.forEach((v) => v && vList.push(v));
      }

      const vehicleMatch = vList.some((v) => {
        const cleanV = v.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        return cleanV.endsWith(cleanDigits) || cleanV.includes(cleanDigits);
      });

      const nameWords = (entity.name || "").toLowerCase().split(/[\s,/-]+/).filter(Boolean);
      const nameExactWordMatch = nameWords.includes(cleanDigits);

      return Boolean(vehicleMatch || nameExactWordMatch);
    }

    // TIER 3: Minimum 5 Digits -> Mobile Number (Filtered from first 5 digits)
    if (digitCount >= 5) {
      const cleanPhone = normalizePhoneNumber(entity.phone || "");
      // Starts with the digits (first 5+ digits of mobile number), or contains if 7+ digits entered
      const phoneMatch = cleanPhone.startsWith(cleanDigits) || (digitCount >= 7 && cleanPhone.includes(cleanDigits));

      const cleanAadhaar = (entity.aadhaarNumber || "").replace(/\D/g, "");
      const aadhaarMatch = cleanAadhaar.length >= 5 && cleanAadhaar.startsWith(cleanDigits);

      return Boolean(phoneMatch || aadhaarMatch);
    }
  }

  // =========================================================================
  // 2. ALPHANUMERIC & TEXT TOKENS SEARCH LOGIC
  // =========================================================================
  const tokens = query.split(/\s+/).filter(Boolean);

  return tokens.every((token) => {
    // If this individual token is 1 to 3 digits, treat as room number
    if (/^\d{1,3}$/.test(token)) {
      const cleanRm = (entity.roomNumber || "").trim().toLowerCase();
      const roomMatch = cleanRm === token || cleanRm.startsWith(token);
      const nameWords = (entity.name || "").toLowerCase().split(/[\s,/-]+/).filter(Boolean);
      return roomMatch || nameWords.includes(token);
    }

    // If this individual token is 4 digits, treat as vehicle number
    if (/^\d{4}$/.test(token)) {
      const vList: string[] = [];
      if (entity.vehicleNumber) vList.push(entity.vehicleNumber);
      if (entity.vehiclePlate) vList.push(entity.vehiclePlate);
      if (Array.isArray(entity.vehicleNumbers)) {
        entity.vehicleNumbers.forEach((v) => v && vList.push(v));
      }
      return vList.some((v) => {
        const cleanV = v.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        return cleanV.endsWith(token) || cleanV.includes(token);
      });
    }

    // Name matching
    const nameLower = (entity.name || "").toLowerCase();
    const cleanName = nameLower.replace(/[^a-z0-9\s]/g, "");
    const nameWords = cleanName.split(/\s+/).filter(Boolean);
    if (nameLower.startsWith(token) || nameWords.some((w) => w.startsWith(token)) || nameLower.includes(token)) {
      return true;
    }

    // Room number
    const roomLower = (entity.roomNumber || "").toLowerCase();
    if (roomLower.includes(token)) return true;

    // Bed slot
    const bedLower = (entity.bedCode || "").toLowerCase();
    if (bedLower.includes(token)) return true;

    // Workplace / Company
    const workLower = (entity.workplace || entity.company || "").toLowerCase();
    if (workLower.includes(token)) return true;

    // Vehicle plate
    const vList: string[] = [];
    if (entity.vehicleNumber) vList.push(entity.vehicleNumber);
    if (entity.vehiclePlate) vList.push(entity.vehiclePlate);
    if (Array.isArray(entity.vehicleNumbers)) {
      entity.vehicleNumbers.forEach((v) => v && vList.push(v));
    }
    const tokenAlpha = token.replace(/[^a-z0-9]/g, "");
    const vehicleMatches = vList.some((v) => {
      const vl = v.toLowerCase();
      const vs = vl.replace(/[^a-z0-9]/g, "");
      return vl.includes(token) || (tokenAlpha && vs.includes(tokenAlpha));
    });
    if (vehicleMatches) return true;

    // Phone match ONLY if token has 5+ digits
    const tokenDigits = token.replace(/\D/g, "");
    if (tokenDigits.length >= 5) {
      const cleanPhone = normalizePhoneNumber(entity.phone || "");
      if (cleanPhone.startsWith(tokenDigits) || cleanPhone.includes(tokenDigits)) {
        return true;
      }
    }

    return false;
  });
}



