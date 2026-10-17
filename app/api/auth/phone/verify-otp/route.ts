import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatIndianPhoneNumber } from "@/lib/whatsappService";

function hashOtp(phone: string, otp: string): string {
  const secret = process.env.WHATSAPP_API_TOKEN || "tenopilot_phone_auth_salt";
  return crypto.createHmac("sha256", secret).update(`${phone}:${otp}`).digest("hex");
}

function generatePhoneAuthCredentials(phone: string) {
  const secret = process.env.WHATSAPP_API_TOKEN || "tenopilot_phone_auth_salt";
  const authEmail = `phone_${phone}@phone.tenopilot.auth`;
  const authSecret = crypto
    .createHmac("sha256", secret)
    .update(`tp_auth_phone_${phone}`)
    .digest("hex");
  return { authEmail, authSecret };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = body?.phone;
    const rawOtp = body?.otp;

    if (!rawPhone || !rawOtp) {
      return NextResponse.json(
        { success: false, message: "Both phone number and OTP code are required." },
        { status: 400 }
      );
    }

    const cleanPhone = formatIndianPhoneNumber(rawPhone);
    const cleanOtp = String(rawOtp).trim();

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 6-digit OTP code." },
        { status: 400 }
      );
    }

    // 1. Fetch OTP record from Firestore
    const otpDocRef = doc(db, "auth_phone_otps", cleanPhone);
    const snap = await getDoc(otpDocRef);

    if (!snap.exists()) {
      return NextResponse.json(
        { success: false, message: "No verification request found for this number or OTP has expired. Please request a new code." },
        { status: 400 }
      );
    }

    const otpData = snap.data();
    const now = Date.now();

    // Check expiry (10 minutes)
    if (now > (otpData.expiresAt || 0)) {
      await deleteDoc(otpDocRef).catch(() => {});
      return NextResponse.json(
        { success: false, message: "This OTP code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check brute-force attempts
    const attempts = otpData.attempts || 0;
    if (attempts >= 5) {
      await deleteDoc(otpDocRef).catch(() => {});
      return NextResponse.json(
        { success: false, message: "Too many failed attempts. For security, this code was invalidated. Please request a new code." },
        { status: 429 }
      );
    }

    // 2. Validate OTP Hash
    const expectedHash = otpData.otpHash;
    const incomingHash = hashOtp(cleanPhone, cleanOtp);

    if (incomingHash !== expectedHash) {
      const remaining = 4 - attempts;
      await setDoc(otpDocRef, { attempts: attempts + 1 }, { merge: true });
      return NextResponse.json(
        {
          success: false,
          message: remaining > 0
            ? `Invalid OTP code. (${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining)`
            : "Invalid OTP code. No attempts remaining, please request a new code.",
        },
        { status: 400 }
      );
    }

    // 3. Mark burned / verified
    await deleteDoc(otpDocRef).catch(() => {});

    // 4. Generate deterministic Firebase Auth credentials
    const { authEmail, authSecret } = generatePhoneAuthCredentials(cleanPhone);

    // 5. Check if user already exists in Firestore
    let existingProfile: any = null;
    let isFullyOnboarded = false;

    try {
      // Check by phone
      const phoneQ = query(collection(db, "users"), where("phone", "==", cleanPhone));
      const phoneSnap = await getDocs(phoneQ);
      if (!phoneSnap.empty) {
        existingProfile = phoneSnap.docs[0].data();
      }

      // Check by synthetic email if not found
      if (!existingProfile) {
        const emailQ = query(collection(db, "users"), where("email", "==", authEmail));
        const emailSnap = await getDocs(emailQ);
        if (!emailSnap.empty) {
          existingProfile = emailSnap.docs[0].data();
        }
      }

      if (existingProfile?.onboardingCompleted === true && existingProfile?.assignedPropertyId) {
        isFullyOnboarded = true;
      }
    } catch (e) {
      console.warn("Notice checking existing user in verify-otp:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Phone number verified successfully!",
      phone: cleanPhone,
      authEmail,
      authSecret,
      userExists: Boolean(existingProfile),
      isFullyOnboarded,
      destination: isFullyOnboarded ? "PIN_PROMPT" : "/welcome",
      existingProfile: existingProfile || null,
    });
  } catch (error: any) {
    console.error("POST /api/auth/phone/verify-otp error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
