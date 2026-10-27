// TenoPilot Unified Invoice & Receipt Number Generation Engine
import { PropertySettingsData } from "@/constants/propertySettings";
import { Occupant, occupantStore } from "@/constants/mockOccupants";

export interface GenerateReceiptOptions {
  date?: Date | string;
  existingOccupants?: Occupant[];
  propertyId?: string;
  manualSequence?: number;
  offset?: number;
  additionalExistingReceipts?: string[];
}

/**
 * Format a receipt number according to the property's invoice config:
 * 1. "SEQUENTIAL": `${prefix}${startNumber + offset}` (e.g. INV-1001, INV-1002, ...)
 * 2. "DATE_BASED": `${prefix}${DDMMYY}-${counter}` (e.g. INV-271026-01, INV-271026-02, ...)
 * 
 * Auto-increments reliably by scanning all existing receipts in the property ledger
 * and persistent storage cache to prevent duplicates or repeating starting numbers.
 */
export function generateReceiptNumber(
  settings?: Partial<PropertySettingsData>,
  options?: GenerateReceiptOptions
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

  // Resolve existing occupants from options or store
  let occupants: Occupant[] = options?.existingOccupants || [];
  if (occupants.length === 0 && options?.propertyId) {
    occupants = occupantStore.getOccupants(options.propertyId);
  }

  // Collect all existing receipt numbers across occupants + in-flight batch receipts
  const allReceiptNos: string[] = [...(options?.additionalExistingReceipts || [])];
  occupants.forEach((occ) => {
    (occ.paymentHistory || []).forEach((p) => {
      if (p.receiptNo) {
        allReceiptNos.push(p.receiptNo);
      }
    });
  });

  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Format 1: Date-Based format: INV-DDMMYY-01
  if (formatType === "DATE_BASED") {
    const day = String(safeDate.getDate()).padStart(2, "0");
    const month = String(safeDate.getMonth() + 1).padStart(2, "0");
    const yearShort = String(safeDate.getFullYear()).slice(-2);
    const dateStamp = `${day}${month}${yearShort}`; // e.g. "271026"

    let maxDaily = 0;

    // Check localStorage cache if available in browser
    if (options?.propertyId && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`tenopilot_last_date_seq_${options.propertyId}_${dateStamp}`);
        if (cached && !isNaN(Number(cached))) {
          maxDaily = Math.max(maxDaily, Number(cached));
        }
      } catch {}
    }

    // Scan all receipts matching prefix + dateStamp + -digits (e.g. INV-271026-01)
    const regex = new RegExp(`^${escapedPrefix}${dateStamp}-(\\d+)$`, "i");
    allReceiptNos.forEach((rNo) => {
      if (!rNo) return;
      const match = rNo.trim().match(regex);
      if (match) {
        const count = parseInt(match[1], 10);
        if (!isNaN(count) && count > maxDaily) {
          maxDaily = count;
        }
      }
    });

    const dailyCount = options?.manualSequence !== undefined
      ? options.manualSequence
      : maxDaily + 1 + (options?.offset || 0);

    // Save to persistent cache
    if (options?.propertyId && typeof window !== "undefined") {
      try {
        localStorage.setItem(`tenopilot_last_date_seq_${options.propertyId}_${dateStamp}`, String(dailyCount));
      } catch {}
    }

    const counterStr = String(dailyCount).padStart(2, "0");
    return `${prefix}${dateStamp}-${counterStr}`;
  }

  // Format 2: Sequential format: INV-1001
  const startNum = Number(config.startNumber) || 1001;
  let maxSeq = startNum - 1;

  // Check localStorage cache if available in browser
  if (options?.propertyId && typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`tenopilot_last_invoice_seq_${options.propertyId}`);
      if (cached && !isNaN(Number(cached))) {
        maxSeq = Math.max(maxSeq, Number(cached));
      }
    } catch {}
  }

  // Scan all receipts matching prefix + digits (e.g. INV-1001)
  const regex = new RegExp(`^${escapedPrefix}(\\d+)$`, "i");
  allReceiptNos.forEach((rNo) => {
    if (!rNo) return;
    const match = rNo.trim().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  const nextSeq = options?.manualSequence !== undefined
    ? startNum + options.manualSequence - 1
    : maxSeq + 1 + (options?.offset || 0);

  // Save to persistent cache
  if (options?.propertyId && typeof window !== "undefined") {
    try {
      localStorage.setItem(`tenopilot_last_invoice_seq_${options.propertyId}`, String(nextSeq));
    } catch {}
  }

  return `${prefix}${nextSeq}`;
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
