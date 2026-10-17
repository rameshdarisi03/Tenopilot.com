import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function verifySignedEmailOtpToken(
  email: string,
  otp: string,
  token: string
): { valid: boolean; reason?: string } {
  try {
    const secret = process.env.WHATSAPP_API_TOKEN || "tenopilot_email_auth_salt_secret";
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const { payload, signature } = JSON.parse(raw);

    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (signature !== expectedSig) {
      return { valid: false, reason: "Invalid verification token signature." };
    }

    const data = JSON.parse(payload);
    if (data.email !== email) {
      return { valid: false, reason: "Email address mismatch." };
    }

    if (Date.now() > data.expiresAt) {
      return { valid: false, reason: "This OTP code has expired. Please request a new code." };
    }

    const expectedHash = crypto
      .createHmac("sha256", secret)
      .update(`${email}:${otp}:${data.expiresAt}`)
      .digest("hex");

    if (data.otpHash !== expectedHash) {
      return { valid: false, reason: "Incorrect 6-digit OTP code. Please check your inbox and try again." };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Invalid verification token format." };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = body?.email;
    const rawOtp = body?.otp;
    const verificationToken = body?.verificationToken;

    if (!rawEmail || !rawOtp) {
      return NextResponse.json(
        { success: false, message: "Both email address and OTP code are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(rawEmail).trim().toLowerCase();
    const cleanOtp = String(rawOtp).trim();

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 6-digit OTP code." },
        { status: 400 }
      );
    }

    // 1. Verify Signed Token
    if (!verificationToken || typeof verificationToken !== "string") {
      return NextResponse.json(
        { success: false, message: "Verification session missing. Please request a new code." },
        { status: 400 }
      );
    }

    const verificationResult = verifySignedEmailOtpToken(cleanEmail, cleanOtp, verificationToken);
    if (!verificationResult.valid) {
      return NextResponse.json(
        { success: false, message: verificationResult.reason || "Invalid OTP code." },
        { status: 400 }
      );
    }

    // 2. Check if an existing account is linked to this email
    let existingProfile: any = null;
    let isFullyOnboarded = false;

    try {
      if (db) {
        const emailQ = query(collection(db, "users"), where("email", "==", cleanEmail));
        const emailSnap = await getDocs(emailQ);
        if (!emailSnap.empty) {
          existingProfile = emailSnap.docs[0].data();
        }

        if (existingProfile?.onboardingCompleted === true && existingProfile?.assignedPropertyId) {
          isFullyOnboarded = true;
        }
      }
    } catch (e) {
      console.warn("Notice checking existing user in email verify-otp:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Email address verified successfully!",
      email: cleanEmail,
      emailVerified: true,
      userExists: Boolean(existingProfile),
      isFullyOnboarded,
      existingProfile: existingProfile || null,
    });
  } catch (error: any) {
    console.error("POST /api/auth/email/verify-otp error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
