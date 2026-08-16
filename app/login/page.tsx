"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  RotateCcw,
} from "lucide-react";
import { loginWithGoogle, loginWithEmailPassword, sendPasswordReset, getCleanAuthErrorMessage } from "@/lib/authService";
import { staffStore, UserRole } from "@/lib/staffStore";
import { PwaBootSplashScreen } from "@/components/auth/PwaBootSplashScreen";
import { AuthPwaInstallSection } from "@/components/pwa/AuthPwaInstallSection";

interface SavedSession {
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  propertyName?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [showBootSplash, setShowBootSplash] = useState(true);

  // Auth Flow Steps: "CREDENTIALS" | "PIN_PROMPT"
  const [authStep, setAuthStep] = useState<"CREDENTIALS" | "PIN_PROMPT">("CREDENTIALS");
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);

  // Form Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 6-Digit PIN Keypad State
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lockoutExpiry, setLockoutExpiry] = useState<number | null>(null);
  const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);

  // Forgot Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Check for saved local device session on mount (Fintech Quick Unlock)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tenopilot_saved_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as SavedSession;
          setSavedSession(parsed);
          setEmail(parsed.email);
          setAuthStep("PIN_PROMPT");
        } catch {
          setSavedSession(null);
        }
      }

      const lockout = localStorage.getItem("tenopilot_pin_lockout");
      if (lockout) {
        const expiry = parseInt(lockout, 10);
        if (expiry > Date.now()) {
          setLockoutExpiry(expiry);
        }
      }
    }
  }, []);

  // Lockout Countdown Timer
  useEffect(() => {
    if (!lockoutExpiry) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutExpiry - Date.now()) / 1000));
      setLockoutCountdown(remaining);
      if (remaining <= 0) {
        setLockoutExpiry(null);
        setWrongAttempts(0);
        localStorage.removeItem("tenopilot_pin_lockout");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutExpiry]);

  // Handle Step 1 (Email/Password or Google)
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      try {
        await loginWithEmailPassword(email, password);
      } catch (authErr: any) {
        // Support demo owner & staff accounts
        const isDemoAdmin = email.trim().toLowerCase() === "admin@gmail.com" && password === "admin123";
        const isDemoMaster = email.trim().toLowerCase() === "ramesh@tenopilot.com";
        const isDemoStaff = email.trim().toLowerCase().includes("sunshinepg.com");
        
        if (!isDemoAdmin && !isDemoMaster && !isDemoStaff) {
          throw authErr;
        }
      }

      // Query staff or establish session
      const allStaff = staffStore.getAllGlobalStaff();
      const match = allStaff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());

      const session: SavedSession = {
        email: email.trim().toLowerCase(),
        name: match?.name || (email.includes("ramesh") ? "Ramesh Darisi" : "Estate Admin"),
        role: match?.role || (email.includes("rec") ? "receptionist" : "master_admin"),
        propertyName: match?.propertyName || "Sunshine Heights PG",
      };

      setSavedSession(session);
      localStorage.setItem("tenopilot_saved_session", JSON.stringify(session));
      staffStore.setActiveRole(session.role);

      // Transition to Step 2 (PIN Prompt)
      setAuthStep("PIN_PROMPT");
      setPinDigits(["", "", "", "", "", ""]);
    } catch (err: any) {
      setError(getCleanAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
      const session: SavedSession = {
        email: "owner@tenopilot.com",
        name: "Estate Master Admin",
        role: "master_admin",
        propertyName: "Sunshine Heights PG",
      };
      setSavedSession(session);
      localStorage.setItem("tenopilot_saved_session", JSON.stringify(session));
      staffStore.setActiveRole("master_admin");

      // Transition to Step 2 (PIN Prompt)
      setAuthStep("PIN_PROMPT");
      setPinDigits(["", "", "", "", "", ""]);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError(getCleanAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle PIN Digit Keypad Entry
  const handlePinInput = (digit: string) => {
    if (lockoutExpiry) return;
    const nextEmptyIndex = pinDigits.findIndex((d) => d === "");
    if (nextEmptyIndex === -1) return;

    const newDigits = [...pinDigits];
    newDigits[nextEmptyIndex] = digit;
    setPinDigits(newDigits);

    // If 6 digits completed, verify automatically
    if (nextEmptyIndex === 5) {
      const fullPin = newDigits.join("");
      verifyAndRedirect(fullPin);
    }
  };

  const handlePinBackspace = () => {
    const lastFilledIndex = [...pinDigits].reverse().findIndex((d) => d !== "");
    if (lastFilledIndex === -1) return;
    const targetIndex = 5 - lastFilledIndex;
    const newDigits = [...pinDigits];
    newDigits[targetIndex] = "";
    setPinDigits(newDigits);
    setError(null);
  };

  const handlePinClear = () => {
    setPinDigits(["", "", "", "", "", ""]);
    setError(null);
  };

  // Verify PIN & Smart Redirection
  const verifyAndRedirect = (inputPin: string) => {
    setIsLoading(true);
    setError(null);

    const targetEmail = savedSession?.email || email || "admin@gmail.com";
    const verification = staffStore.verifySecurityPin(targetEmail, inputPin);

    if (verification.valid) {
      const role = verification.member?.role || savedSession?.role || "master_admin";
      staffStore.setActiveRole(role);

      const targetProperty = verification.member?.assignedPropertyId || "sunshine-pg";

      if (role === "master_admin") {
        router.push("/home");
      } else {
        router.push(`/p/${targetProperty}/overview`);
      }
    } else {
      setIsLoading(false);
      const newAttempts = wrongAttempts + 1;
      setWrongAttempts(newAttempts);
      setPinDigits(["", "", "", "", "", ""]);

      if (newAttempts >= 5) {
        const expiry = Date.now() + 15 * 60 * 1000;
        setLockoutExpiry(expiry);
        localStorage.setItem("tenopilot_pin_lockout", expiry.toString());
        setError("🔒 Account locked due to 5 incorrect attempts. Please wait 15 minutes.");
      } else {
        setError(`Incorrect 6-digit PIN. (${5 - newAttempts} attempts remaining)`);
      }
    }
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem("tenopilot_saved_session");
    setSavedSession(null);
    setAuthStep("CREDENTIALS");
    setPinDigits(["", "", "", "", "", ""]);
    setEmail("");
    setPassword("");
    setError(null);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(false);
    setIsResetting(true);

    try {
      await sendPasswordReset(resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(getCleanAuthErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      {/* 🎬 1-Second PWA Boot Splash Screen on Launch */}
      {showBootSplash && (
        <PwaBootSplashScreen onComplete={() => setShowBootSplash(false)} durationMs={1100} />
      )}

      <div className="min-h-screen bg-[#f7f4ee] text-[#201a17] flex relative overflow-hidden font-sans">
        
        {/* ========================================================================= */}
        {/* 📱 MOBILE BACKGROUND (30% Opacity Leather Emblem Artwork + Backdrop Blur) */}
        {/* ========================================================================= */}
        <div className="lg:hidden absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <Image
            src="/tenopilot-leather-emblem.jpg"
            alt="TenoPilot Leather Emblem"
            fill
            priority
            className="object-cover object-center opacity-30 scale-105 filter blur-xs"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#f7f4ee]/85 via-[#f7f4ee]/90 to-[#f7f4ee]" />
        </div>

        {/* ========================================================================= */}
        {/* 🖥️ DESKTOP LEFT 40%: Capped Artwork Panel (Zero Emblem Clipping)            */}
        {/* ========================================================================= */}
        <div className="hidden lg:block lg:w-[40%] xl:w-[38%] 2xl:max-w-[580px] shrink-0 relative min-h-screen bg-[#f7f4ee] overflow-hidden border-r border-[#e8dfd8]">
          <Image
            src="/tenopilot-leather-emblem.jpg"
            alt="TenoPilot 3D Leather Emblem Artwork"
            fill
            priority
            className="object-cover object-center"
          />
        </div>

        {/* ========================================================================= */}
        {/* 🔑 RIGHT 60%: Responsive White Portal (Expands on Widescreens)             */}
        {/* ========================================================================= */}
        <div className="w-full lg:flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10 bg-white min-h-screen overflow-y-auto">
          <div className="w-full max-w-md space-y-5 my-auto">

            {/* Header: Official Terracotta TenoPilot App Icon & Title */}
            <div className="text-center space-y-2">
              <div className="inline-flex justify-center mb-0.5">
                <Image
                  src="/tenopilot-app-icon.png"
                  alt="TenoPilot App Icon"
                  width={48}
                  height={48}
                  className="rounded-2xl shadow-sm hover:scale-105 transition-transform"
                  priority
                />
              </div>
              <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#201a17] tracking-tight">
                {authStep === "PIN_PROMPT" ? "Enter Security PIN" : "Welcome to TenoPilot.com"}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {authStep === "PIN_PROMPT"
                  ? "Enter your 6-digit access code to unlock"
                  : "Sign in to manage your properties & residents"}
              </p>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-semibold animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* =================================================================== */}
            {/* TIER 1: CREDENTIALS AUTHENTICATION (Google / Email & Password)      */}
            {/* =================================================================== */}
            {authStep === "CREDENTIALS" ? (
              <div className="space-y-4 animate-in fade-in">
                {/* 1. Google Sign In Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-2xl border border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-800 font-bold text-xs flex items-center justify-center gap-3 shadow-xs transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>

                {/* Divider */}
                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-gray-200 w-full" />
                  <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
                    Or continue with email
                  </span>
                  <div className="border-t border-gray-200 w-full" />
                </div>

                {/* Email + Password Form */}
                <form onSubmit={handleCredentialsSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Work Email / Staff ID
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. ramesh@tenopilot.com or priya.desk@sunshinepg.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] focus:border-[#c2652a] transition-all bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-bold text-gray-700">Password</label>
                      <button
                        type="button"
                        onClick={() => setShowResetModal(true)}
                        className="text-[11px] font-bold text-[#c2652a] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] focus:border-[#c2652a] transition-all bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50 mt-2"
                  >
                    {isLoading ? "Verifying..." : "Continue to Security PIN"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Sign up Link */}
                <div className="text-center pt-1">
                  <span className="text-xs text-gray-500 font-medium">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="font-bold text-[#c2652a] hover:underline">
                      Sign up
                    </Link>
                  </span>
                </div>
              </div>
            ) : (
              /* =================================================================== */
              /* TIER 2: 6-DIGIT FINTECH SECURITY PIN UNLOCK KEYPAD                  */
              /* =================================================================== */
              <div className="space-y-5 animate-in zoom-in-95">
                {/* User Identification Header */}
                <div className="p-3 bg-orange-50/60 rounded-2xl border border-orange-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#964407] text-white font-bold flex items-center justify-center text-xs border border-amber-300">
                      {savedSession?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">{savedSession?.name || "Ramesh Darisi"}</h4>
                      <p className="text-[10px] text-gray-500 font-semibold">
                        {savedSession?.role === "master_admin"
                          ? "Master Admin 👑 • All Properties"
                          : savedSession?.role === "admin"
                          ? "Admin 🏢 • " + savedSession.propertyName
                          : "Receptionist 🔑 • Front Desk"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="p-1.5 text-gray-400 hover:text-gray-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Switch Account"
                  >
                    <RotateCcw className="w-3 h-3" /> Switch
                  </button>
                </div>

                {/* 6 Visual PIN Dots */}
                <div className="flex justify-center items-center gap-3 py-1">
                  {pinDigits.map((digit, idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all duration-200 ${
                        digit !== ""
                          ? "bg-[#c2652a] scale-110 shadow-xs shadow-orange-500"
                          : "border-2 border-gray-300 bg-gray-100"
                      }`}
                    />
                  ))}
                </div>

                {/* Lockout Countdown Timer */}
                {lockoutExpiry && (
                  <div className="text-center p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold text-xs">
                    ⏳ Locked out. Retry in {Math.floor(lockoutCountdown / 60)}m {lockoutCountdown % 60}s
                  </div>
                )}

                {/* Interactive Number Keypad */}
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      disabled={Boolean(lockoutExpiry) || isLoading}
                      onClick={() => handlePinInput(num)}
                      className="h-12 rounded-2xl bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-[#c2652a] text-gray-900 font-bold text-lg flex items-center justify-center transition-all active:scale-95 shadow-2xs cursor-pointer disabled:opacity-40"
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={Boolean(lockoutExpiry) || isLoading}
                    onClick={handlePinClear}
                    className="h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-40"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(lockoutExpiry) || isLoading}
                    onClick={() => handlePinInput("0")}
                    className="h-12 rounded-2xl bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-[#c2652a] text-gray-900 font-bold text-lg flex items-center justify-center transition-all active:scale-95 shadow-2xs cursor-pointer disabled:opacity-40"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(lockoutExpiry) || isLoading}
                    onClick={handlePinBackspace}
                    className="h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-40"
                  >
                    ⌫
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-[11px] text-gray-400 font-medium">
                    Demo PIN: <strong className="text-gray-700 font-mono">123456</strong>
                  </p>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 📲 PWA SCAN TO INSTALL MOBILE & DESKTOP APP SECTION                 */}
            {/* =================================================================== */}
            <AuthPwaInstallSection />

          </div>
        </div>

      </div>

      {/* Forgot Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-serif font-bold text-base text-gray-900">
                Reset Account Password
              </h3>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Password Reset Link Sent!</span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">
                  We have dispatched password recovery instructions to <strong>{resetEmail}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="w-full mt-2 py-2 bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-3">
                <p className="text-gray-500 text-[11px]">
                  Enter your registered work email to receive a password recovery link.
                </p>
                {resetError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-semibold">
                    {resetError}
                  </div>
                )}
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@property.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 bg-white"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-gray-300 font-bold text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-4 py-2 rounded-xl bg-[#c2652a] text-white font-bold shadow-xs disabled:opacity-50"
                  >
                    {isResetting ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
