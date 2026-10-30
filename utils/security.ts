/**
 * Security Utility — XSS Sanitization & Input Safe-filtering
 * Protects application against XSS script injection, HTML markup injection, and ReDoS attacks.
 */
export function sanitizeSearchInput(input: string): string {
  if (!input) return "";

  // 1. Cap input length to 100 characters to prevent ReDoS / Buffer exploits
  let sanitized = input.slice(0, 100);

  // 2. Remove script tags, HTML tags, iframe tags, and inline event handlers
  sanitized = sanitized.replace(/<[^>]*>?/gm, "");

  // 3. Remove dangerous protocols (javascript:, data:, vbscript:)
  sanitized = sanitized.replace(/javascript:/gi, "");
  sanitized = sanitized.replace(/vbscript:/gi, "");
  sanitized = sanitized.replace(/data:/gi, "");

  // 4. Escape special HTML control characters
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");

  // 5. Trim leading/trailing whitespace
  return sanitized.trim();
}

/**
 * Normalizes phone number string by stripping non-digit characters (+91, spaces, hyphens, parentheses)
 * and extracting the standard clean 10-digit mobile number.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  let digitsOnly = String(phone).replace(/\D/g, "");
  if (digitsOnly.length === 14 && digitsOnly.startsWith("9191")) {
    digitsOnly = digitsOnly.slice(4);
  }
  if (digitsOnly.length === 10) return digitsOnly;
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) return digitsOnly.slice(2);
  if (digitsOnly.length === 13 && digitsOnly.startsWith("091")) return digitsOnly.slice(3);
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) return digitsOnly.slice(1);
  if (digitsOnly.length > 10) {
    return digitsOnly.slice(-10);
  }
  return digitsOnly;
}

/**
 * Formats a phone number for clean UI presentation (e.g. '+91 9206651295').
 * Strips duplicate country code prefixes ('+91 91...', '9191...') and guarantees standard format.
 */
export function formatDisplayPhone(phone?: string | null, countryCode = "+91"): string {
  if (!phone) return "";
  const clean10 = normalizePhoneNumber(phone);
  if (clean10 && clean10.length === 10) {
    const cc = (countryCode || "+91").trim();
    const cleanCc = cc.startsWith("+") ? cc : `+${cc}`;
    return `${cleanCc} ${clean10}`;
  }
  return phone;
}

/**
 * Sanitizes plain text input by stripping all HTML tags, script injection tokens,
 * dangerous URI protocols, and null bytes while enforcing length limits.
 */
export function sanitizePlainText(input: unknown, maxLength: number = 200): string {
  if (typeof input !== "string") return "";

  // 1. Cap length early to prevent ReDoS
  let clean = input.slice(0, maxLength * 2);

  // 2. Strip null bytes and control chars
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 3. Strip HTML, XML, script tags
  clean = clean.replace(/<[^>]*>?/gm, "");

  // 4. Strip dangerous pseudo-protocols
  clean = clean.replace(/(?:javascript|vbscript|data):/gi, "");

  // 5. Escape angle brackets and quotes
  clean = clean
    .replace(/</g, "")
    .replace(/>/g, "")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  // 6. Collapse consecutive whitespace & enforce max length
  return clean.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/**
 * Sanitizes digits-only input (e.g. phone, Aadhaar, pincode).
 */
export function sanitizeDigitsOnly(input: unknown, maxLength: number = 20): string {
  if (!input) return "";
  const str = String(input);
  return str.replace(/\D/g, "").slice(0, maxLength);
}

/**
 * Validates and sanitizes email address.
 */
export function sanitizeEmailAddress(input: unknown): string {
  if (typeof input !== "string") return "";
  const clean = input.trim().toLowerCase().slice(0, 120);
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) return "";
  return clean;
}

/**
 * Sanitizes and formats vehicle registration numbers into standardized Indian format (e.g. KA04 HG 1234).
 * Handles all combinations of spaces, dashes, uppercase/lowercase (e.g. "ka04hg1234", "KA 04 HG 1234", "ka-04-hg-1234").
 */
