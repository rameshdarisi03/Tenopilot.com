"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  Sparkles,
  Building2,
  ShieldAlert,
} from "lucide-react";
import {
  checkAccountRegistrationStatus,
  loginWithEmailPassword,
  registerWithEmailPassword,
  sendPasswordReset,
  getCleanAuthErrorMessage,
} from "@/lib/authService";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface EmailAuthSuccessResult {
  email: string;
  displayName?: string;
  role?: string;
  assignedPropertyId?: string;
  securityPin?: string;
  hasSetPin?: boolean;
  destination: string;
  isNewUser?: boolean;
}

interface EmailAuthCardProps {
  onBackToOptions: () => void;
  onSuccess: (result: EmailAuthSuccessResult) => void;
  initialEmail?: string;
}

type Stage = "ENTER_EMAIL" | "ENTER_PASSWORD" | "NEW_USER_OTP_AND_PASSWORD" | "FORGOT_PASSWORD_OTP";

export function EmailAuthCard({ onBackToOptions, onSuccess, initialEmail = "" }: EmailAuthCardProps) {
  const [stage, setStage] = useState<Stage>("ENTER_EMAIL");
  const [email, setEmail] = useState(initialEmail.trim().toLowerCase());
  const [isStaff, setIsStaff] = useState(false);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [staffPropertyName, setStaffPropertyName] = useState<string | null>(null);

  // Password fields
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // New User Registration fields
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot Password state
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"ENTER_OTP" | "SUCCESS">("ENTER_OTP");
  const [forgotPasswordToken, setForgotPasswordToken] = useState<string | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Focus management
  useEffect(() => {
    if (stage === "ENTER_EMAIL") {
      emailInputRef.current?.focus();
    } else if (stage === "ENTER_PASSWORD") {
      passwordInputRef.current?.focus();
    } else if (stage === "NEW_USER_OTP_AND_PASSWORD" || stage === "FORGOT_PASSWORD_OTP") {
      otpInputRef.current?.focus();
    }
  }, [stage]);

  // Resend OTP Cooldown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Dispatches 6-Digit Email OTP via Brevo / Zoho Gateway
  const dispatchEmailOtp = async (targetEmail: string): Promise<string | null> => {
    const res = await fetch("/api/auth/email/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to dispatch verification email. Please try again.");
    }
    setResendCooldown(data.cooldownSeconds || 45);
    return data.verificationToken;
  };

  // -------------------------------------------------------------
  // STAGE 1: Check Email Registration & Determine Route
  // -------------------------------------------------------------
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("Please enter a valid email address (e.g., owner@tenopilot.com)");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Check if email exists in staff_accounts
      let staffDocFound = false;
      let sRole = "receptionist";
      let sPropName = "";

      try {
        if (db) {
          const staffSnap = await getDoc(doc(db, "staff_accounts", cleanEmail));
          if (staffSnap.exists()) {
            staffDocFound = true;
            const sData = staffSnap.data();
            sRole = sData.role || "receptionist";
            sPropName = sData.propertyName || "Assigned Property";
          }
        }
      } catch (err) {
        console.warn("Notice checking staff_accounts:", err);
      }

      // 2. Query universal registration status
      const regStatus = await checkAccountRegistrationStatus(cleanEmail);

      if (staffDocFound || regStatus.isStaff) {
        // --- CASE A: STAFF MEMBER ---
        setIsStaff(true);
        setStaffRole(sRole);
        setStaffPropertyName(sPropName);
        setPassword("");
        setStage("ENTER_PASSWORD");
      } else if (regStatus.exists) {
        // --- CASE B: RETURNING OWNER ---
        setIsStaff(false);
        setPassword("");
        setStage("ENTER_PASSWORD");
      } else {
        // --- CASE C: NEW USER (No Account Yet) ---
        setIsStaff(false);
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");

        // Dispatch 6-digit Email OTP immediately
        const token = await dispatchEmailOtp(cleanEmail);
        setVerificationToken(token);
        setSuccessNotice(`We've sent a 6-digit verification code to ${cleanEmail}`);
        setStage("NEW_USER_OTP_AND_PASSWORD");
      }
    } catch (err: any) {
      console.error("Email detection error:", err);
      setError(err?.message || "Failed to check account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // STAGE 2: Returning User Password Authentication
  // -------------------------------------------------------------
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const loginResult = await loginWithEmailPassword(cleanEmail, password);

      // Fetch user profile to route properly
      let profileData: any = null;
      let isStaffMember = isStaff;

      if (db) {
        // Check staff_accounts first
        try {
          const staffSnap = await getDoc(doc(db, "staff_accounts", cleanEmail));
          if (staffSnap.exists()) {
            profileData = staffSnap.data();
            isStaffMember = true;
          }
        } catch {}

        // Check users collection
        if (!profileData) {
          try {
            const uQ = query(collection(db, "users"), where("email", "==", cleanEmail));
            const uSnap = await getDocs(uQ);
            if (!uSnap.empty) {
              profileData = uSnap.docs[0].data();
            }
          } catch {}
        }
      }

      const role = profileData?.role || (isStaffMember ? "receptionist" : "master_admin");
      const assignedPropertyId = profileData?.assignedPropertyId || "";
      const hasSetPin = Boolean(profileData?.hasSetPin && profileData?.securityPin);
      const securityPin = profileData?.securityPin;
      const displayName = profileData?.displayName || profileData?.name || "Property Owner";

      // If user has set an MPIN, route through MPIN unlock, else route to their destination
      let destination = "/home";
      if (hasSetPin && securityPin) {
        destination = "PIN_PROMPT";
      } else if (isStaffMember) {
        destination = assignedPropertyId ? `/p/${assignedPropertyId}/overview` : "/home";
      } else if (profileData?.onboardingCompleted === false) {
        destination = "/welcome";
      }

      onSuccess({
        email: cleanEmail,
        displayName,
        role,
        assignedPropertyId,
        securityPin,
        hasSetPin,
        destination,
      });
    } catch (err: any) {
      console.error("Password authentication error:", err);
      setError(getCleanAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // STAGE 3: New User OTP Verification + Create Password (min 10 chars)
  // -------------------------------------------------------------
  const handleNewUserRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP code sent to your email.");
      return;
    }

    if (!newPassword || newPassword.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Verify OTP with backend
      const verifyRes = await fetch("/api/auth/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          otp: cleanOtp,
          verificationToken,
        }),
      });

      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.message || "Invalid or expired OTP code. Please try again.");
      }

      // 2. Register account in Firebase Auth with the 10+ character password
      const { user, profile } = await registerWithEmailPassword(cleanEmail, newPassword);

      // 3. Complete and route straight to onboarding
      onSuccess({
        email: cleanEmail,
        displayName: profile.displayName || "Property Owner",
        role: "master_admin",
        destination: "/welcome",
        isNewUser: true,
      });
    } catch (err: any) {
      console.error("New user registration error:", err);
      setError(getCleanAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP for New User
  const handleResendNewUserOtp = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setSuccessNotice(null);
    setIsLoading(true);

    try {
      const token = await dispatchEmailOtp(email.trim().toLowerCase());
      setVerificationToken(token);
      setSuccessNotice(`New 6-digit verification code sent to ${email}`);
    } catch (err: any) {
      setError(err?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // STAGE 4: Owner Forgot Password OTP Reset
  // -------------------------------------------------------------
  const handleStartForgotPassword = async () => {
    if (isStaff) return; // Staff cannot self-service reset
    setError(null);
    setSuccessNotice(null);
    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const token = await dispatchEmailOtp(cleanEmail);
      setForgotPasswordToken(token);
      setOtp("");
      setForgotPasswordStep("ENTER_OTP");
      setStage("FORGOT_PASSWORD_OTP");
      setSuccessNotice(`Verification code sent to ${cleanEmail}`);
    } catch (err: any) {
      setError(err?.message || "Failed to dispatch password reset code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyForgotPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // Verify OTP
      const verifyRes = await fetch("/api/auth/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          otp: cleanOtp,
          verificationToken: forgotPasswordToken,
        }),
      });

      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.message || "Invalid or expired OTP code.");
      }

      // Identity verified! Dispatch official Firebase password reset email
      await sendPasswordReset(cleanEmail);
      setForgotPasswordStep("SUCCESS");
      setSuccessNotice(`Identity verified! A 1-click password reset link has been dispatched to ${cleanEmail}.`);
    } catch (err: any) {
      setError(getCleanAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER UI
  // -------------------------------------------------------------
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (stage === "ENTER_EMAIL") {
              onBackToOptions();
            } else {
              setStage("ENTER_EMAIL");
              setError(null);
              setSuccessNotice(null);
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>{stage === "ENTER_EMAIL" ? "Back to sign-in options" : "Change email"}</span>
        </button>

        <span className="text-[11px] font-bold text-[#c2652a] uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
          Email Sign-In
        </span>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 font-semibold animate-in fade-in shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 font-semibold animate-in fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span className="leading-snug">{successNotice}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* STAGE 1: ENTER EMAIL (Progressive Entry)                  */}
      {/* ========================================================= */}
      {stage === "ENTER_EMAIL" && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Work or Personal Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={emailInputRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@property.com or owner@gmail.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#c2652a] focus:outline-hidden bg-white text-gray-900 shadow-2xs"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              Enter your email to sign in or create a new property account.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
          >
            <span>{isLoading ? "Checking Account..." : "Continue"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* ========================================================= */}
      {/* STAGE 2: RETURNING USER / STAFF PASSWORD PROMPT          */}
      {/* ========================================================= */}
      {stage === "ENTER_PASSWORD" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
          {/* Active Email Pill */}
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {isStaff ? "Staff Account Detected" : "Returning User"}
              </p>
              <p className="font-bold text-gray-900 truncate">{email}</p>
              {isStaff && staffPropertyName && (
                <p className="text-[10px] text-[#c2652a] font-semibold mt-0.5">
                  🏢 {staffPropertyName} • {staffRole === "admin" ? "Property Admin" : "Desk Receptionist"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setStage("ENTER_EMAIL");
                setPassword("");
              }}
              className="text-[11px] font-bold text-[#c2652a] hover:underline shrink-0"
            >
              Change
            </button>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700">Account Password</label>
              
              {/* Only Owners can self-service reset via OTP; Staff passwords are controlled by Admin */}
              {!isStaff ? (
                <button
                  type="button"
                  onClick={handleStartForgotPassword}
                  disabled={isLoading}
                  className="text-[11px] font-bold text-[#c2652a] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              ) : null}
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#c2652a] focus:outline-hidden bg-white text-gray-900 shadow-2xs"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 active:scale-90 transition-all z-20 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-[#c2652a]" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>

            {/* Staff Explanatory Note (No Privacy / Controlled by Hierarchy) */}
            {isStaff && (
              <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Staff Security Policy</strong>: Staff passwords are assigned and maintained by your Master Admin / Property Admin. Contact your manager if you need your password updated.
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50 mt-2"
          >
            <span>{isLoading ? "Signing In..." : "Sign In to Workspace"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* ========================================================= */}
      {/* STAGE 3: NEW USER REGISTRATION (OTP + PASSWORD min 10)    */}
      {/* ========================================================= */}
      {stage === "NEW_USER_OTP_AND_PASSWORD" && (
        <form onSubmit={handleNewUserRegistration} className="space-y-3.5">
          {/* Active Email Pill */}
          <div className="p-2.5 bg-orange-50/80 border border-orange-200 rounded-xl flex items-center justify-between text-xs">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] uppercase font-bold text-[#c2652a] tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                New Property Account
              </span>
              <p className="font-bold text-gray-900 truncate">{email}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStage("ENTER_EMAIL");
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="text-[11px] font-bold text-[#c2652a] hover:underline shrink-0"
            >
              Change
            </button>
          </div>

          {/* 6-Digit Email OTP Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700">
                6-Digit Email Verification Code
              </label>
              <button
                type="button"
                disabled={resendCooldown > 0 || isLoading}
                onClick={handleResendNewUserOtp}
                className="text-[11px] font-bold text-[#c2652a] hover:underline disabled:text-gray-400 disabled:no-underline cursor-pointer"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </button>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={otpInputRef}
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono tracking-widest font-black focus:ring-2 focus:ring-[#c2652a] focus:outline-hidden bg-white text-gray-900 shadow-2xs"
              />
            </div>
          </div>

          {/* Create Password (min 10 chars) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Create Password <span className="text-gray-400 font-normal">(minimum 10 characters)</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showNewPassword ? "text" : "password"}
                required
                minLength={10}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 10 characters"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#c2652a] focus:outline-hidden bg-white text-gray-900 shadow-2xs"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 active:scale-90 transition-all z-20 cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4 text-[#c2652a]" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            {newPassword && (
              <p className={`text-[10px] mt-1 font-bold ${newPassword.length >= 10 ? "text-emerald-600" : "text-amber-600"}`}>
                {newPassword.length >= 10 ? "✓ Strong length (10+ characters)" : `Length: ${newPassword.length}/10 characters`}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={10}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#c2652a] focus:outline-hidden bg-white text-gray-900 shadow-2xs"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-800 active:scale-90 transition-all z-20 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4 text-[#c2652a]" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6 || newPassword.length < 10 || newPassword !== confirmPassword}
            className="w-full py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50 mt-3"
          >
            <span>{isLoading ? "Creating Account..." : "Verify & Continue to Onboarding"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* ========================================================= */}
      {/* STAGE 4: FORGOT PASSWORD OTP RESET (OWNERS ONLY)          */}
      {/* ========================================================= */}
      {stage === "FORGOT_PASSWORD_OTP" && (
        <div className="space-y-4">
          {forgotPasswordStep === "ENTER_OTP" ? (
            <form onSubmit={handleVerifyForgotPasswordOtp} className="space-y-3.5">
              <div className="text-center space-y-1">
                <h3 className="font-serif font-bold text-base text-gray-900">
                  Reset Account Password
                </h3>
                <p className="text-xs text-gray-500">
                  Enter the 6-digit verification code sent to <strong>{email}</strong> to verify your identity.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={otpInputRef}
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono tracking-widest font-black focus:ring-2 focus:ring-[#c2652a] focus:outline-hidden bg-white text-gray-900 shadow-2xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
              >
                <span>{isLoading ? "Verifying..." : "Verify & Send Reset Link"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStage("ENTER_PASSWORD")}
                  className="text-xs font-bold text-gray-500 hover:text-gray-900 hover:underline"
                >
                  Cancel and return to password
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-base text-gray-900">
                  Password Reset Link Sent!
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  We have dispatched a 1-click password reset link to <strong>{email}</strong>. Please check your inbox and click the link to update your password.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStage("ENTER_PASSWORD");
                  setPassword("");
                }}
                className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
