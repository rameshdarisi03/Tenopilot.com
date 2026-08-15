/**
 * TenoPilot FastTrack Engine A: Client-Side Heuristic & Pattern Parser
 * Highly optimized, zero-lag parser for messy Indian PG spreadsheets, CSVs, TSVs, and clipboard paste.
 */

import Papa from "papaparse";

export interface FastTrackParsedRow {
  id: string;
  fullName: string;
  phone: string;
  roomNumber: string;
  bedCode?: string;
  sharingType?: number;
  sharingLabel?: string;
  rentAmount: number;
  securityDeposit: number;
  joiningDate: string;
  paymentMode: string;
  blockName?: string;
  floorName?: string;
  isCurrentMonthRentPaid?: boolean; // Rent Paid This Month (Yes / No, default false)
  priorArrearsAmount?: number; // Previous Arrears / Pending Due (default 0)
  isValid: boolean;
  warnings: string[];
  rawSource?: string;
}

export interface FastTrackParseResult {
  success: boolean;
  source: "FAST_HEURISTIC" | "AI_VISION" | "MANUAL";
  rows: FastTrackParsedRow[];
  totalDetected: number;
  validCount: number;
  warningCount: number;
  confidenceScore: number; // 0 to 100
  detectedColumns: {
    nameIndex: number;
    phoneIndex: number;
    roomIndex: number;
    rentIndex: number;
    depositIndex: number;
    dateIndex: number;
    bedIndex: number;
    sharingIndex: number;
  };
  inferredFloors: string[];
  inferredRooms: { roomNumber: string; occupantCount: number; sharingCapacity?: number; blockName?: string; floorName?: string }[];
}

const INDIAN_PHONE_REGEX = /(?:(?:\+|0{0,2})91[\s.-]?)?([6-9]\d{9})\b/;
const STRICT_10_DIGIT_PHONE = /^[6-9]\d{9}$/;
const ROOM_REGEX = /\b(?:room|kholi|flat|unit|rm)?\s*([A-Za-z0-9\-_]{1,6})\b/i;
const CURRENCY_CLEAN_REGEX = /[^\d.]/g;

/**
 * Normalizes Indian Phone Number to standard 10 digits (e.g., +91 98765-43210 or 098450 11003 -> 9845011003)
 */
export function normalizeIndianPhoneNumber(rawPhone: string | number | undefined): string {
  if (!rawPhone) return "";
  const str = String(rawPhone).trim();
  const digitsOnly = str.replace(/\D/g, "");

  if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
    return digitsOnly;
  }
  // If 11 digits starting with 0: e.g. 09845011003 -> 9845011003
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0") && /^[6-9]/.test(digitsOnly.slice(1))) {
    return digitsOnly.slice(1);
  }
  // If 12 digits starting with 91: e.g. 919845011003 -> 9845011003
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91") && /^[6-9]/.test(digitsOnly.slice(2))) {
    return digitsOnly.slice(2);
  }
  // If ends with 10 digits starting with [6-9]
  if (digitsOnly.length > 10 && /^[6-9]/.test(digitsOnly.slice(-10))) {
    return digitsOnly.slice(-10);
  }
  return digitsOnly.slice(0, 10);
}

/**
 * Converts "rahul sharma" -> "Rahul Sharma"
 */
export function formatProperCaseName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type DateFormatMode = "AUTO" | "DD-MM-YYYY" | "MM-DD-YYYY" | "YYYY-MM-DD";

/**
 * Cross-Row Anchor Date Heuristic:
 * Scans all dates across the spreadsheet to unambiguously determine whether the sheet is DD/MM/YYYY or MM/DD/YYYY.
 * If any date has first segment > 12 (e.g. 21/3/2026), format is mathematically DD/MM/YYYY.
 * If any date has second segment > 12 (e.g. 3/21/2026), format is MM/DD/YYYY.
 */
