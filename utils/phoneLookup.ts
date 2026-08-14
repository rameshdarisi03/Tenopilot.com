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
    if (!occ.phone) return false;
    const cleanOccPhone = occ.phone.replace(/\D/g, "");
    return cleanOccPhone.slice(-10) === target10;
  });

  return found || null;
}
