// TenoPilot Centralized Single Source of Truth (SSOT) Domain Engine
// Provides authoritative calculation functions for all Occupant, Property, and Financial domains.

import { Occupant } from "@/constants/mockOccupants";
import { BedSlotConfig, RoomConfig } from "@/constants/propertyLayoutStore";
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
  return bed.occupant?.vacatingDate || bed.vacatingDate;
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
  const joiningDate = parseOccupantDate(joiningDateStr || "") || new Date();
  const checkoutDate = parseOccupantDate(checkoutDateStr || "") || new Date();
  const today = new Date();

  const totalDays = Math.max(
    1,
    Math.round((checkoutDate.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (isBooked || today < joiningDate) {
    const daysUntilCheckIn = Math.max(
      1,
      Math.round((joiningDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );
    return {
      totalDays,
      daysElapsed: 0,
      daysRemaining: totalDays,
      progressPercent: 0,
      isBooked: true,
      statusText: `Check-In in ${daysUntilCheckIn} Days (${joiningDateStr || "Upcoming"})`,
    };
  }

  const daysElapsed = Math.min(
    totalDays,
    Math.max(0, Math.round((today.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24)))
  );
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const progressPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));

  return {
    totalDays,
    daysElapsed,
    daysRemaining,
    progressPercent,
    isBooked: false,
    statusText: `${daysRemaining} Days Remaining (Checkout: ${checkoutDateStr || "—"})`,
  };
}

/**
 * 5. SSOT Room Sharing Tariff Resolver
 */
export function getRoomTariff(room: Partial<RoomConfig>): number {
  if (room.customRentAmount && room.customRentAmount > 0) {
    return room.customRentAmount;
  }
  if (room.sharingType === 1) return 18000;
  if (room.sharingType === 3) return 11000;
  if (room.sharingType === 4) return 9500;
  return 14500; // Default 2-sharing tariff
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
  const joiningDate = parseOccupantDate(joiningDateStr || "") || new Date();
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