export function sanitizeVehicleNumber(input: unknown): string {
  if (typeof input !== "string") return "";
  const raw = input.trim();
  if (!raw) return "";

  // Strip all non-alphanumeric chars, hyphens, and whitespace, then uppercase
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
  if (!clean) return "";

  // 1. BH Series: e.g. 22BH1234AA -> 22 BH 1234 AA
  const bhMatch = clean.match(/^(\d{2})(BH)(\d{4})([A-Z]{1,2})$/);
  if (bhMatch) {
    return `${bhMatch[1]} ${bhMatch[2]} ${bhMatch[3]} ${bhMatch[4]}`;
  }

  // 2. Standard Indian Plate: [State: 2 letters][RTO: 1-2 digits][Series: 0-3 letters][Number: 1-4 digits]
  // e.g. KA04HG1234 -> KA04 HG 1234, KA04KH1111 -> KA04 KH 1111, KA4A1 -> KA04 A 1
  const stdMatch = clean.match(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/);
  if (stdMatch) {
    const state = stdMatch[1];
    const rto = stdMatch[2].padStart(2, "0");
    const series = stdMatch[3];
    const num = stdMatch[4];

    if (series && num) {
      return `${state}${rto} ${series} ${num}`;
    } else if (series) {
      return `${state}${rto} ${series}`;
    } else if (num) {
      return `${state}${rto} ${num}`;
    }
    return `${state}${rto}`;
  }

  // 3. Fallback: normalize uppercase with clean single spaces
  return raw.toUpperCase().replace(/[^A-Z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Strict validator for uploaded Base64 attachments (Selfie, Aadhaar Front, Aadhaar Back).
 * Protects against SVG script injection (XSS), disguised HTML/executables, and oversized DoS payloads.
 */
export function validateBase64Attachment(
  dataUrl: unknown,
  maxBytes: number = 5 * 1024 * 1024
): { valid: boolean; error?: string; cleanDataUrl?: string } {
  if (!dataUrl || typeof dataUrl !== "string") {
    return { valid: false, error: "Empty or invalid file payload." };
  }

  // Allowed MIME prefixes
  const ALLOWED_PREFIXES = [
    "data:image/jpeg;base64,",
    "data:image/jpg;base64,",
    "data:image/png;base64,",
    "data:image/webp;base64,",
    "data:application/pdf;base64,",
  ];

  const matchedPrefix = ALLOWED_PREFIXES.find((p) => dataUrl.startsWith(p));
  if (!matchedPrefix) {
    return {
      valid: false,
      error: "Unsupported file format. Only JPG, PNG, WebP, and PDF files are permitted. SVGs and executable files are blocked.",
    };
  }

  const base64Data = dataUrl.slice(matchedPrefix.length);
  // Base64 regex check: only standard base64 characters
  if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
    return { valid: false, error: "Corrupted base64 payload." };
  }

  // Calculate approximate file size in bytes
  const estimatedBytes = (base64Data.length * 3) / 4;
  if (estimatedBytes > maxBytes) {
    const mbLimit = Math.round(maxBytes / (1024 * 1024));
    return { valid: false, error: `File size exceeds the ${mbLimit}MB limit. Please upload a smaller photo.` };
  }

  return { valid: true, cleanDataUrl: dataUrl };
}

/**
 * Normalizes and formats a phone number for WhatsApp links (wa.me) or WhatsApp Business API.
 * Ensures the international country code (default 91 for India) is correctly formatted without duplicates.
 * Prevents double country codes like '9191...' or '91 +91...'.
 */
export function formatWhatsAppPhone(phone?: string | null): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  
  if (!digits) return "";

  // Strip leading zeros (e.g., 09845010029 -> 9845010029)
  while (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Handle double 91 prefix if previously corrupted (e.g., 91919845010029 -> 919845010029)
  if (digits.length === 14 && digits.startsWith("9191")) {
    digits = digits.slice(2);
  }

  // Standard 10-digit Indian phone number -> prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // 12-digit Indian number starting with 91 -> already normalized
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  // International or already complete E.164 without plus
  return digits;
}

/**
 * Builds a clean, valid https://wa.me/ URL with pre-filled message text.
 */
export function buildWhatsAppUrl(phone?: string | null, message?: string): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  if (!formattedPhone) return "";
  const textParam = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${formattedPhone}${textParam}`;
}

