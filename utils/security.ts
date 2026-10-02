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
 * Normalizes phone number string by stripping non-digit characters (+91, spaces, hyphens, parentheses).
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
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

