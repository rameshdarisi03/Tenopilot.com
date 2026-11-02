import { occupantStore, Occupant } from "@/constants/mockOccupants";

/**
 * Searches the occupant directory for an existing occupant with a matching 10-digit mobile number
 * @param phone Raw or formatted phone number
 * @param propertyId Optional propertyId to scope lookup
 * @returns Matching Occupant or null
 */
export function lookupExistingOccupant(phone: string, propertyId?: string): Occupant | null {
  if (!phone) return null;
  const cleanInput = phone.replace(/\D/g, "");
  
  // Must have at least 10 digits to perform unambiguous search
  if (cleanInput.length < 10) return null;

  const target10 = cleanInput.slice(-10);
  const list = occupantStore.getOccupants(propertyId);

  const found = list.find((occ) => {
    if (!occ.phone || occ.lifecycleStatus === "Past") return false;
    const cleanOccPhone = occ.phone.replace(/\D/g, "");
    return cleanOccPhone.slice(-10) === target10;
  });

  return found || null;
}

/**
 * Searches the occupant directory for an active occupant with a matching email address
 * @param email Email address to search
 * @param propertyId Optional propertyId to scope lookup
 * @returns Matching Occupant or null
 */
export function lookupExistingOccupantByEmail(email: string, propertyId?: string): Occupant | null {
  if (!email) return null;
  const cleanInput = email.trim().toLowerCase();
  if (cleanInput.length < 4 || !cleanInput.includes("@")) return null;

  const list = occupantStore.getOccupants(propertyId);

  const found = list.find((occ) => {
    if (!occ.email || occ.lifecycleStatus === "Past") return false;
    return occ.email.trim().toLowerCase() === cleanInput;
  });

  return found || null;
}

/**
 * Formats a bed code cleanly (e.g. "Bed B" -> "Bed B", "B" -> "Bed B")
 */
export function formatBedLabel(bedCode?: string): string {
  if (!bedCode) return "";
  const trimmed = bedCode.trim();
  return /^bed\s+/i.test(trimmed) ? trimmed : `Bed ${trimmed}`;
}

export interface DefaulterRecord {
  occupant: Occupant;
  name: string;
  phone: string;
  aadhaarNumber?: string;
  roomNumber: string;
  stayType: "Tenant" | "Guest";
  exitDisposition: "ABSCONDED" | "DEFAULTED";
  badDebtAmount: number;
  incidentDate: string;
  notes?: string;
}

/**
 * Searches the occupant directory for any past resident (Tenant or Guest) who absconded or defaulted on rent
 */
export function lookupBlacklistedDefaulter(
  phone?: string,
  aadhaar?: string,
  propertyId?: string
): DefaulterRecord | null {
  if (!phone && !aadhaar) return null;

  const cleanPhone = (phone || "").replace(/\D/g, "");
  const target10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : "";
  const cleanAadhaar = (aadhaar || "").replace(/\D/g, "");

  const list = occupantStore.getOccupants(propertyId) || [];

  const found = list.find((occ) => {
    // Only flag records marked as ABSCONDED or DEFAULTED or having recorded bad debt
    const isDefaulter =
      occ.exitDisposition === "ABSCONDED" ||
      occ.exitDisposition === "DEFAULTED" ||
      (occ.lifecycleStatus === "Past" && (occ.badDebtAmount || 0) > 0) ||
      occ.checkoutSettlement?.exitDisposition === "ABSCONDED" ||
      occ.checkoutSettlement?.exitDisposition === "DEFAULTED" ||
      (occ.checkoutSettlement?.badDebtWrittenOff || 0) > 0;

    if (!isDefaulter) return false;

    // Check 1: 10-digit Phone Match
    if (target10 && occ.phone) {
      const cleanOccPhone = occ.phone.replace(/\D/g, "");
      if (cleanOccPhone.length >= 10 && cleanOccPhone.slice(-10) === target10) {
        return true;
      }
    }

    // Check 2: Aadhaar Match (if valid Aadhaar digits present)
    if (cleanAadhaar && cleanAadhaar.length >= 8 && occ.aadhaarNumber) {
      const occAadhaarDigits = occ.aadhaarNumber.replace(/\D/g, "");
      if (occAadhaarDigits && occAadhaarDigits.length >= 8 && occAadhaarDigits === cleanAadhaar) {
        return true;
      }
    }

    return false;
  });

  if (!found) return null;

  const rawBadDebt =
    found.badDebtAmount ||
    found.checkoutSettlement?.badDebtWrittenOff ||
    (found.lifecycleStatus === "Past" ? found.arrearsBalance || 0 : 0);

  return {
    occupant: found,
    name: found.name,
    phone: found.phone,
    aadhaarNumber: found.aadhaarNumber,
    roomNumber: found.roomNumber || "N/A",
    stayType: found.stayType || "Tenant",
    exitDisposition: (found.exitDisposition || found.checkoutSettlement?.exitDisposition || "ABSCONDED") as "ABSCONDED" | "DEFAULTED",
    badDebtAmount: Math.max(0, rawBadDebt),
    incidentDate: found.vacatingDate || found.checkoutSettlement?.settledDate || "Previous Stay",
    notes: found.notes || found.checkoutSettlement?.notes || "",
  };
}
