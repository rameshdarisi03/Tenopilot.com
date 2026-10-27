/**
 * Helper to generate and decode base64url payment tokens for TenoPilot 1-Tap UPI Bridge
 */

export interface PayTokenPayload {
  propertyId: string;
  propertyName?: string;
  tenantId: string;
  tenantName: string;
  roomNumber?: string;
  amount: number;
  dueDate?: string;
  upiId?: string;
  partnerId?: string;
  partnerName?: string;
  partnerPhone?: string;
  propertyPhone?: string;
}

export function generatePayToken(data: PayTokenPayload): string {
  const compact = {
    p: data.propertyId,
    pn: data.propertyName || "PG Living",
    t: data.tenantId,
    n: data.tenantName,
    r: data.roomNumber || "Standard Room",
    a: data.amount,
    d: data.dueDate || "",
    u: data.upiId || "",
    pid: data.partnerId || "",
    pname: data.partnerName || "",
    ph: data.partnerPhone || "",
    pph: data.propertyPhone || "",
  };

  const json = JSON.stringify(compact);

  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    const encoded = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    return window
      .btoa(encoded)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  return Buffer.from(json, "utf-8").toString("base64url");
}

export function decodePayToken(token: string): PayTokenPayload | null {
  try {
    let json = "";
    const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      const decoded = window.atob(base64);
      json = decodeURIComponent(
        decoded
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    } else {
      json = Buffer.from(token, "base64url").toString("utf-8");
    }

    const parsed = JSON.parse(json);
    if (!parsed.p || !parsed.a) return null;

    return {
      propertyId: parsed.p,
      propertyName: parsed.pn,
      tenantId: parsed.t,
      tenantName: parsed.n,
      roomNumber: parsed.r,
      amount: Number(parsed.a),
      dueDate: parsed.d,
      upiId: parsed.u,
      partnerId: parsed.pid,
      partnerName: parsed.pname,
      partnerPhone: parsed.ph,
      propertyPhone: parsed.pph,
    };
  } catch {
    return null;
  }
}
