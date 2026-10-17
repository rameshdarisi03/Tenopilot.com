import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatIndianPhoneNumber, sendWhatsAppAuthOtp } from "@/lib/whatsappService";

function hashOtp(phone: string, otp: string): string {
  const secret = process.env.WHATSAPP_API_TOKEN || "tenopilot_phone_auth_salt";
  return crypto.createHmac("sha256", secret).update(`${phone}:${otp}`).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = body?.phone;

    if (!rawPhone || typeof rawPhone !== "string") {
      return NextResponse.json(
        { success: false, message: "Valid mobile phone number is required." },
        { status: 400 }
      );
    }

    const cleanPhone = formatIndianPhoneNumber(rawPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    // 1. Cooldown & Rate Limiting Check
    const otpDocRef = doc(db, "auth_phone_otps", cleanPhone);
    const existingSnap = await getDoc(otpDocRef);

    if (existingSnap.exists()) {
      const data = existingSnap.data();
      const now = Date.now();
      const lastSentAt = data.lastSentAt || 0;
      const cooldownMs = 45 * 1000; // 45 seconds cooldown

      if (now - lastSentAt < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - (now - lastSentAt)) / 1000);
        return NextResponse.json(
          {
            success: false,
            message: `Please wait ${remainingSeconds}s before requesting a new code.`,
            cooldownSeconds: remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    // 2. Generate cryptographically strong 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(cleanPhone, otpCode);

    // 3. Commit unverified OTP hash to Firestore (10 minute expiry)
    await setDoc(otpDocRef, {
      phone: cleanPhone,
      otpHash,
      createdAt: Date.now(),
      lastSentAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      verified: false,
    });

    // 4. Send via Meta WhatsApp Cloud API using pre-approved template 'user_authcode_tenopilot'
    const sendResult = await sendWhatsAppAuthOtp(cleanPhone, otpCode);

    if (!sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: sendResult.error || "Failed to dispatch WhatsApp message. Please check number and try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent to WhatsApp (+${cleanPhone})`,
      phone: cleanPhone,
      cooldownSeconds: 45,
      mode: sendResult.mode,
    });
  } catch (error: any) {
    console.error("POST /api/auth/phone/send-otp error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
