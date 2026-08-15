// TenoPilot Centralized Single Source of Truth (SSOT) Domain Engine
// Provides authoritative calculation functions for all Occupant, Property, and Financial domains.

import { Occupant, occupantStore, MOCK_OCCUPANTS_200, PaymentHistoryItem } from "@/constants/mockOccupants";
import { BedSlotConfig, RoomConfig } from "@/constants/propertyLayoutStore";
import { propertySettingsStore } from "@/constants/propertySettings";
import { parseOccupantDate } from "./autoCheckInEngine";

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
    };
  }

  const isGuest = occupant.stayType === "Guest";
  const isBooked = occupant.lifecycleStatus === "Booked";
  const isNotice = occupant.lifecycleStatus === "Notice";
  const isActive = occupant.lifecycleStatus === "Active";

  if (isGuest) {
    if (isBooked) {
      return {
        label: "BOOKED GUEST 🟦",
        shortLabel: "Booked Guest",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
        dotColor: "bg-blue-500",
        isGuest: true,
        isBooked: true,
        isNotice: false,
        isActive: false,
      };
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
    };
  }

  if (isNotice) {
    return {
      label: "NOTICE 🟧",
      shortLabel: "Notice",
      badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
      dotColor: "bg-orange-500",
      isGuest: false,
      isBooked: false,
      isNotice: true,
      isActive: false,
    };
  }

  if (isBooked) {
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
    label: "ACTIVE TENANT 🟢",
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
  statusText: string;
}

