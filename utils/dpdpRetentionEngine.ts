// TenoPilot DPDP Act (India) 2023 Automated Privacy & Data Retention Engine
// Strict Storage Minimization, Purpose Limitation & Multi-Tier Purging

import { ComplianceLogEntry } from "@/constants/complianceLogStore";

const ONE_DAY_MS = 86400000;
const THREE_YEARS_MS = 3 * 365 * ONE_DAY_MS; // 1095 days
const FIVE_YEARS_MS = 5 * 365 * ONE_DAY_MS; // 1825 days

/**
 * Strictly masks Aadhaar or National ID number so only the last 4 digits are visible.
 * Example: "1234 5678 9012" -> "XXXX-XXXX-9012"
 */
export function maskAadhaarNumber(rawId?: string): string {
  if (!rawId || rawId.trim().length === 0 || rawId.toLowerCase().includes("skip")) {
    return "XXXX-XXXX-****";
  }
  const digitsOnly = rawId.replace(/\D/g, "");
  if (digitsOnly.length >= 4) {
    const last4 = digitsOnly.slice(-4);
    return `XXXX-XXXX-${last4}`;
  }
  return "XXXX-XXXX-****";
}

/**
 * Calculates DPDP statutory retention dates from a checkout date
 */
export function calculateRetentionTimestamps(checkoutDateStr?: string): {
  checkoutTimestamp: number;
  purge3YearDate: string;
  purge3YearTimestamp: number;
  purge5YearDate: string;
  purge5YearTimestamp: number;
} {
  let checkoutTime = Date.now();
  if (checkoutDateStr) {
    const parsed = new Date(checkoutDateStr).getTime();
    if (!isNaN(parsed)) {
      checkoutTime = parsed;
    }
  }

  const purge3YearTimestamp = checkoutTime + THREE_YEARS_MS;
  const purge5YearTimestamp = checkoutTime + FIVE_YEARS_MS;

  const purge3YearDate = new Date(purge3YearTimestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const purge5YearDate = new Date(purge5YearTimestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return {
    checkoutTimestamp: checkoutTime,
    purge3YearDate,
    purge3YearTimestamp,
    purge5YearDate,
    purge5YearTimestamp,
  };
}

/**
 * Sanitizes an occupant record at the moment of checkout in compliance with DPDP Act 2023.
 * - Photo is immediately destroyed / set to purged state.
 * - Emergency contacts are immediately deleted (purpose ended).
 * - Aadhaar is masked to last 4 digits only.
 * - 3-Year & 5-Year retention expiry timestamps are locked in.
 */
export function sanitizeOccupantForCompliance(params: {
  propertyId: string;
  occupantId: string;
  name: string;
  phone: string;
  address?: string;
  aadhaarNumber?: string;
  stayType: "Tenant" | "Guest";
  roomNumber: string;
  bedCode: string;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate: string;
  checkOutTime?: string;
  totalDaysStayed: number;
  purposeOfVisit: string;
  exitCategory: ComplianceLogEntry["exitCategory"];
  exitReason: string;
  totalPaid: number;
  depositRefunded: number;
  penaltyPaid?: number;
  kycVerified: boolean;
}): Omit<ComplianceLogEntry, "id" | "timestamp"> {
  const retention = calculateRetentionTimestamps(params.checkOutDate);

  return {
    propertyId: params.propertyId,
    occupantId: params.occupantId,
    name: params.name,
    phone: params.phone, // Retained for 3 years
    emergencyPhone: "[PURGED ON CHECKOUT - DPDP ACT 2023]",
    emergencyRelation: "Purged",
    address: params.address || "Indiranagar, Bengaluru, KA", // Retained for 3 years
    aadhaarNumber: maskAadhaarNumber(params.aadhaarNumber),
    photoUrl: undefined, // Immediately purged
    stayType: params.stayType,
    roomNumber: params.roomNumber,
    bedCode: params.bedCode,
    checkInDate: params.checkInDate,
    checkInTime: params.checkInTime || "12:00 PM",
    checkOutDate: params.checkOutDate,
    checkOutTime: params.checkOutTime || "11:00 AM",
    totalDaysStayed: params.totalDaysStayed,
    purposeOfVisit: params.purposeOfVisit,
    exitCategory: params.exitCategory,
    exitReason: params.exitReason,
    totalPaid: params.totalPaid,
    depositRefunded: params.depositRefunded,
    penaltyPaid: params.penaltyPaid || 0,
    kycVerified: params.kycVerified,
    // DPDP Act 2023 Statutory Metadata
    dpdpStatus: "PHOTO_PURGED",
    isPhotoPurged: true,
    isEmergencyContactPurged: true,
    checkoutTimestamp: retention.checkoutTimestamp,
    purge3YearDate: retention.purge3YearDate,
    purge5YearDate: retention.purge5YearDate,
  };
}

/**
 * Runs a multi-tier DPDP retention lifecycle sweep across all compliance logs:
 * 1. Tier 1 (Day 0): Ensures photos & emergency numbers are wiped.
 * 2. Tier 2 (3 Years): Wipes phone number and permanent address.
 * 3. Tier 3 (5 Years): Completely deletes the record from database storage.
 */
export function applyDpdpLifecycleSweep(logs: ComplianceLogEntry[]): {
  sanitizedLogs: ComplianceLogEntry[];
  purged3YCount: number;
  deleted5YCount: number;
} {
  const now = Date.now();
  let purged3YCount = 0;
  let deleted5YCount = 0;

  const sanitizedLogs: ComplianceLogEntry[] = [];

  for (const log of logs) {
    const checkoutTime = log.checkoutTimestamp || log.timestamp || now;
    const ageMs = now - checkoutTime;

    // Tier 3: 5-Year Master Purge (Complete Eradication)
    if (ageMs >= FIVE_YEARS_MS) {
      deleted5YCount++;
      continue; // Dropped permanently
    }

    const sanitized = { ...log };

    // Tier 1: Day 0 (Ensure Photo & Emergency contacts are wiped)
    sanitized.photoUrl = undefined;
    sanitized.isPhotoPurged = true;
    sanitized.emergencyPhone = "[PURGED ON CHECKOUT - DPDP ACT 2023]";
    sanitized.emergencyRelation = "Purged";
    sanitized.isEmergencyContactPurged = true;
    sanitized.aadhaarNumber = maskAadhaarNumber(sanitized.aadhaarNumber);

    // Tier 2: 3-Year Expiry (Wipe Phone and Address)
    if (ageMs >= THREE_YEARS_MS) {
      sanitized.phone = "[PURGED - 3-YEAR RETENTION EXPIRED]";
      sanitized.address = "[PURGED - 3-YEAR RETENTION EXPIRED]";
      sanitized.dpdpStatus = "PHONE_ADDRESS_PURGED";
      purged3YCount++;
    } else {
      sanitized.dpdpStatus = "PHOTO_PURGED";
    }

    sanitizedLogs.push(sanitized);
  }

  return {
    sanitizedLogs,
    purged3YCount,
    deleted5YCount,
  };
}
