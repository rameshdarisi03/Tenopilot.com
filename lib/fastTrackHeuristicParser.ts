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
  rentAmount: number;
  securityDeposit: number;
  joiningDate: string;
  paymentMode: string;
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
  };
  inferredFloors: string[];
  inferredRooms: { roomNumber: string; occupantCount: number }[];
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

/**
 * Parse Date String into YYYY-MM-DD
 */
export function normalizeDateToYYYYMMDD(rawDate: string | undefined): string {
  const today = new Date().toISOString().split("T")[0];
  if (!rawDate) return today;
  const str = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
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
      detectedColumns: { nameIndex: -1, phoneIndex: -1, roomIndex: -1, rentIndex: -1, depositIndex: -1, dateIndex: -1, bedIndex: -1 },
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
      detectedColumns: { nameIndex: -1, phoneIndex: -1, roomIndex: -1, rentIndex: -1, depositIndex: -1, dateIndex: -1, bedIndex: -1 },
      inferredFloors: [],
      inferredRooms: [],
    };
  }

  // Determine max columns
  const maxCols = Math.max(...rawRows.map((r) => r.length));

  // Step 1: Identify Header Row (scanning first 8 rows)
  let headerRowIndex = -1;
  const colScores = {
    name: new Array(maxCols).fill(0),
    phone: new Array(maxCols).fill(0),
    room: new Array(maxCols).fill(0),
    rent: new Array(maxCols).fill(0),
    deposit: new Array(maxCols).fill(0),
    date: new Array(maxCols).fill(0),
    bed: new Array(maxCols).fill(0),
  };

  const nameKeywords = /name|tenant|resident|student|candidate|boy|girl|member|cust|person|occupant/i;
  const phoneKeywords = /phone|mobile|contact|cell|ph|wp|whatsapp|mob|tel|calling|num/i;
  const roomKeywords = /room|kholi|flat|unit|rm|r\.no|r\s*no|room\s*no|room\s*#/i;
  const rentKeywords = /rent|monthly|fee|fees|tariff|amt|amount|price|rate|charge/i;
  const depositKeywords = /deposit|advance|security|caution|sec\s*dep|token|adv/i;
  const dateKeywords = /date|doj|joining|entry|admitted|start|move\s*in|check\s*in/i;
  const bedKeywords = /bed|slot|sharing|sharing\s*type|capacity/i;

  for (let rIdx = 0; rIdx < Math.min(rawRows.length, 8); rIdx++) {
    const row = rawRows[rIdx];
    const filledCols = row.filter((c) => c && c.trim()).length;
    if (filledCols < 2) continue; // Single-cell banner title rows cannot be table headers!

    let matchedKeywords = 0;
    row.forEach((cell) => {
      const c = (cell || "").trim();
      if (nameKeywords.test(c)) matchedKeywords++;
      if (phoneKeywords.test(c)) matchedKeywords++;
      if (roomKeywords.test(c)) matchedKeywords++;
      if (rentKeywords.test(c)) matchedKeywords++;
      if (depositKeywords.test(c)) matchedKeywords++;
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

  if (headerRowIndex !== -1) {
    const headerRow = rawRows[headerRowIndex];
    headerRow.forEach((cell, idx) => {
      const c = (cell || "").trim();
      if (nameKeywords.test(c) && !depositKeywords.test(c) && !rentKeywords.test(c)) nameCol = idx;
      else if (depositKeywords.test(c)) depositCol = idx;
      else if (rentKeywords.test(c)) rentCol = idx;
      else if (phoneKeywords.test(c)) phoneCol = idx;
      else if (roomKeywords.test(c)) roomCol = idx;
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

      // Check numeric amounts (rent vs deposit)
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

      // Check room pattern
      if (/^(?:[1-9]\d{1,3}|[Gg]\d{1,2}|[A-Za-z]\d{1,3}|[1-9][A-Za-z])$/.test(val) || /^Room\s*\d+/i.test(val)) {
        colScores.room[colIdx] += 3;
      }

      // Check date pattern
      if (/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(val) || /^\d{4}-\d{2}-\d{2}$/.test(val) || /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(val)) {
        colScores.date[colIdx] += 3;
      }

      // Check name pattern (letters, 1 to 4 words, no pure digits)
      if (/^[A-Za-z\s.'()-]{3,40}$/.test(val) && !/^(room|floor|bed|rent|advance|paid|unpaid|cash|upi|gpay|kholi)$/i.test(val)) {
        colScores.name[colIdx] += 1;
      }
    });
  });

  // Assign columns based on highest score if not already locked by header
  if (phoneCol === -1) phoneCol = getBestColumnIndex(colScores.phone, [nameCol, roomCol, rentCol, depositCol]);
  if (roomCol === -1) roomCol = getBestColumnIndex(colScores.room, [phoneCol, nameCol, rentCol, depositCol]);
  if (nameCol === -1) nameCol = getBestColumnIndex(colScores.name, [phoneCol, roomCol, rentCol, depositCol]);
  if (rentCol === -1) rentCol = getBestColumnIndex(colScores.rent, [phoneCol, roomCol, nameCol, depositCol]);
  if (depositCol === -1) depositCol = getBestColumnIndex(colScores.deposit, [phoneCol, roomCol, nameCol, rentCol]);
  if (dateCol === -1) dateCol = getBestColumnIndex(colScores.date, [phoneCol, roomCol, nameCol, rentCol, depositCol]);

  // Fallback defaults if still unbound
  if (nameCol === -1) nameCol = 0;
  if (phoneCol === -1 && maxCols > 1) phoneCol = nameCol === 0 ? 1 : 0;
  if (roomCol === -1 && maxCols > 2) roomCol = [0, 1, 2].find((i) => i !== nameCol && i !== phoneCol) ?? 2;

  // Step 3: Build Structured Occupant Rows
  const parsedOccupants: FastTrackParsedRow[] = [];
  const roomOccupancyMap = new Map<string, number>();

  dataRows.forEach((row, rowIdx) => {
    const rawLine = row.join(" | ");
    let rawName = (row[nameCol] || "").trim();
    let rawPhone = (row[phoneCol] || "").trim();
    let rawRoom = (row[roomCol] || "").trim();
    let rawRent = rentCol !== -1 ? (row[rentCol] || "").trim() : "";
    let rawDeposit = depositCol !== -1 ? (row[depositCol] || "").trim() : "";
    let rawDate = dateCol !== -1 ? (row[dateCol] || "").trim() : "";
    let rawBed = bedCol !== -1 ? (row[bedCol] || "").trim() : "";

    // Compound cell splitting: e.g. "Rahul (9876543210)" in name
    if (rawName && !rawPhone) {
      const phoneInName = rawName.match(INDIAN_PHONE_REGEX);
      if (phoneInName) {
        rawPhone = phoneInName[1];
        rawName = rawName.replace(INDIAN_PHONE_REGEX, "").replace(/[()\-]/g, "").trim();
      }
    }

    // Compound room: e.g. "101-Bed A" or "Room 101 (Double)"
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
    const cleanRoom = (rawRoom || `10${(rowIdx % 4) + 1}`).replace(/^ROOM\s*/i, "").toUpperCase();

    // 🛏️ Automatic Bed Allocation (Bed A, Bed B, Bed C...)
    // Automatically assigns without forcing owner to input bed IDs!
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
      sharingType: currentCountInRoom,
      rentAmount: rentNum,
      securityDeposit: depositNum,
      joiningDate: cleanDate,
      paymentMode: "UPI",
      isValid,
      warnings,
      rawSource: rawLine,
    });
  });

  // Calculate unique inferred floors and room capacities
  const uniqueRooms = Array.from(roomOccupancyMap.entries()).map(([roomNumber, occupantCount]) => ({
    roomNumber,
    occupantCount,
  }));

  const inferredFloorsSet = new Set<string>();
  uniqueRooms.forEach(({ roomNumber }) => {
    if (/^[1-9]\d{2}/.test(roomNumber)) {
      const flNum = roomNumber.charAt(0);
      inferredFloorsSet.add(`Floor 0${flNum}`);
    } else if (/^[Gg]/.test(roomNumber)) {
      inferredFloorsSet.add("Ground Floor");
    } else {
      inferredFloorsSet.add("Floor 01");
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
    detectedColumns: { nameIndex: nameCol, phoneIndex: phoneCol, roomIndex: roomCol, rentIndex: rentCol, depositIndex: depositCol, dateIndex: dateCol, bedIndex: bedCol },
    inferredFloors: Array.from(inferredFloorsSet),
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