export function detectBatchDateFormat(rawDates: string[]): "DD-MM-YYYY" | "MM-DD-YYYY" | "YYYY-MM-DD" {
  let hasFirstSegmentOver12 = false; // Indicates DD/MM/YYYY
  let hasSecondSegmentOver12 = false; // Indicates MM/DD/YYYY
  let hasIsoYearFirst = false; // Indicates YYYY-MM-DD

  for (const raw of rawDates) {
    if (!raw) continue;
    const str = raw.trim();
    if (/^\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}/.test(str)) {
      hasIsoYearFirst = true;
      continue;
    }
    const match = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
    if (match) {
      const p1 = parseInt(match[1], 10);
      const p2 = parseInt(match[2], 10);
      if (p1 > 12 && p2 <= 12) {
        hasFirstSegmentOver12 = true;
      } else if (p2 > 12 && p1 <= 12) {
        hasSecondSegmentOver12 = true;
      }
    }
  }

  if (hasSecondSegmentOver12) return "MM-DD-YYYY";
  if (hasFirstSegmentOver12) return "DD-MM-YYYY";
  if (hasIsoYearFirst) return "YYYY-MM-DD";
  return "DD-MM-YYYY"; // Default to Indian standard DD-MM-YYYY
}

/**
 * Parse Date String into YYYY-MM-DD with Anchor Date Deduction
 */
