import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatIndianPhoneNumber } from "@/lib/whatsappService";

export function verifySignedOtpToken(
  phone: string,
  otp: string,
  token: string
): { valid: boolean; reason?: string } {
  try {
    const secret = process.env.WHATSAPP_API_TOKEN || "tenopilot_phone_auth_salt_secret";
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const { payload, signature } = JSON.parse(raw);

    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (signature !== expectedSig) {
      return { valid: false, reason: "Invalid verification token signature." };
    }

    const data = JSON.parse(payload);
    if (data.phone !== phone) {
      return { valid: false, reason: "Phone number mismatch." };
    }

    if (Date.now() > data.expiresAt) {
      return { valid: false, reason: "This OTP code has expired. Please request a new code." };
    }

    const expectedHash = crypto
      .createHmac("sha256", secret)
      .update(`${phone}:${otp}:${data.expiresAt}`)
      .digest("hex");

    if (data.otpHash !== expectedHash) {
      return { valid: false, reason: "Incorrect 6-digit OTP code. Please check and try again." };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Invalid verification token format." };
  }
}

function generatePhoneAuthCredentials(phone: string) {
  const secret = process.env.WHATSAPP_API_TOKEN || "tenopilot_phone_auth_salt_secret";
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
    const verificationToken = body?.verificationToken;

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

    // 1. Verify Signed Token
    if (!verificationToken || typeof verificationToken !== "string") {
      return NextResponse.json(
        { success: false, message: "Verification session missing. Please request a new code." },
        { status: 400 }
      );
    }

    const verificationResult = verifySignedOtpToken(cleanPhone, cleanOtp, verificationToken);
    if (!verificationResult.valid) {
      return NextResponse.json(
        { success: false, message: verificationResult.reason || "Invalid OTP code." },
        { status: 400 }
      );
    }

    // 2. Generate deterministic Firebase Auth credentials
    const { authEmail, authSecret } = generatePhoneAuthCredentials(cleanPhone);

    // 3. Check existing user doc safely in Firestore
    let existingProfile: any = null;
    let isFullyOnboarded = false;

    try {
      if (db) {
        const pure10 = cleanPhone.replace(/\D/g, "").slice(-10);
        const candidateDocs: any[] = [];

        // 1. Try 10-digit format (e.g. 9206651295)
        const phoneQ1 = query(collection(db, "users"), where("phone", "==", pure10));
        const phoneSnap1 = await getDocs(phoneQ1);
        phoneSnap1.docs.forEach((d) => candidateDocs.push({ ...d.data(), id: d.id, uid: d.id }));

        // 2. Try 12-digit format (e.g. 919206651295)
        const phoneQ2 = query(collection(db, "users"), where("phone", "==", `91${pure10}`));
        const phoneSnap2 = await getDocs(phoneQ2);
        phoneSnap2.docs.forEach((d) => candidateDocs.push({ ...d.data(), id: d.id, uid: d.id }));

        // 3. Try authEmail
        const emailQ = query(collection(db, "users"), where("email", "==", authEmail));
        const emailSnap = await getDocs(emailQ);
        emailSnap.docs.forEach((d) => candidateDocs.push({ ...d.data(), id: d.id, uid: d.id }));

        if (candidateDocs.length > 0) {
          const scored = candidateDocs.map((docData) => {
            let score = 0;
            const isPro =
              docData.subscriptionStatus === "ACTIVE_PRO" ||
              docData.plan === "PRO_MONTHLY" ||
              docData.plan === "PRO_ANNUAL" ||
              docData.plan === "VIP_PASS" ||
              docData.subscriptionPlan === "pro" ||
              (docData.planExpiresAt && new Date(docData.planExpiresAt).getTime() > Date.now());
            if (isPro) score += 1000;
            if (docData.onboardingCompleted === true) score += 100;
            if (docData.assignedPropertyId) score += 50;
            if (docData.email && !docData.email.startsWith("phone_") && !docData.email.includes("tenopilot.auth")) score += 25;
            if (docData.uid && !docData.uid.startsWith("phone_")) score += 10;
            return { docData, score };
          });
          scored.sort((a, b) => b.score - a.score);
          existingProfile = scored[0].docData;
        }

        if (existingProfile?.onboardingCompleted === true && existingProfile?.assignedPropertyId) {
          isFullyOnboarded = true;
        }
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
