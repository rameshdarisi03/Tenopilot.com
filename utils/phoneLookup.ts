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