export function normalizeDateToYYYYMMDD(
  rawDate: string | undefined,
  formatMode: "AUTO" | "DD-MM-YYYY" | "MM-DD-YYYY" | "YYYY-MM-DD" = "AUTO"
): string {
  const today = new Date().toISOString().split("T")[0];
  if (!rawDate) return today;
  const str = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or MM/DD/YYYY
  const partsMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (partsMatch) {
    let day = partsMatch[1].padStart(2, "0");
    let month = partsMatch[2].padStart(2, "0");
    let year = partsMatch[3];
    if (year.length === 2) year = `20${year}`;

    const p1 = parseInt(partsMatch[1], 10);
    const p2 = parseInt(partsMatch[2], 10);

    if (formatMode === "MM-DD-YYYY" || (formatMode === "AUTO" && p2 > 12 && p1 <= 12)) {
      // Month was first
      month = partsMatch[1].padStart(2, "0");
      day = partsMatch[2].padStart(2, "0");
    } else {
      // Day was first (Standard Indian DD/MM/YYYY)
      day = partsMatch[1].padStart(2, "0");
      month = partsMatch[2].padStart(2, "0");
    }

    return `${year}-${month}-${day}`;
  }

  // 01-Aug-2026 or 01 Aug 2026
  const monMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const textualMatch = str.match(/^(\d{1,2})[\s\-]([A-Za-z]{3})[\s\-](\d{2,4})$/i);
  if (textualMatch) {
    const day = textualMatch[1].padStart(2, "0");
    const month = monMap[textualMatch[2].toLowerCase()] || "01";
    let year = textualMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Attempt standard JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return today;
}

/**
 * Parse Currency with Indian Formats (₹12,000, 14000/-, Rs. 14,000, 12000)
 */
export function parseIndianCurrencyAmount(raw: string | number | undefined, defaultVal: number = 0): number {
  if (raw === undefined || raw === null) return defaultVal;
  const str = String(raw).trim();
  if (!str) return defaultVal;
  let clean = str.replace(/[₹$Rs\.INR\s\/-]/gi, "").replace(/,/g, "");
  if (/^\d+\.\d{3}$/.test(clean)) clean = clean.replace(".", "");
  const num = parseFloat(clean);
  return isNaN(num) || num <= 0 ? defaultVal : Math.round(num);
}

/**
 * Helper to parse sharing capacity (e.g. "Single", "2-Sharing", "Triple", "4", "Double")
 */
export function parseSharingType(val: string | undefined): { count: number; label: string } {
  if (!val) return { count: 2, label: "2-Sharing" };
  const str = val.trim().toLowerCase();
  if (/single|1\s*-?\s*shar|private|^1$/i.test(str)) return { count: 1, label: "Single Room" };
  if (/double|2\s*-?\s*shar|two|^2$/i.test(str)) return { count: 2, label: "2-Sharing" };
  if (/triple|3\s*-?\s*shar|three|^3$/i.test(str)) return { count: 3, label: "3-Sharing" };
  if (/four|4\s*-?\s*shar|quad|^4$/i.test(str)) return { count: 4, label: "4-Sharing" };
  const num = parseInt(str.replace(/\D/g, ""), 10);
  if (num >= 1 && num <= 6) return { count: num, label: `${num}-Sharing` };
  return { count: 2, label: "2-Sharing" };
}

/**
 * Intelligent Alpha-numeric Room & Floor Inferencer (e.g. A01, A101, B01, B201, G01, 101)
 */
export function inferRoomBlockAndFloor(roomStr: string): { blockName: string; floorName: string; cleanRoom: string } {
  const clean = roomStr.trim().toUpperCase().replace(/^ROOM\s*/i, "");

  // 1. Ground Floor: e.g. G01, GF1, G-1, GROUND-1, G1
  if (/^(?:G|GF|GROUND)[\-_]?\d+/i.test(clean)) {
    return {
      blockName: "Main Building",
      floorName: "Ground Floor",
      cleanRoom: clean,
    };
  }

  // 2. Check Block Prefix: e.g. A01, A1, A101, B02, B201
  const blockMatch = clean.match(/^([A-Z])[\-_]?(\d{1,4}[A-Z]?)$/i);
  if (blockMatch) {
    const blockLetter = blockMatch[1].toUpperCase();
    const restNumber = blockMatch[2];
    let floor = "Floor 01";
    if (restNumber.length >= 3 && /^[1-9]/.test(restNumber)) {
      floor = `Floor 0${restNumber.charAt(0)}`;
    } else if (/^0\d+$/.test(restNumber) || /^0$/.test(restNumber)) {
      floor = "Ground Floor";
    }
    return {
      blockName: `Block ${blockLetter}`,
      floorName: floor,
      cleanRoom: clean,
    };
  }

  // 3. Standard Floor Prefix: e.g. 101, 201, 301, 401
  if (/^[1-9]\d{2}/.test(clean)) {
    const flNum = clean.charAt(0);
    return {
      blockName: "Main Building",
      floorName: `Floor 0${flNum}`,
      cleanRoom: clean,
    };
  }

  // 4. Default Fallback
  return {
    blockName: "Main Building",
    floorName: "Floor 01",
    cleanRoom: clean || "101",
  };
}

/**
 * Core Heuristic Parser: Ingests raw clipboard text, CSV string, or matrix
 */
export function parseRawSpreadsheetText(
  rawInput: string,
  defaultRentalTiers?: { sharing1: number; sharing2: number; sharing3: number; sharing4: number }
): FastTrackParseResult {
  const fallbackRent = defaultRentalTiers?.sharing2 || 12000;
  const fallbackDeposit = fallbackRent * 2;

  if (!rawInput || !rawInput.trim()) {
    return {
      success: false,
      source: "FAST_HEURISTIC",
      rows: [],
      totalDetected: 0,
      validCount: 0,
      warningCount: 0,
      confidenceScore: 0,
      detectedColumns: { nameIndex: -1, phoneIndex: -1, roomIndex: -1, rentIndex: -1, depositIndex: -1, dateIndex: -1, bedIndex: -1, sharingIndex: -1 },
      inferredFloors: [],
      inferredRooms: [],
    };
  }

  // Parse using PapaParse to handle CSV, TSV, commas, quotes, and tabs
  const parsedCsv = Papa.parse<string[]>(rawInput.trim(), {
    skipEmptyLines: "greedy",
  });

  const rawRowsBeforeMerge = parsedCsv.data.filter((r) => r && r.length > 0 && r.some((c) => c && c.trim()));

  // Fix accidental comma splits in unquoted currency numbers (e.g. ["Rs. 14", "000"] -> ["Rs. 14000"])
  const rawRows = rawRowsBeforeMerge.map((row) => {
    const fixed: string[] = [];
    for (let i = 0; i < row.length; i++) {
      const current = (row[i] || "").trim();
      const next = (row[i + 1] || "").trim();
      const isPhoneLike = /^(?:\+?91|0)?[6-9]\d{8,10}$/.test(current.replace(/[\s\-]/g, ""));
      const isCurrencyLike = /(?:₹|\$|Rs\.?|INR)/i.test(current) || (/^\d{1,3}$/.test(current) && /^\d{3}(?:\/-)?$/.test(next));

      if (!isPhoneLike && isCurrencyLike && /^\d{3}(?:\/-)?$/i.test(next)) {
        fixed.push(`${current}${next}`);
        i++; // skip next since it's merged
      } else {
        fixed.push(current);
      }
    }
    return fixed;
  });

  if (rawRows.length === 0) {
    return {
      success: false,
      source: "FAST_HEURISTIC",
      rows: [],
      totalDetected: 0,
      validCount: 0,
      warningCount: 0,
      confidenceScore: 0,
      detectedColumns: { nameIndex: -1, phoneIndex: -1, roomIndex: -1, rentIndex: -1, depositIndex: -1, dateIndex: -1, bedIndex: -1, sharingIndex: -1 },
      inferredFloors: [],
      inferredRooms: [],
    };
  }

  // Determine max columns
  const maxCols = Math.max(...rawRows.map((r) => r.length));

  // Step 1: Detect Header Row
  let headerRowIndex = -1;
  const colScores = {
    name: new Array(maxCols).fill(0),
    phone: new Array(maxCols).fill(0),
    room: new Array(maxCols).fill(0),
    rent: new Array(maxCols).fill(0),
    deposit: new Array(maxCols).fill(0),
    date: new Array(maxCols).fill(0),
    bed: new Array(maxCols).fill(0),
    sharing: new Array(maxCols).fill(0),
    rentPaid: new Array(maxCols).fill(0),
    arrears: new Array(maxCols).fill(0),
  };

  const nameKeywords = /\b(?:full\s*name|tenant\s*name|resident\s*name|student\s*name|customer\s*name|occupant\s*name|member\s*name|name|tenant|resident|student|candidate|boy|girl|member|cust|occupant)\b/i;
  const roomKeywords = /\b(?:room\s*number|room\s*no|room\s*#|room_num|unit\s*no|flat\s*no|kholi\s*no|suite\s*no|room|kholi|flat|unit|rm|r\.no|r\s*no)\b/i;
  const phoneKeywords = /\b(?:mobile\s*number|mobile\s*no|phone\s*number|phone\s*no|contact\s*number|contact\s*no|whatsapp\s*no|cell\s*no|mobile|phone|contact|cell|whatsapp|wp|mob|tel)\b/i;
  const rentPaidKeywords = /\b(?:rent\s*paid|is_paid|paid\?|rent\s*status|payment\s*status|paid\s*status|current\s*rent\s*paid)\b/i;
  const rentKeywords = /\b(?:monthly\s*rent|rent\s*amount|monthly\s*fee|tariff\s*amount|tariff|bhadha|rent|monthly)\b/i;
  const depositKeywords = /\b(?:security\s*deposit|advance\s*amount|caution\s*deposit|deposit\s*amount|token\s*amount|deposit|advance|security|caution|token|adv|dep|sec\s*dep)\b/i;
  const arrearsKeywords = /\b(?:prior\s*arrears|arrears\s*amount|unpaid\s*dues|old\s*dues|pending\s*dues|arrears|dues|balance|pending\s*amount)\b/i;
  const dateKeywords = /\b(?:joining\s*date|join\s*date|move\s*in\s*date|check\s*in\s*date|entry\s*date|start\s*date|doj|admission\s*date|date\s*of\s*joining|joining|move\s*in|check\s*in|admit|date)\b/i;
  const sharingKeywords = /\b(?:sharing\s*type|room\s*sharing|room\s*type|bed\s*type|occupancy\s*type|sharing|occupancy|capacity|share)\b/i;
  const bedKeywords = /\b(?:bed\s*slot|bed\s*number|bed\s*no|cot\s*no|slot\s*no|cot|bed|slot|berth)\b/i;

  for (let rIdx = 0; rIdx < Math.min(rawRows.length, 8); rIdx++) {
    const row = rawRows[rIdx];
    const filledCols = row.filter((c) => c && c.trim()).length;
    if (filledCols < 2) continue; // Single-cell banner title rows cannot be table headers!

    let matchedKeywords = 0;
    row.forEach((cell) => {
      const c = (cell || "").trim();
      if (nameKeywords.test(c)) matchedKeywords++;
      if (roomKeywords.test(c)) matchedKeywords++;
      if (phoneKeywords.test(c)) matchedKeywords++;
      if (rentPaidKeywords.test(c)) matchedKeywords++;
      else if (rentKeywords.test(c)) matchedKeywords++;
      if (depositKeywords.test(c)) matchedKeywords++;
      if (arrearsKeywords.test(c)) matchedKeywords++;
      if (dateKeywords.test(c)) matchedKeywords++;
      if (sharingKeywords.test(c)) matchedKeywords++;
      if (bedKeywords.test(c)) matchedKeywords++;
    });

    if (matchedKeywords >= 2) {
      headerRowIndex = rIdx;
      break;
    }
  }

  // If header row found, evaluate header text directly
  let nameCol = -1;
  let phoneCol = -1;
  let roomCol = -1;
  let rentCol = -1;
  let depositCol = -1;
  let dateCol = -1;
  let bedCol = -1;
  let sharingCol = -1;
  let rentPaidCol = -1;
  let arrearsCol = -1;

  if (headerRowIndex !== -1) {
    const headerRow = rawRows[headerRowIndex];
    headerRow.forEach((cell, idx) => {
      const c = (cell || "").trim();
      if (nameKeywords.test(c) && !depositKeywords.test(c) && !rentKeywords.test(c) && !arrearsKeywords.test(c)) nameCol = idx;
      else if (rentPaidKeywords.test(c)) rentPaidCol = idx;
      else if (arrearsKeywords.test(c)) arrearsCol = idx;
      else if (depositKeywords.test(c)) depositCol = idx;
      else if (rentKeywords.test(c)) rentCol = idx;
      else if (roomKeywords.test(c)) roomCol = idx;
      else if (phoneKeywords.test(c)) phoneCol = idx;
      else if (sharingKeywords.test(c)) sharingCol = idx;
      else if (dateKeywords.test(c)) dateCol = idx;
      else if (bedKeywords.test(c)) bedCol = idx;
    });
  }

  // Step 2: Content-Based Type Inferencing across data rows (for missing/ambiguous columns)
  const dataStartRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
  const dataRows = rawRows.slice(dataStartRow);

  dataRows.forEach((row) => {
    row.forEach((cell, colIdx) => {
      const val = (cell || "").trim();
      if (!val) return;

      // Check phone pattern
      if (INDIAN_PHONE_REGEX.test(val)) {
        colScores.phone[colIdx] += 4;
      }

      // Check numeric amounts (rent vs deposit vs arrears)
      const numVal = parseIndianCurrencyAmount(val, 0);
      if (numVal >= 1000 && numVal <= 200000) {
        if (/adv|dep|sec/i.test(val)) {
          colScores.deposit[colIdx] += 3;
        } else {
          colScores.rent[colIdx] += 2;
        }
      }

      // Pure numbers or currency values should NEVER be scored as names
      if (/^\s*[\d₹$Rs.,\/-]+\s*$/i.test(val)) {
        colScores.name[colIdx] -= 10;
      }

      // Check room pattern (supports A01, B201, G01, 101, but excludes standalone 0)
      if (/^(?:[A-Za-z]?\d{1,4}[A-Za-z]?|[Gg][Ff]?[\-_]?\d{1,2}|[1-9][A-Za-z])$/.test(val) || /^Room\s*[A-Za-z0-9]+/i.test(val)) {
        if (val !== "0" && val !== "00") {
          colScores.room[colIdx] += 3;
        }
      }

      // Check sharing type pattern
      if (/^(?:single|double|triple|quad|private|[1-4]\s*-?\s*shar(?:ing)?)$/i.test(val)) {
        colScores.sharing[colIdx] += 4;
      }

      // Check date pattern
      if (/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(val) || /^\d{4}-\d{2}-\d{2}$/.test(val) || /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(val)) {
        colScores.date[colIdx] += 3;
      }

      // Check rent paid boolean pattern
      if (/^(?:yes|no|paid|due|unpaid|true|false|done|pending)$/i.test(val)) {
        colScores.rentPaid[colIdx] += 4;
      }

      // Check name pattern (letters, 1 to 4 words, no pure digits)
      if (/^[A-Za-z\s.'()-]{3,40}$/.test(val) && !/^(room|floor|bed|rent|advance|paid|unpaid|cash|upi|gpay|kholi|single|double|triple|yes|no)$/i.test(val)) {
        colScores.name[colIdx] += 1;
      }
    });
  });

  // Assign columns based on highest score if not already locked by header
  if (nameCol === -1) nameCol = getBestColumnIndex(colScores.name, [phoneCol, roomCol, rentCol, depositCol, sharingCol, rentPaidCol, arrearsCol]);
  if (phoneCol === -1) phoneCol = getBestColumnIndex(colScores.phone, [nameCol, roomCol, rentCol, depositCol, sharingCol, rentPaidCol, arrearsCol]);
  if (roomCol === -1) roomCol = getBestColumnIndex(colScores.room, [phoneCol, nameCol, rentCol, depositCol, sharingCol, rentPaidCol, arrearsCol]);
  if (sharingCol === -1) sharingCol = getBestColumnIndex(colScores.sharing, [phoneCol, nameCol, roomCol, rentCol, depositCol, rentPaidCol, arrearsCol]);
  if (rentCol === -1) rentCol = getBestColumnIndex(colScores.rent, [phoneCol, roomCol, nameCol, depositCol, sharingCol, rentPaidCol, arrearsCol]);
  if (depositCol === -1) depositCol = getBestColumnIndex(colScores.deposit, [phoneCol, roomCol, nameCol, rentCol, sharingCol, rentPaidCol, arrearsCol]);
  if (dateCol === -1) dateCol = getBestColumnIndex(colScores.date, [phoneCol, roomCol, nameCol, rentCol, depositCol, sharingCol, rentPaidCol, arrearsCol]);
  if (rentPaidCol === -1) rentPaidCol = getBestColumnIndex(colScores.rentPaid, [phoneCol, roomCol, nameCol, rentCol, depositCol, sharingCol, dateCol, arrearsCol]);

  // Fallback defaults if still unbound
  if (nameCol === -1) nameCol = 0;
  if (phoneCol === -1 && maxCols > 1) phoneCol = nameCol === 0 ? 1 : 0;
  if (roomCol === -1 && maxCols > 2) roomCol = [0, 1, 2].find((i) => i !== nameCol && i !== phoneCol) ?? 2;

  // Step 3: Build Structured Occupant Rows
  const parsedOccupants: FastTrackParsedRow[] = [];
  const roomOccupancyMap = new Map<string, number>();
  const roomSharingMap = new Map<string, number>();

  dataRows.forEach((row, rowIdx) => {
    const rawLine = row.join(" | ");
    let rawName = (row[nameCol] || "").trim();
    let rawPhone = (row[phoneCol] || "").trim();
    let rawRoom = (row[roomCol] || "").trim();
    let rawSharing = sharingCol !== -1 ? (row[sharingCol] || "").trim() : "";
    let rawRent = rentCol !== -1 ? (row[rentCol] || "").trim() : "";
    let rawDeposit = depositCol !== -1 ? (row[depositCol] || "").trim() : "";
    let rawDate = dateCol !== -1 ? (row[dateCol] || "").trim() : "";
    let rawBed = bedCol !== -1 ? (row[bedCol] || "").trim() : "";
    let rawRentPaid = rentPaidCol !== -1 ? (row[rentPaidCol] || "").trim() : "";
    let rawArrears = arrearsCol !== -1 ? (row[arrearsCol] || "").trim() : "";

    // Compound cell splitting: e.g. "Rahul (9876543210)" in name
    if (rawName && !rawPhone) {
      const phoneInName = rawName.match(INDIAN_PHONE_REGEX);
      if (phoneInName) {
        rawPhone = phoneInName[1];
        rawName = rawName.replace(INDIAN_PHONE_REGEX, "").replace(/[()\-]/g, "").trim();
      }
    }

    // Compound room: e.g. "101-Bed A" or "Room A101 (Double)"
    if (rawRoom) {
      const stripped = rawRoom.replace(/^(?:room|kholi|flat|unit|rm|r\.no|r\s*no)\s*/i, "").trim();
      const roomMatch = stripped.match(/\b([A-Za-z0-9\-_]{1,6})\b/);
      if (roomMatch) {
        rawRoom = roomMatch[1].toUpperCase();
      } else if (stripped) {
        rawRoom = stripped.split(/\s+/)[0].toUpperCase();
      }
    }

    // Skip empty lines, pure header echoes, or single-cell title banners
    if (!rawName && !rawPhone && !rawRoom) return;
    if (rawName.toLowerCase() === "name" || rawName.toLowerCase() === "tenant name" || rawName.toLowerCase() === "resident name") return;
    if (!rawPhone && !rawRoom && !rawRent && row.filter((c) => (c || "").trim()).length <= 2) return;

    // Normalize values
    const cleanName = formatProperCaseName(rawName) || `Resident ${rowIdx + 1}`;
    const cleanPhone = normalizeIndianPhoneNumber(rawPhone);
    const inferred = inferRoomBlockAndFloor(rawRoom || `10${(rowIdx % 4) + 1}`);
    const cleanRoom = inferred.cleanRoom;

    // Sharing type detection
    const parsedSharing = parseSharingType(rawSharing);
    if (!roomSharingMap.has(cleanRoom) && parsedSharing.count > 0) {
      roomSharingMap.set(cleanRoom, parsedSharing.count);
    }

    // 🛏️ Automatic Bed Allocation (Bed A, Bed B, Bed C...)
    const currentCountInRoom = (roomOccupancyMap.get(cleanRoom) || 0) + 1;
    roomOccupancyMap.set(cleanRoom, currentCountInRoom);
    const bedLetter = String.fromCharCode(64 + Math.min(currentCountInRoom, 26)); // A, B, C, D...
    const cleanBed = rawBed && /bed/i.test(rawBed) ? rawBed.toUpperCase() : `Bed ${bedLetter}`;

    // Clean monetary values
    let rentNum = parseIndianCurrencyAmount(rawRent, fallbackRent);
    if (rentNum <= 0) rentNum = fallbackRent;

    let depositNum = parseIndianCurrencyAmount(rawDeposit, rentNum * 2);
    if (depositNum <= 0) depositNum = rentNum * 2;

    const cleanDate = normalizeDateToYYYYMMDD(rawDate);
    const isPaid = /^(?:yes|true|paid|cleared|done)$/i.test(rawRentPaid);
    const arrearsNum = parseIndianCurrencyAmount(rawArrears, 0);

    const effectiveSharing = parsedSharing.count > 0 ? parsedSharing.count : (roomSharingMap.get(cleanRoom) || currentCountInRoom);
    const effectiveSharingLabel = parsedSharing.label || (effectiveSharing === 1 ? "Single Room" : `${effectiveSharing}-Sharing`);

    // Validation flags
    const warnings: string[] = [];
    if (!cleanPhone || !STRICT_10_DIGIT_PHONE.test(cleanPhone)) {
      warnings.push("Invalid or missing 10-digit mobile number");
    }
    if (!cleanRoom) {
      warnings.push("Missing room number assignment");
    }

    const isValid = warnings.length === 0;

    parsedOccupants.push({
      id: `ft_row_${Date.now()}_${rowIdx}`,
      fullName: cleanName,
      phone: cleanPhone,
      roomNumber: cleanRoom,
      bedCode: cleanBed,
      sharingType: effectiveSharing,
      sharingLabel: effectiveSharingLabel,
      rentAmount: rentNum,
      securityDeposit: depositNum,
      joiningDate: cleanDate,
      paymentMode: "UPI",
      blockName: inferred.blockName,
      floorName: inferred.floorName,
      isCurrentMonthRentPaid: isPaid,
      priorArrearsAmount: arrearsNum,
      isValid,
      warnings,
      rawSource: rawLine,
    });
  });

  // Calculate unique inferred floors and room capacities
  const uniqueRooms = Array.from(roomOccupancyMap.entries()).map(([roomNumber, occupantCount]) => {
    const inferred = inferRoomBlockAndFloor(roomNumber);
    const explicitSharing = roomSharingMap.get(roomNumber);
    const sharingCapacity = Math.max(occupantCount, explicitSharing || occupantCount);
    return {
      roomNumber,
      occupantCount,
      sharingCapacity,
      blockName: inferred.blockName,
      floorName: inferred.floorName,
    };
  });

  const inferredFloorsSet = new Set<string>();
  uniqueRooms.forEach(({ floorName, blockName }) => {
    if (blockName && blockName !== "Main Building") {
      inferredFloorsSet.add(`${blockName} - ${floorName}`);
    } else {
      inferredFloorsSet.add(floorName || "Floor 01");
    }
  });

  const validCount = parsedOccupants.filter((r) => r.isValid).length;
  const warningCount = parsedOccupants.length - validCount;
  const confidenceScore = parsedOccupants.length > 0 ? Math.round((validCount / parsedOccupants.length) * 100) : 0;

  return {
    success: parsedOccupants.length > 0,
    source: "FAST_HEURISTIC",
    rows: parsedOccupants,
    totalDetected: parsedOccupants.length,
    validCount,
    warningCount,
    confidenceScore,
    detectedColumns: {
      nameIndex: nameCol,
      phoneIndex: phoneCol,
      roomIndex: roomCol,
      rentIndex: rentCol,
      depositIndex: depositCol,
      dateIndex: dateCol,
      bedIndex: bedCol,
      sharingIndex: sharingCol,
    },
    inferredFloors: Array.from(inferredFloorsSet).sort(),
    inferredRooms: uniqueRooms,
  };
}

function getBestColumnIndex(scores: number[], excludeIndices: number[]): number {
  let maxScore = 0;
  let bestIdx = -1;
  scores.forEach((score, idx) => {
    if (!excludeIndices.includes(idx) && score > maxScore) {
      maxScore = score;
      bestIdx = idx;
    }
  });
  return maxScore > 0 ? bestIdx : -1;
}
