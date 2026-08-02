import { occupantStore, Occupant } from "@/constants/mockOccupants";

/**
 * Parses date string formats into standard Date object for comparison.
 * Supports "DD MMM YYYY" (e.g. "15 Aug 2026"), "YYYY-MM-DD", "DD/MM/YYYY"
 */
export function parseOccupantDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.includes("Pending") || dateStr === "—") return null;

  try {
    // Standard ISO format "YYYY-MM-DD"
    if (dateStr.includes("-") && dateStr.length === 10) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d;
    }

    // Format "DD MMM YYYY" e.g. "15 Aug 2026"
    const parts = dateStr.trim().split(" ");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const year = parseInt(parts[2], 10);
      const monthNames = [
        "jan", "feb", "mar", "apr", "may", "jun",
        "jul", "aug", "sep", "oct", "nov", "dec"
      ];
      const monthIdx = monthNames.findIndex((m) =>
        parts[1].toLowerCase().startsWith(m)
      );

      if (!isNaN(day) && !isNaN(year) && monthIdx >= 0) {
        return new Date(year, monthIdx, day);
      }
    }

    // Direct fallback
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  } catch {
    return null;
  }
}

/**
 * Silent Automated Move-In Date Auto-Checkin Engine.
 * Evaluates all occupants with lifecycleStatus === "Booked".
 * If today >= joiningDate, automatically transitions occupant to "Active" (🟢 ACTIVE TENANT).
 * Respects owner postponements (if joiningDate was pushed to future date, holds in "Booked").
 */
export function runAutoCheckInEngine(): number {
  if (typeof window === "undefined") return 0;

  const currentOccupants = occupantStore.getOccupants();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let transitionedCount = 0;
  let hasChanges = false;

  const updatedOccupants = currentOccupants.map((occ) => {
    if (occ.lifecycleStatus === "Booked") {
      const joiningDateObj = parseOccupantDate(occ.joiningDate);

      if (joiningDateObj) {
        joiningDateObj.setHours(0, 0, 0, 0);

        // Auto-Checkin Trigger: Today has reached or passed scheduled joining date!
        if (today >= joiningDateObj) {
          transitionedCount++;
          hasChanges = true;

          return {
            ...occ,
            lifecycleStatus: "Active" as const,
            paymentStatus: "Due" as const,
            daysRemainingText: "DUE TODAY",
            lastPaidDate: new Date().toLocaleDateString("en-GB"),
          };
        }
      }
    }
    return occ;
  });

  if (hasChanges) {
    occupantStore.updateOccupants(updatedOccupants);
  }

  return transitionedCount;
}