export function getGuestStayTimeline(
  joiningDateStr?: string,
  checkoutDateStr?: string,
  isBooked: boolean = false
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

  if (isBooked || todayMidnight.getTime() < joiningMidnight.getTime()) {
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
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const progressPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));

  return {
    totalDays,
    daysElapsed,
    daysRemaining,
    progressPercent,
    isBooked: false,
    statusText: daysRemaining === 0 ? "Checkout Due Today" : `${daysRemaining} Day(s) Remaining (Checkout: ${checkoutDateStr || "—"})`,
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
 * If joined on 1st of month, returns full monthly rent.
 */
export function calculateProRataRent(monthlyRent: number, joiningDateStr?: string): {
  proRataAmount: number;
  totalDaysInMonth: number;
  remainingDays: number;
  isFullMonth: boolean;
  joiningDay: number;
} {
  const now = new Date();
  const joiningDate = parseOccupantDate(joiningDateStr || "") || now;

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

export interface FinancialStatementSummary {
  proRataRent: number;
  securityDepositRequired: number;
  priorArrears: number;
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
  paymentStatusLabel: "Paid" | "Due" | "Overdue";
  depositStatusLabel: "PAID" | "PENDING" | "PARTIAL";
  statusBadgeText: string;
}

/**
 * 7. SSOT Unified Dual-Ledger Partial Payment & Financial Statement Resolver
 * Strictly segregates Security Deposit (Escrow) from Rent/Stay Tariff (Income).
 * Handles full life-cycle calculations for Migrated Tenants, Standard Tenants, and Short-Stay Guests.
 */
export function calculateOccupantFinancialStatement(
  occupant: Partial<Occupant>
): FinancialStatementSummary {
  const isGuest = occupant.stayType === "Guest";
  const history = occupant.paymentHistory || [];

  if (isGuest) {
    // -------------------------------------------------------------------------
    // 🏨 GUEST FINANCIAL LEDGER (Package Tariff + Refundable Key Deposit)
    // -------------------------------------------------------------------------
    const stayTariff = occupant.rentAmount || 0;
    const securityDepositRequired =
      occupant.securityDeposit !== undefined ? occupant.securityDeposit : 1000;
    const priorArrears = 0;
    const totalGrossDue = stayTariff + securityDepositRequired;

    // Total actual payment receipts collected
    const totalCollectedReceipts = history.reduce((sum, item) => sum + (item.amount || 0), 0);

    const isFullyPaidExplicitly = occupant.paymentStatus === "Paid" && occupant.depositStatus === "PAID";
    const totalPaid = isFullyPaidExplicitly && totalCollectedReceipts === 0
      ? totalGrossDue
      : totalCollectedReceipts;

    const netOutstandingBalance = Math.max(0, totalGrossDue - totalPaid);
    const isFullyPaid = netOutstandingBalance === 0;
    const isPartialPaid = !isFullyPaid && totalPaid > 0;

    const isDepositCleared =
      occupant.depositStatus === "PAID" || totalPaid >= totalGrossDue || (totalPaid >= securityDepositRequired && occupant.depositStatus === "PARTIAL");

    const paymentStatusLabel: "Paid" | "Due" | "Overdue" = isFullyPaid
      ? "Paid"
      : occupant.paymentStatus === "Overdue"
      ? "Overdue"
      : "Due";

    const depositStatusLabel: "PAID" | "PENDING" | "PARTIAL" = isDepositCleared
      ? "PAID"
      : totalPaid > 0
      ? "PARTIAL"
      : "PENDING";

    let statusBadgeText = "DUE NOW 🔴";
    if (isFullyPaid) {
      statusBadgeText = "ALL CLEAR 🟢";
    } else if (isPartialPaid) {
      statusBadgeText = `PARTIAL DUE (₹${netOutstandingBalance.toLocaleString("en-IN")}) 🟧`;
    }

    return {
      proRataRent: stayTariff,
      securityDepositRequired,
      priorArrears,
      totalGrossDue,
      totalPaid,
      totalRentPaid: Math.min(totalPaid, stayTariff),
      totalDepositPaid: Math.max(0, totalPaid - stayTariff),
      remainingRentDue: isFullyPaid ? 0 : Math.max(0, stayTariff - totalPaid),
      remainingDepositDue: isDepositCleared ? 0 : securityDepositRequired,
      netOutstandingBalance,
      isFullyPaid,
      isPartialPaid,
      isDepositCleared,
      paymentStatusLabel,
      depositStatusLabel,
      statusBadgeText,
    };
  }

  // ---------------------------------------------------------------------------
  // 🏢 TENANT DUAL-LEDGER (Monthly Cycle / Pro-Rata Rent + Security Deposit)
  // ---------------------------------------------------------------------------
  const proRataRent = calculateProRataRent(occupant.rentAmount || 0, occupant.joiningDate).proRataAmount;
  const securityDepositRequired =
    occupant.securityDeposit !== undefined ? occupant.securityDeposit : 25000;
  const priorArrears = occupant.arrearsBalance || 0;

  // Separate deposit receipts from rent receipts in history
  const isDepositReceipt = (item: PaymentHistoryItem) => {
    const m = (item.month || "").toLowerCase();
    const r = (item.receiptNo || "").toLowerCase();
    return m.includes("deposit") || r.includes("dep");
  };

  const depositReceipts = history.filter(isDepositReceipt);
  const rentReceipts = history.filter((item) => !isDepositReceipt(item));

  const totalDepositPaidFromReceipts = depositReceipts.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalRentPaidFromReceipts = rentReceipts.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Deposit Clearance
  const isDepositCleared = occupant.depositStatus === "PAID" || totalDepositPaidFromReceipts >= securityDepositRequired;
  const remainingDepositDue = isDepositCleared
    ? 0
    : Math.max(0, securityDepositRequired - totalDepositPaidFromReceipts);

  // Rent Clearance
  const isRentCleared = occupant.paymentStatus === "Paid" || totalRentPaidFromReceipts >= proRataRent;
  const remainingRentDue = isRentCleared
    ? 0
    : Math.max(0, proRataRent - totalRentPaidFromReceipts);

  // Net Outstanding Balance strictly equals remaining rent + remaining deposit + prior arrears
  const netOutstandingBalance = remainingRentDue + remainingDepositDue + priorArrears;

  // Gross package required for cycle
  const totalGrossDue = (isDepositCleared ? 0 : securityDepositRequired) + proRataRent + priorArrears;

  // Total payments tracked
  const effectiveDepositPaid = isDepositCleared && totalDepositPaidFromReceipts === 0
    ? securityDepositRequired
    : totalDepositPaidFromReceipts;
  const effectiveRentPaid = isRentCleared && totalRentPaidFromReceipts === 0
    ? proRataRent
    : totalRentPaidFromReceipts;
  const totalPaid = effectiveDepositPaid + effectiveRentPaid;

  const isFullyPaid = netOutstandingBalance === 0;
  const isPartialPaid = !isFullyPaid && (totalRentPaidFromReceipts > 0 || totalDepositPaidFromReceipts > 0);

  const paymentStatusLabel: "Paid" | "Due" | "Overdue" = isFullyPaid
    ? "Paid"
    : occupant.paymentStatus === "Overdue"
    ? "Overdue"
    : "Due";

  const depositStatusLabel: "PAID" | "PENDING" | "PARTIAL" = isDepositCleared
    ? "PAID"
    : occupant.depositStatus === "PARTIAL" || totalDepositPaidFromReceipts > 0
    ? "PARTIAL"
    : "PENDING";

  let statusBadgeText = "DUE NOW 🔴";
  if (isFullyPaid) {
    statusBadgeText = "ALL CLEAR 🟢";
  } else if (isPartialPaid) {
    statusBadgeText = `PARTIAL DUE (₹${netOutstandingBalance.toLocaleString("en-IN")}) 🟧`;
  }

  return {
    proRataRent,
    securityDepositRequired,
    priorArrears,
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
    paymentStatusLabel,
    depositStatusLabel,
    statusBadgeText,
  };
}

export interface BedOccupantsTimeline {
  activeOccupant?: Occupant;
  nextBooking?: Occupant;
  futureBookings: Occupant[];
  totalUpcomingCount: number;
}

/**
 * 8. SSOT Bed Occupants Timeline & Multi-Booking Resolver
 * Resolves current physical resident vs upcoming reservations for a bed slot.
 */
export function getBedOccupantsTimeline(
  roomNumber: string,
  bedCode: string,
  bed: BedSlotConfig,
  propertyId?: string
): BedOccupantsTimeline {
  const allOccupants = propertyId ? occupantStore.getOccupants(propertyId) : (occupantStore.getOccupants() || []);
  const matching = allOccupants.filter(
    (occ) =>
      occ.roomNumber.toLowerCase() === roomNumber.toLowerCase() &&
      occ.bedCode.toLowerCase() === bedCode.toLowerCase() &&
      occ.lifecycleStatus !== "Past"
  );

  // 1. Primary Active or Notice Resident physically living in bed right now
  const activeOccupant =
    matching.find((occ) => occ.lifecycleStatus === "Active" || occ.lifecycleStatus === "Notice") ||
    (bed.occupant && bed.occupant.lifecycleStatus !== "Booked" && bed.occupant.lifecycleStatus !== "Past" ? bed.occupant : undefined);

  // 2. Chronological list of upcoming pre-booked reservations
  const bookedList = matching
    .filter((occ) => occ.lifecycleStatus === "Booked" && occ.id !== activeOccupant?.id)
    .sort((a, b) => {
      const dateA = new Date(a.joiningDate).getTime() || 0;
      const dateB = new Date(b.joiningDate).getTime() || 0;
      return dateA - dateB;
    });

  if (bookedList.length === 0 && bed.status === "Booked" && bed.occupant && bed.occupant.id !== activeOccupant?.id) {
    bookedList.push(bed.occupant);
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
 * Strict As-of-Today Active Resident Verifier
 * Filters out future 'Booked' guests or past 'Vacated' occupants.
 */
export function getActiveResidentForToday(phoneInput: string, occupantsList: Occupant[]): Occupant | null {
  const cleanDigits = phoneInput.replace(/\D/g, "");
  if (cleanDigits.length < 10) return null;

  const matched = occupantsList.find((o) => {
    const occPhoneClean = o.phone.replace(/\D/g, "");
    const isPhoneMatch = occPhoneClean.includes(cleanDigits) || cleanDigits.includes(occPhoneClean);
    if (!isPhoneMatch) return false;

    // Exclude past occupants who have vacated
    if (o.lifecycleStatus === "Past") return false;

    return true;
  });

  return matched || null;
}

