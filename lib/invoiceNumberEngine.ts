// TenoPilot Unified Invoice & Receipt Number Generation Engine
import { PropertySettingsData } from "@/constants/propertySettings";
import { Occupant } from "@/constants/mockOccupants";

/**
 * Format a receipt number according to the property's invoice config:
 * 1. "SEQUENTIAL": `${prefix}${startNumber + offset}` (e.g. INV-1001)
 * 2. "DATE_BASED": `${prefix}${DDMMYY}-${counter}` (e.g. INV-211026-01)
 */
export function generateReceiptNumber(
  settings?: Partial<PropertySettingsData>,
  options?: {
    date?: Date | string;
    existingOccupants?: Occupant[];
    manualSequence?: number;
  }
): string {
  const config = settings?.invoiceConfig || {
    formatType: "SEQUENTIAL",
    prefix: "INV-",
    startNumber: 1001,
  };

  const prefix = (config.prefix || "INV-").trim();
  const formatType = config.formatType || "SEQUENTIAL";

  const targetDate = options?.date ? new Date(options.date) : new Date();
  const safeDate = isNaN(targetDate.getTime()) ? new Date() : targetDate;

  // Format 1: Date-Based format: INV-DDMMYY-01
  if (formatType === "DATE_BASED") {
    const day = String(safeDate.getDate()).padStart(2, "0");
    const month = String(safeDate.getMonth() + 1).padStart(2, "0");
    const yearShort = String(safeDate.getFullYear()).slice(-2);
    const dateStamp = `${day}${month}${yearShort}`; // e.g. "211026"

    let dailyCount = 1;

    if (options?.manualSequence !== undefined) {
      dailyCount = options.manualSequence;
    } else if (options?.existingOccupants && options.existingOccupants.length > 0) {
      // Count existing receipts generated for this date stamp
      let matchCount = 0;
      options.existingOccupants.forEach((occ) => {
        (occ.paymentHistory || []).forEach((p) => {
          if (p.receiptNo && p.receiptNo.includes(dateStamp)) {
            matchCount++;
          }
        });
      });
      dailyCount = matchCount + 1;
    }

    const counterStr = String(dailyCount).padStart(2, "0");
    return `${prefix}${dateStamp}-${counterStr}`;
  }

  // Format 2: Sequential format: INV-1001
  const startNum = Number(config.startNumber) || 1001;
  let currentSeq = startNum;

  if (options?.manualSequence !== undefined) {
    currentSeq = startNum + options.manualSequence;
  } else if (options?.existingOccupants && options.existingOccupants.length > 0) {
    let totalReceiptsCount = 0;
    options.existingOccupants.forEach((occ) => {
      totalReceiptsCount += (occ.paymentHistory || []).length;
    });
    currentSeq = startNum + totalReceiptsCount;
  }

  return `${prefix}${currentSeq}`;
}

/**
 * Generate a sample preview string for settings live display
 */
export function getInvoiceNumberPreview(
  formatType: "SEQUENTIAL" | "DATE_BASED",
  prefix: string,
  startNumber: number
): string {
  const cleanPrefix = (prefix || "INV-").trim();
  const safeStart = Number(startNumber) || 1001;
  const now = new Date();

  if (formatType === "DATE_BASED") {
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const yearShort = String(now.getFullYear()).slice(-2);
    const dateStamp = `${day}${month}${yearShort}`;
    return `${cleanPrefix}${dateStamp}-01`;
  }

  return `${cleanPrefix}${safeStart}`;
}
