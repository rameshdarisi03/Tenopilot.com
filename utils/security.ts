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
