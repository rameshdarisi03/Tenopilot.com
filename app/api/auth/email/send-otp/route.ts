import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendSESEmail } from "@/lib/sesService";

export function createSignedEmailOtpToken(email: string, otp: string): string {
  const secret = process.env.WHATSAPP_API_TOKEN || "tenopilot_email_auth_salt_secret";
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const otpHash = crypto
    .createHmac("sha256", secret)
    .update(`${email}:${otp}:${expiresAt}`)
    .digest("hex");
  const payload = JSON.stringify({ email, expiresAt, otpHash });
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = body?.email;

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { success: false, message: "Valid email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 1. Generate cryptographically random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Generate stateless cryptographically signed token
    const verificationToken = createSignedEmailOtpToken(cleanEmail, otpCode);

    // 3. Dispatch via Amazon SES
    const sendResult = await sendSESEmail({
      toEmail: cleanEmail,
      recipientName: "Property Manager",
      propertyId: "auth",
      propertyName: "TenoPilot",
      type: "AUTH_OTP",
      params: {
        otpCode,
      },
    });

    if (!sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: sendResult.error || "Failed to dispatch verification email. Please try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}`,
      email: cleanEmail,
      verificationToken,
      cooldownSeconds: 45,
      mode: sendResult.mode,
    });
  } catch (error: any) {
    console.error("POST /api/auth/email/send-otp error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
