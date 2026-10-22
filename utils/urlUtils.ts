/**
 * Resolves the canonical base URL of the TenoPilot platform.
 * Always returns "https://www.tenopilot.com" in production environments
 * to avoid HTTP 308 redirects from apex domains and prevent mobile browser lookalike / phishing warnings.
 * In local development, preserves localhost/127.0.0.1 with port.
 */
export function getCanonicalPortalOrigin(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return origin;
    }
    return "https://www.tenopilot.com";
  }
  return process.env.NEXT_PUBLIC_APP_URL || "https://www.tenopilot.com";
}

export const CANONICAL_DOMAIN = "https://www.tenopilot.com";
