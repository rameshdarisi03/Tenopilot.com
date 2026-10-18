"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Building2,
  User as UserIcon,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Hotel,
  Navigation,
  Loader2,
  Briefcase,
  Check,
  Mail,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { provisionNewPropertyWorkspace } from "@/lib/accountInitializer";
import { syncUserSecurityPinToCloud, sanitizeTitleCase, checkAccountRegistrationStatus } from "@/lib/authService";
import { cleanIndianMobileNumber } from "@/lib/whatsappService";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { getStoredPlatformConfig } from "@/lib/platformConfig";

function WelcomeOnboardingContent() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const platformConfig = getStoredPlatformConfig();

  // Progressive Micro-Steps:
  // 1 = Tell us about yourself (Role, Name, WhatsApp)
  // 2 = Set 6-Digit MPIN (Banking MPIN setup)
  // 3 = Let's setup your first property (Name, Category, 1-Tap Location)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Personal & Role
  const [roleType, setRoleType] = useState<"owner" | "manager" | "partner">("owner");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasInitializedPhone, setHasInitializedPhone] = useState(false);
  const [hasInitializedName, setHasInitializedName] = useState(false);

  // Dual-channel linking states for onboarding
  const [emailInput, setEmailInput] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpToken, setEmailOtpToken] = useState("");
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isCheckingEmailOtp, setIsCheckingEmailOtp] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");

  const [phoneInput, setPhoneInput] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpToken, setPhoneOtpToken] = useState("");
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isCheckingPhoneOtp, setIsCheckingPhoneOtp] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState("");

  // Step 2: 6-Digit MPIN
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Step 3: Property & Location
  const [propertyName, setPropertyName] = useState("");
  const [propertyCategory, setPropertyCategory] = useState("PG / Co-Living");
  const [city, setCity] = useState("Hyderabad, Telangana");
  const [isLocating, setIsLocating] = useState(false);

  // Provisioning & Progress
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisionProgress, setProvisionProgress] = useState(0);
  const [provisionStatusText, setProvisionStatusText] = useState("Preparing your workspace...");

  // Pre-fill user details from AuthProvider / Firebase (Once on initial load, never override user edits)
  useEffect(() => {
    // 1. Full Name Resolution: Only pre-fill genuine names, never dummy fallback names
    if (!hasInitializedName) {
      const candidateName = profile?.displayName || user?.displayName || "";
      const isPlaceholder =
        !candidateName ||
        candidateName === "Property Owner" ||
        candidateName.toLowerCase().startsWith("pg owner") ||
        candidateName.toLowerCase().startsWith("phone_") ||
        candidateName.includes("@auth.tenopilot.com");

      if (!isPlaceholder) {
        setFullName(sanitizeTitleCase(candidateName));
      }
      if (profile || user) {
        setHasInitializedName(true);
      }
    }

    // 2. Phone Number Resolution: Clean to pure 10 digits
    if (!hasInitializedPhone) {
      const candidatePhone = profile?.phone || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("tenopilot_saved_session") || "{}").phone : "");
      if (candidatePhone) {
        const pure10 = cleanIndianMobileNumber(candidatePhone);
        if (pure10) {
          setPhone(pure10);
        }
      }
      if (profile || user) {
        setHasInitializedPhone(true);
      }
    }

    // 3. Email (Never display synthetic phone_ auth strings)
    const rawEmail = user?.email || profile?.email || "";
    const isSynthetic = !rawEmail || rawEmail.startsWith("phone_") || rawEmail.includes("tenopilot.auth") || rawEmail.includes("@auth.tenopilot.com");
    if (!isSynthetic && rawEmail.includes("@")) {
      setEmail(rawEmail);
    } else {
      setEmail("");
    }

    // 4. Security PIN
    if (profile?.securityPin && !pin) {
      setPin(profile.securityPin);
      setConfirmPin(profile.securityPin);
    }
  }, [user, profile, hasInitializedName, hasInitializedPhone, pin]);

  // 🛡️ Proactively redirect staff members and already onboarded owners away from welcome wizard
  useEffect(() => {
    if (!loading && profile) {
      // 1. Staff users (Admin, Receptionist) must never see owner setup
      if (profile.role === "admin" || profile.role === "receptionist") {
        const dest = profile.assignedPropertyId ? `/p/${profile.assignedPropertyId}/overview` : "/home";
        router.replace(dest);
        return;
      }

      // 2. Onboarded master admins with existing properties (Strict onboardingCompleted check)
      if (profile.onboardingCompleted === true) {
        router.replace("/home");
        return;
      }
    }
  }, [profile, loading, router]);

  // Cloud fallback: check staff_accounts directly by email (STRICT: only redirect actual staff members)
  useEffect(() => {
    const checkStaffStatus = async () => {
      const email = user?.email?.toLowerCase() || profile?.email?.toLowerCase();
      if (!email) return;
      try {
        const staffDoc = await getDoc(doc(db, "staff_accounts", email));
        if (staffDoc.exists()) {
          const sData = staffDoc.data();
          // 🔒 STRICT RBAC: Only redirect if explicitly configured with staff role
          if (sData?.role === "admin" || sData?.role === "receptionist") {
            const targetProp = sData.assignedPropertyId || (Array.isArray(sData.assignedPropertyIds) ? sData.assignedPropertyIds[0] : "");
            router.replace(targetProp ? `/p/${targetProp}/overview` : "/home");
          } else if (!sData?.role || sData?.role === "master_admin") {
            // Clean up any phantom staff document generated by PIN sync for property owners
            deleteDoc(doc(db, "staff_accounts", email)).catch(() => {});
          }
        }
      } catch {}
    };
    if (user || profile) {
      checkStaffStatus();
    }
  }, [user, profile, router]);

  // Cooldown countdown timers
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const interval = setInterval(() => {
      setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [emailCooldown]);

  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const interval = setInterval(() => {
      setPhoneCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phoneCooldown]);

  // Email OTP Handlers (for phone-authenticated users linking email)
  const handleSendEmailOtp = async () => {
    setEmailError(null);
    const clean = emailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clean || !emailRegex.test(clean)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    const activeUid = auth.currentUser?.uid || user?.uid || profile?.uid || "";

    setIsSendingEmailOtp(true);
    try {
      // 🛡️ Pre-Flight Collision Check: Ensure email is not already registered with another user or staff account
      const collisionCheck = await checkAccountRegistrationStatus(clean, activeUid);
      if (collisionCheck.exists) {
        setEmailError("⚠️ This email address is already registered with another TenoPilot account. Please use a different email or sign in with that account.");
        return;
      }

      const res = await fetch("/api/auth/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send verification email.");
      }
      setEmailOtpToken(data.verificationToken);
      setEmailOtpSent(true);
      setEmailCooldown(data.cooldownSeconds || 45);
    } catch (err: any) {
      setEmailError(err.message || "Failed to send verification email.");
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    setEmailError(null);
    const cleanOtp = emailOtpCode.trim();
    if (cleanOtp.length !== 6) {
      setEmailError("Please enter 6-digit code.");
      return;
    }
    setIsCheckingEmailOtp(true);
    try {
      const res = await fetch("/api/auth/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim().toLowerCase(),
          otp: cleanOtp,
          verificationToken: emailOtpToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid OTP code.");
      }
      const verified = emailInput.trim().toLowerCase();
      setVerifiedEmail(verified);
      setEmail(verified);
      setEmailOtpSent(false);
      setEmailOtpCode("");

      // Link immediately to Firestore & localStorage
      const activeUid = auth.currentUser?.uid || user?.uid || profile?.uid;
      if (activeUid) {
        await setDoc(doc(db, "users", activeUid), { email: verified, emailVerified: true }, { merge: true });
        if (typeof window !== "undefined") {
          const sess = localStorage.getItem("tenopilot_saved_session");
          const parsed = sess ? JSON.parse(sess) : {};
          localStorage.setItem("tenopilot_saved_session", JSON.stringify({ ...parsed, email: verified }));
        }
      }
    } catch (err: any) {
      setEmailError(err.message || "Invalid OTP code.");
    } finally {
      setIsCheckingEmailOtp(false);
    }
  };

  // Phone OTP Handlers (for email-authenticated users linking phone)
  const handleSendPhoneOtp = async () => {
    setPhoneError(null);
    const clean = phoneInput.replace(/\D/g, "");
    if (clean.length < 10) {
      setPhoneError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const activeUid = auth.currentUser?.uid || user?.uid || profile?.uid || "";

    setIsSendingPhoneOtp(true);
    try {
      // 🛡️ Pre-Flight Collision Check: Ensure mobile number is not already registered with another user or staff account
      const collisionCheck = await checkAccountRegistrationStatus(clean, activeUid);
      if (collisionCheck.exists) {
        setPhoneError("⚠️ This mobile number is already registered with another TenoPilot account. Please enter a different mobile number or sign in with that account.");
        return;
      }

      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send WhatsApp code.");
      }
      setPhoneOtpToken(data.verificationToken);
      setPhoneOtpSent(true);
      setPhoneCooldown(data.cooldownSeconds || 45);
    } catch (err: any) {
      setPhoneError(err.message || "Failed to send WhatsApp code.");
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    setPhoneError(null);
    const cleanOtp = phoneOtpCode.trim();
    if (cleanOtp.length !== 6) {
      setPhoneError("Please enter 6-digit code.");
      return;
    }
    setIsCheckingPhoneOtp(true);
    try {
      const res = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneInput.replace(/\D/g, ""),
          otp: cleanOtp,
          verificationToken: phoneOtpToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid OTP code.");
      }
      const verified = data.phone || phoneInput.replace(/\D/g, "");
      setVerifiedPhone(verified);
      setPhone(cleanIndianMobileNumber(verified));
      setPhoneOtpSent(false);
      setPhoneOtpCode("");

      // Link immediately to Firestore & localStorage
      const activeUid = auth.currentUser?.uid || user?.uid || profile?.uid;
      if (activeUid) {
        await setDoc(doc(db, "users", activeUid), { phone: verified, phoneVerified: true }, { merge: true });
        if (typeof window !== "undefined") {
          const sess = localStorage.getItem("tenopilot_saved_session");
          const parsed = sess ? JSON.parse(sess) : {};
          localStorage.setItem("tenopilot_saved_session", JSON.stringify({ ...parsed, phone: verified }));
        }
      }
    } catch (err: any) {
      setPhoneError(err.message || "Invalid OTP code.");
    } finally {
      setIsCheckingPhoneOtp(false);
    }
  };

  // Step 1 Validation -> Move to Step 2
  const handleProceedToStep2 = () => {
    setError(null);
    const cleanName = fullName.trim();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    // If user started typing an optional email but didn't verify it:
    if (emailInput.trim() && !verifiedEmail) {
      setError("Please verify your email address using the 6-digit code, or clear the email field to proceed.");
      return;
    }

    // If user started typing an optional phone but didn't verify it:
    if (phoneInput.trim() && !verifiedPhone) {
      setError("Please verify your mobile number with WhatsApp OTP, or clear the phone field to proceed.");
      return;
    }

    setStep(2);
  };

  // Step 2 Validation -> Move to Step 3
  const handleProceedToStep3 = async () => {
    setError(null);

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError("Please set a 6-digit numeric MPIN.");
      return;
    }

    if (pin !== confirmPin) {
      setError("MPINs do not match. Please re-enter your 6-digit MPIN.");
      return;
    }

    // Persist identity & PIN progress safely to Firestore
    try {
      const activeUser = auth.currentUser || user;
      const rawActiveEmail = (activeUser?.email || "").toLowerCase().trim();
      const isSyntheticActiveEmail =
        !rawActiveEmail ||
        rawActiveEmail.startsWith("phone_") ||
        rawActiveEmail.includes("tenopilot.auth") ||
        rawActiveEmail.includes("@auth.tenopilot.com");
      const realOwnerEmail = !isSyntheticActiveEmail
        ? rawActiveEmail
        : email && !email.startsWith("phone_")
        ? email.trim().toLowerCase()
        : "";
      const ownerUid = activeUser?.uid;
      const cleanPhone = phone.replace(/\D/g, "");
      if (ownerUid) {
        await syncUserSecurityPinToCloud(rawActiveEmail || realOwnerEmail, pin, ownerUid);
        await setDoc(
          doc(db, "users", ownerUid),
          {
            uid: ownerUid,
            email: realOwnerEmail,
            displayName: fullName.trim(),
            phone: cleanPhone,
            role: "master_admin",
            hasSetPin: true,
            securityPin: pin,
            onboardingCompleted: false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn("Non-fatal error saving step 2 progress:", err);
    }

    setStep(3);
  };

  // 1-Tap Geolocation via Browser GPS & OpenStreetMap Reverse Geocoding
  const handleDetectLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser. Please enter your location manually below.");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`
          );
          const data = await res.json();
          const address = data.address || {};
          const area =
            address.suburb ||
            address.neighbourhood ||
            address.commercial ||
            address.residential ||
            address.road ||
            address.subdistrict ||
            "";
          const cityOrTown =
            address.city ||
            address.town ||
            address.state_district ||
            address.village ||
            "";
          const state = address.state || "";

          const formatted = [area, cityOrTown, state].filter(Boolean).join(", ");
          if (formatted) {
            setCity(formatted);
          } else if (data.display_name) {
            setCity(data.display_name.split(",").slice(0, 3).join(",").trim());
          }
        } catch (err) {
          console.warn("Reverse geocode notice:", err);
        } finally {
          setIsLocating(false);
        }
      },
      (geoErr) => {
        console.warn("Geolocation permission error:", geoErr);
        setIsLocating(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setError("Location permission denied. Please enter your location manually below.");
        } else {
          setError("Could not detect GPS location. Please enter your location manually below.");
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Final Step: Submit & Animated Workspace Provisioning Engine
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPropName = propertyName.trim();
    if (!cleanPropName) {
      setError("Please enter your Property or PG Name.");
      return;
    }

    setIsSubmitting(true);
    setProvisionProgress(15);
    setProvisionStatusText("🔐 Encrypting 6-Digit Banking MPIN...");

    try {
      const activeUser = auth.currentUser || user;
      const rawActiveEmail = (activeUser?.email || "").toLowerCase().trim();
      const isSyntheticActiveEmail =
        !rawActiveEmail ||
        rawActiveEmail.startsWith("phone_") ||
        rawActiveEmail.includes("tenopilot.auth") ||
        rawActiveEmail.includes("@auth.tenopilot.com");
      const realOwnerEmail = !isSyntheticActiveEmail
        ? rawActiveEmail
        : email && !email.startsWith("phone_")
        ? email.trim().toLowerCase()
        : "";
      const ownerUid = activeUser?.uid || `user-${Date.now()}`;
      const orgId = `org_${ownerUid}`;
      const propertyId = `prop-${Date.now()}`;
      const cleanPhone = phone.replace(/\D/g, "");

      // Stage 1: PIN sync
      await syncUserSecurityPinToCloud(rawActiveEmail || realOwnerEmail, pin, ownerUid);

      setProvisionProgress(45);
      setProvisionStatusText("🏢 Provisioning Dual-Ledger Financial Engine...");

      // Stage 2: Master workspace provision
      await provisionNewPropertyWorkspace({
        propertyId: propertyId,
        propertyName: cleanPropName,
        ownerName: fullName.trim(),
        ownerEmail: realOwnerEmail,
        ownerPhone: cleanPhone,
        city: city.trim(),
        approxBeds: 0,
        securityPin: pin,
      });

      setProvisionProgress(75);
      setProvisionStatusText(`🎁 Activating ${platformConfig.trialDays}-Day Pro Trial & WhatsApp Credits...`);

      // Stage 3: Complete user profile in Firestore
      const userDocRef = doc(db, "users", ownerUid);
      let existingCreatedAt = "";
      let existingPlanExpiresAt = "";
      try {
        const existingSnap = await getDoc(userDocRef);
        if (existingSnap.exists()) {
          const uData = existingSnap.data();
          existingCreatedAt = uData.createdAt;
          existingPlanExpiresAt = uData.planExpiresAt;
        }
      } catch {}

      const nowIso = new Date().toISOString();
      const finalCreatedAt = existingCreatedAt || nowIso;
      const activeTrialDays = Number(platformConfig.trialDays) || 10;
      const finalPlanExpiresAt =
        existingPlanExpiresAt ||
        new Date(new Date(finalCreatedAt).getTime() + activeTrialDays * 24 * 60 * 60 * 1000).toISOString();

      await setDoc(
        userDocRef,
        {
          uid: ownerUid,
          email: realOwnerEmail,
          authEmail: rawActiveEmail,
          displayName: fullName.trim(),
          phone: cleanPhone,
          role: "master_admin",
          organizationId: orgId,
          assignedPropertyId: propertyId,
          pgName: cleanPropName,
          propertyName: cleanPropName,
          primaryPropertyName: cleanPropName,
          onboardingCompleted: true,
          hasSetPin: true,
          securityPin: pin,
          createdAt: finalCreatedAt,
          planExpiresAt: finalPlanExpiresAt,
          plan: "10_DAY_TRIAL",
          subscriptionStatus: "TRIAL",
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // Clean up any purged tombstone
      if (realOwnerEmail) {
        try {
          await deleteDoc(doc(db, "purged_accounts", realOwnerEmail));
        } catch {}
      }

      // Stage 4: Update session and finish
      if (typeof window !== "undefined") {
        sessionStorage.setItem("tenopilot_session_unlocked", "true");
        localStorage.setItem(
          "tenopilot_saved_session",
          JSON.stringify({
            email: realOwnerEmail,
            name: fullName.trim(),
            role: "master_admin",
            propertyName: cleanPropName,
            assignedPropertyId: propertyId,
            phone: cleanPhone,
            hasSetPin: true,
            securityPin: pin,
          })
        );
      }

      setProvisionProgress(100);
      setProvisionStatusText("✨ Workspace Ready! Opening Your Flight Deck...");

      setTimeout(() => {
        router.replace(`/p/${propertyId}/overview?tour=true`);
      }, 900);
    } catch (err: any) {
      console.error("Onboarding error:", err);
      setError(err?.message || "Failed to initialize workspace. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff8f6] text-[#201a17] flex flex-col justify-center items-center p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Background Subtle Artwork */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <Image
          src="/tenopilot-leather-emblem.jpg"
          alt="TenoPilot Background"
          fill
          priority
          className="object-cover object-center filter blur-xs"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff8f6]/90 via-[#fff8f6]/95 to-[#fff8f6]" />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-xl bg-white border border-[#d7c2b9] rounded-3xl p-6 sm:p-10 shadow-xl relative z-10 space-y-6">
        
        {/* Header with App Logo & Stepper */}
        <div className="text-center space-y-3">
          <div className="inline-flex justify-center mb-0.5">
            <TenoPilotLogo size="md" variant="terracotta" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#201a17]">
              {step === 1 && "Tell us about yourself"}
              {step === 2 && "Set Your 6-Digit MPIN"}
              {step === 3 && "Let's setup your first property"}
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              {step === 1 && "Configure your master profile in 30 seconds"}
              {step === 2 && "Banking-grade 6-digit access code to unlock your property ledgers"}
              {step === 3 && "You can add more buildings, floors, and branches later"}
            </p>
          </div>

          {/* Stepper Progress Bar (Micro-step RentOK inspired) */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 mb-1.5 px-1">
              <span>Step {step} of 3</span>
              <span className="text-[#964407] font-extrabold">
                {step === 1 && "Profile & WhatsApp"}
                {step === 2 && "6-Digit Banking MPIN"}
                {step === 3 && "Property & Location"}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#f0e4dc] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#c2652a] via-[#b85b20] to-[#964407] transition-all duration-300 rounded-full"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Animated Provisioning State (The Delight Moment) */}
        {isSubmitting ? (
          <div className="py-10 text-center space-y-6 animate-in zoom-in-95">
            <div className="relative w-20 h-20 mx-auto">
              {/* Spinning Glow Ring */}
              <div className="absolute inset-0 rounded-full border-4 border-[#c2652a]/20 border-t-[#c2652a] animate-spin" />
              <div className="absolute inset-2 rounded-full bg-[#fff8f6] flex items-center justify-center text-[#c2652a]">
                {provisionProgress === 100 ? (
                  <CheckCircle2 className="w-9 h-9 text-emerald-600 animate-in zoom-in" />
                ) : (
                  <Building2 className="w-8 h-8 text-[#c2652a] animate-pulse" />
                )}
              </div>
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="text-lg font-bold text-[#201a17]">
                {provisionStatusText}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Setting up high-speed dual ledger accounting &amp; cloud storage
              </p>
            </div>

            <div className="w-full max-w-xs mx-auto h-2 bg-[#f0e4dc] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#c2652a] to-emerald-600 transition-all duration-500 rounded-full"
                style={{ width: `${provisionProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            {/* STEP 1: Personal & Role */}
            {step === 1 && (
              <div className="space-y-5 text-xs animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Role Selection Cards */}
                <div>
                  <label className="block font-bold text-gray-700 mb-2">
                    What best describes your role?
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRoleType("owner")}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        roleType === "owner"
                          ? "bg-[#fff8f6] border-[#964407] ring-2 ring-[#964407]/20 shadow-xs"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-orange-100/70 text-[#964407] flex items-center justify-center mb-2">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-[#201a17] text-xs leading-snug">Owner / Landlord</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRoleType("manager")}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        roleType === "manager"
                          ? "bg-[#fff8f6] border-[#964407] ring-2 ring-[#964407]/20 shadow-xs"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center mb-2">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-[#201a17] text-xs leading-snug">Property Manager</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRoleType("partner")}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        roleType === "partner"
                          ? "bg-[#fff8f6] border-[#964407] ring-2 ring-[#964407]/20 shadow-xs"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-purple-800 flex items-center justify-center mb-2">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-[#201a17] text-xs leading-snug">Operator / Broker</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">
                    What should we call you? *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#c2652a] focus:border-transparent text-xs"
                    />
                  </div>
                </div>

                {/* 
                  DUAL-CHANNEL ONBOARDING LINKING:
                  - If signed up via Phone: Phone is verified. Email Address is the OPTIONAL field with OTP verification right below name!
                  - If signed up via Email: Email is verified. WhatsApp Mobile is the OPTIONAL field with OTP verification right below name!
                */}
                {Boolean(phone && (!email || email.startsWith("phone_") || email.includes("tenopilot.auth") || email.includes("@auth.tenopilot.com"))) ? (
                  <>
                    {/* Optional Email Linking for Phone Users */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-bold text-gray-700">
                          Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        {verifiedEmail || (email && !email.startsWith("phone_") && !email.includes("tenopilot.auth") && !email.includes("@auth.tenopilot.com")) ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                            Optional
                          </span>
                        )}
                      </div>

                      {verifiedEmail || (email && !email.startsWith("phone_") && !email.includes("tenopilot.auth") && !email.includes("@auth.tenopilot.com")) ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
                          <div className="flex items-center gap-2 text-emerald-900 font-medium font-mono">
                            <Mail className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{verifiedEmail || email}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setVerifiedEmail("");
                              setEmail("");
                              setEmailInput("");
                              setEmailOtpSent(false);
                              setEmailOtpCode("");
                            }}
                            className="text-[11px] font-bold text-gray-500 hover:text-rose-600 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex rounded-xl border border-gray-300 focus-within:border-[#c2652a] focus-within:ring-2 focus-within:ring-[#c2652a]/20 overflow-hidden bg-white">
                            <div className="flex items-center pl-3 text-gray-400">
                              <Mail className="w-4 h-4" />
                            </div>
                            <input
                              type="email"
                              placeholder="owner@property.com"
                              value={emailInput}
                              onChange={(e) => {
                                setEmailInput(e.target.value);
                                setEmailError(null);
                              }}
                              disabled={emailOtpSent || isSendingEmailOtp}
                              className="flex-1 py-2.5 px-3 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-hidden bg-transparent"
                            />
                            {emailInput.trim().includes("@") && !emailOtpSent && (
                              <button
                                type="button"
                                onClick={handleSendEmailOtp}
                                disabled={isSendingEmailOtp || emailCooldown > 0}
                                className="px-3 bg-amber-50 hover:bg-amber-100 border-l border-amber-200 text-[#964407] font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {isSendingEmailOtp ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : emailCooldown > 0 ? (
                                  `${emailCooldown}s`
                                ) : (
                                  "Verify"
                                )}
                              </button>
                            )}
                          </div>

                          {emailOtpSent && (
                            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-amber-900 font-semibold">
                                  Enter 6-digit code sent to {emailInput}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEmailOtpSent(false);
                                    setEmailOtpCode("");
                                  }}
                                  className="text-[#c2652a] font-bold hover:underline cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="tel"
                                  maxLength={6}
                                  placeholder="123456"
                                  value={emailOtpCode}
                                  onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ""))}
                                  className="flex-1 py-1.5 px-3 rounded-lg border border-amber-300 bg-white font-mono font-bold text-center tracking-widest text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={handleVerifyEmailOtp}
                                  disabled={isCheckingEmailOtp || emailOtpCode.length !== 6}
                                  className="px-3 py-1.5 rounded-lg bg-[#c2652a] hover:bg-[#964407] text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                >
                                  {isCheckingEmailOtp ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                                </button>
                              </div>
                              {emailError && (
                                <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> {emailError}
                                </p>
                              )}
                            </div>
                          )}

                          <p className="text-[10px] text-gray-400">
                            Optional: Verify email now to allow logging in with either WhatsApp or Email. You can also do this anytime in Edit Profile.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Verified WhatsApp Mobile Number */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-bold text-gray-700">
                          WhatsApp Mobile Number
                        </label>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      </div>
                      <div className="flex items-center p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
                        <div className="flex items-center gap-2 text-emerald-900 font-medium font-mono">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+91 {phone.slice(-10)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Optional WhatsApp Mobile Number for Email Users */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-bold text-gray-700">
                          WhatsApp Mobile Number <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        {verifiedPhone || phone ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                            Optional
                          </span>
                        )}
                      </div>

                      {verifiedPhone || phone ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
                          <div className="flex items-center gap-2 text-emerald-900 font-medium font-mono">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>+91 {(verifiedPhone || phone).slice(-10)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setVerifiedPhone("");
                              setPhone("");
                              setPhoneInput("");
                              setPhoneOtpSent(false);
                              setPhoneOtpCode("");
                            }}
                            className="text-[11px] font-bold text-gray-500 hover:text-rose-600 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex rounded-xl border border-gray-300 focus-within:border-[#c2652a] focus-within:ring-2 focus-within:ring-[#c2652a]/20 overflow-hidden bg-white">
                            <div className="flex items-center gap-1 px-2.5 bg-gray-50 border-r border-gray-200 text-xs font-bold text-gray-600 select-none">
                              <span>🇮🇳 +91</span>
                            </div>
                            <input
                              type="tel"
                              inputMode="numeric"
                              maxLength={10}
                              placeholder="98765 43210"
                              value={phoneInput}
                              onChange={(e) => {
                                setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10));
                                setPhoneError(null);
                              }}
                              disabled={phoneOtpSent || isSendingPhoneOtp}
                              className="flex-1 py-2.5 px-3 text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-hidden tracking-wider bg-transparent"
                            />
                            {phoneInput.length === 10 && !phoneOtpSent && (
                              <button
                                type="button"
                                onClick={handleSendPhoneOtp}
                                disabled={isSendingPhoneOtp || phoneCooldown > 0}
                                className="px-3 bg-emerald-50 hover:bg-emerald-100 border-l border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {isSendingPhoneOtp ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : phoneCooldown > 0 ? (
                                  `${phoneCooldown}s`
                                ) : (
                                  "Verify"
                                )}
                              </button>
                            )}
                          </div>

                          {phoneOtpSent && (
                            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-emerald-900 font-semibold">
                                  Enter 6-digit WhatsApp code sent to +91 {phoneInput}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPhoneOtpSent(false);
                                    setPhoneOtpCode("");
                                  }}
                                  className="text-[#c2652a] font-bold hover:underline cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="tel"
                                  maxLength={6}
                                  placeholder="123456"
                                  value={phoneOtpCode}
                                  onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, ""))}
                                  className="flex-1 py-1.5 px-3 rounded-lg border border-emerald-300 bg-white font-mono font-bold text-center tracking-widest text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={handleVerifyPhoneOtp}
                                  disabled={isCheckingPhoneOtp || phoneOtpCode.length !== 6}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                >
                                  {isCheckingPhoneOtp ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                                </button>
                              </div>
                              {phoneError && (
                                <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> {phoneError}
                                </p>
                              )}
                            </div>
                          )}

                          <p className="text-[10px] text-gray-400">
                            Optional: Verify with WhatsApp now to receive tenant receipts &amp; enable phone login. You can also do this anytime in Edit Profile.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Verified Registered Email */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-bold text-gray-700">
                          Registered Email Address
                        </label>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      </div>
                      <div className="flex items-center p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
                        <div className="flex items-center gap-2 text-emerald-900 font-medium font-mono">
                          <Mail className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{email}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Continue to Step 2 Button */}
                <button
                  type="button"
                  onClick={handleProceedToStep2}
                  className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-[#c2652a] via-[#b85b20] to-[#964407] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-[#c2652a]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <span>Continue to Set MPIN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: 6-Digit Banking MPIN */}
            {step === 2 && (
              <div className="space-y-5 text-xs animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-[#964407] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                    Your 6-digit MPIN provides rapid 1-tap authentication on your phone or tablet without typing long passwords every time.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Enter MPIN */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1.5">
                      Create 6-Digit MPIN *
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? "text" : "password"}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="Enter 6-digit MPIN"
                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-mono tracking-widest text-base font-bold text-center focus:ring-2 focus:ring-[#c2652a] focus:border-transparent"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showPin ? "Hide MPIN" : "Show MPIN"}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowPin(!showPin);
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 active:scale-90 transition-all z-20 cursor-pointer"
                      >
                        {showPin ? <EyeOff className="w-4 h-4 text-[#964407]" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm MPIN */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1.5">
                      Confirm 6-Digit MPIN *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPin ? "text" : "password"}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="Re-enter 6-digit MPIN"
                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-mono tracking-widest text-base font-bold text-center focus:ring-2 focus:ring-[#c2652a] focus:border-transparent"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showConfirmPin ? "Hide MPIN" : "Show MPIN"}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowConfirmPin(!showConfirmPin);
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 active:scale-90 transition-all z-20 cursor-pointer"
                      >
                        {showConfirmPin ? <EyeOff className="w-4 h-4 text-[#964407]" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Back & Next Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-3 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleProceedToStep3}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#c2652a] via-[#b85b20] to-[#964407] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-[#c2652a]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                  >
                    <span>Continue to Property Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Property Identity & 1-Tap Geolocation */}
            {step === 3 && (
              <form onSubmit={handleFinalSubmit} className="space-y-4 text-xs animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Property Name */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">
                    Property / Building Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={propertyName}
                      onChange={(e) => setPropertyName(e.target.value)}
                      placeholder="e.g. Arihant Coliving"
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#c2652a] focus:border-transparent text-xs"
                    />
                  </div>
                </div>

                {/* Property Category */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">
                    What type of property do you manage?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "PG / Co-Living", desc: "Shared living" },
                      { label: "Student Hostel", desc: "Campus hostel" },
                      { label: "Apartment", desc: "Flats & units" },
                      { label: "House Rental", desc: "Private rentals" },
                    ].map((cat) => (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setPropertyCategory(cat.label)}
                        className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                          propertyCategory === cat.label
                            ? "bg-[#964407] text-white border-[#964407] shadow-xs"
                            : "bg-[#fff8f6] text-[#554339] border-[#d7c2b9] hover:bg-[#f8ede3]"
                        }`}
                      >
                        <p className="font-bold text-[11px] leading-snug">{cat.label}</p>
                        <p className={`text-[9px] mt-0.5 ${propertyCategory === cat.label ? "text-white/80" : "text-gray-400"}`}>
                          {cat.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location with 1-Tap Geolocation button (RentOK style) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-gray-700">
                      Property Location *
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={isLocating}
                      className="text-[11px] font-bold text-[#c2652a] hover:text-[#964407] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Detecting GPS...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3 h-3 text-[#c2652a]" />
                          <span>Use My Current Location</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Madhapur, Hitec City, Hyderabad"
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#c2652a] focus:border-transparent text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Tap &ldquo;Use My Current Location&rdquo; above for instant 1-tap GPS detection or edit manually.
                  </p>
                </div>

                {/* FastTrack AI Migration Teaser */}
                <div className="p-3.5 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] text-[11px] text-[#6e391b] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Hotel className="w-4 h-4 text-[#c2652a] shrink-0" />
                    <span>Have paper registers or PDFs? Import 50+ tenants in 1-click inside dashboard with FastTrack AI!</span>
                  </div>
                </div>

                {/* Actions: Back & Complete */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={isSubmitting}
                    className="py-3 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#c2652a] via-[#b85b20] to-[#964407] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-[#c2652a]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                  >
                    <span>Launch Property Workspace</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function WelcomeOnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fff8f6] flex items-center justify-center text-xs font-bold text-gray-500">Initializing TenoPilot...</div>}>
      <WelcomeOnboardingContent />
    </Suspense>
  );
}
