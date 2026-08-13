"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Clock,
} from "lucide-react";
import {
  loginWithGoogle,
  registerWithEmailPassword,
  sendUserEmailVerification,
  logoutUser,
  getCleanAuthErrorMessage,
} from "@/lib/authService";
import { useAuth } from "@/providers/AuthProvider";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { PWAInstallBanner } from "@/components/pwa/PWAInstallBanner";

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingStatus, setIsVerifyingStatus] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const isGoogleUser = user?.providerData?.some((p) => p.providerId === "google.com");
  const isEmailUnverified = user && !isGoogleUser && !user.emailVerified;
  const isGatekeeperActive = verificationSent || isEmailUnverified || searchParams?.get("verify") === "true";

  // Auto-polling Engine: Every 3.5s check if user clicked the email verification link
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (user && !user.emailVerified && !isGoogleUser) {
      interval = setInterval(async () => {
        try {
          await user.reload();
          if (user.emailVerified) {
            router.push("/home");
          }
        } catch (e) {
          // Silent polling error handling
        }
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, isGoogleUser, router]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!agreedTerms) {
      setError("Please agree to TenoPilot Terms of Service & Privacy Policy to continue.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify your password entry.");
      return;
    }

    setIsLoading(true);

    try {
      await registerWithEmailPassword(email, password, fullName);
      setVerificationSent(true);
    } catch (err: any) {
      setError(getCleanAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
      router.push("/home");
    } catch (err: any) {
      console.error("Google Sign-Up Error:", err);
      setError(getCleanAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCheckVerification = async () => {
    if (!user) return;
    setIsVerifyingStatus(true);
    setResendStatus(null);

    try {
      await user.reload();
      if (user.emailVerified) {
        setResendStatus("✅ Email verified! Redirecting to your dashboard...");
        setTimeout(() => {
          router.push("/home");
        }, 1000);
      } else {
        setResendStatus("⚠️ Email not verified yet. Please click the link sent to your inbox.");
      }
    } catch (err: any) {
      setResendStatus(getCleanAuthErrorMessage(err));
    } finally {
      setIsVerifyingStatus(false);
    }
  };

  const handleResendVerification = async () => {
    setResendStatus("Sending verification link...");
    try {
      await sendUserEmailVerification();
      setResendStatus("✉️ Fresh verification email sent! Please check your inbox & spam folder.");
    } catch (err: any) {
      setResendStatus(getCleanAuthErrorMessage(err));
    }
  };

  const handleLogoutAndReset = async () => {
    await logoutUser();
    setVerificationSent(false);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    router.push("/signup");
  };

  const targetEmail = email || user?.email || "your email";

  return (
    <div className="min-h-screen bg-[#fff8f6] text-[#201a17] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#f8ede3]/60 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#f8ede3]/40 blur-3xl pointer-events-none" />

      {/* Main Centered Auth Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#d7c2b9] p-8 sm:p-10 shadow-xl shadow-[#964407]/5 relative z-10 space-y-6">
        
        {/* Brand Emblem Logo */}
        <div className="flex justify-center">
          <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
            <TenoPilotLogo size="lg" />
          </Link>
        </div>

        {/* 🛑 GATEKEEPER VIEW: VERIFY EMAIL ADDRESS */}
        {isGatekeeperActive ? (
          <div className="space-y-6 text-center animate-fadeIn">
            {/* Animated Mail Badge */}
            <div className="relative inline-flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-16 w-16 rounded-2xl bg-[#964407]/20"></span>
              <div className="w-16 h-16 rounded-2xl bg-[#f8ede3] text-[#964407] flex items-center justify-center relative z-10 shadow-sm border border-[#d7c2b9]">
                <Mail className="w-8 h-8 text-[#964407]" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="font-serif font-bold text-2xl text-[#201a17]">
                Verify Your Email Address
              </h1>
              <p className="text-xs text-[#554339] leading-relaxed">
                We sent an official activation link to:
              </p>
              <p className="font-mono font-bold text-sm text-[#964407] bg-[#f8ede3] py-1.5 px-3 rounded-xl border border-[#d7c2b9] inline-block">
                {targetEmail}
              </p>
              <p className="text-[11px] text-[#554339]/80 pt-1">
                Please check your inbox and click the link to activate your 10-day trial.
              </p>
            </div>

            {/* Status Feedback Banner */}
            {resendStatus && (
              <div className="p-3.5 rounded-2xl bg-[#f8ede3] border border-[#d7c2b9] text-xs font-semibold text-[#964407] animate-fadeIn">
                {resendStatus}
              </div>
            )}

            {/* Gatekeeper Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleManualCheckVerification}
                disabled={isVerifyingStatus}
                className="w-full py-3 px-4 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-xs transition-all shadow-md shadow-[#964407]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isVerifyingStatus ? "animate-spin" : ""}`} />
                <span>{isVerifyingStatus ? "Checking Verification..." : "I Have Verified My Email"}</span>
              </button>

              <button
                type="button"
                onClick={handleResendVerification}
                className="w-full py-2.5 px-4 rounded-xl border border-[#d7c2b9] hover:border-[#964407] bg-white hover:bg-[#fff8f6] text-[#201a17] font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Mail className="w-3.5 h-3.5 text-[#964407]" />
                <span>Resend Verification Email</span>
              </button>

              <button
                type="button"
                onClick={handleLogoutAndReset}
                className="w-full py-2 px-4 text-[11px] font-semibold text-[#554339] hover:text-red-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer pt-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Use Different Email / Sign Out</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-[#554339]/60 font-medium">
              <Clock className="w-3 h-3 animate-spin" />
              <span>Auto-detecting verification status...</span>
            </div>
          </div>
        ) : (
          /* 📝 REGULAR SIGN-UP FORM VIEW */
          <>
            {/* Title Header */}
            <div className="text-center space-y-1">
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#201a17]">
                Create an account
              </h1>
              <p className="text-xs text-[#554339] font-medium">
                Start your 10-day free trial • No credit card required
              </p>
            </div>

            {/* Error Alert Banner */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* OAuth Social Buttons */}
            <div className="space-y-3">
              <span className="block text-[11px] font-semibold text-center text-[#554339] uppercase tracking-wider">
                Sign up with
              </span>

              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl border border-[#d7c2b9] hover:border-[#964407] bg-white hover:bg-[#fff8f6] text-[#201a17] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-3 shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.2.0 10.04.0 12s.47 3.8 1.29 5.42l3.99-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24.0 12 .0 7.35.0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl border border-[#d7c2b9] hover:border-[#964407] bg-white hover:bg-[#fff8f6] text-[#201a17] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-3 shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.13-1.9-14.38-6.08-3.37-2.76-7.23-7.46-11.59-14.1-6.19-9.52-11.11-20.25-14.76-32.19-3.65-11.95-5.48-23.23-5.48-33.86 0-15.11 3.73-27.75 11.19-37.93 7.46-10.17 16.89-15.34 28.3-15.51 4.79 0 10.15 1.25 16.08 3.75 5.93 2.5 10.05 3.79 12.36 3.87 1.85 0 6.1-1.33 12.74-4 6.64-2.67 12.21-3.89 16.71-3.66 12.36.78 22.09 5.34 29.17 13.68-10.96 6.64-16.32 15.8-16.08 27.48.24 9.1 3.79 16.66 10.65 22.68 6.87 6.03 15.13 9.4 24.8 10.12-2.18 6.6-4.9 13.06-8.16 19.38zM119.22 31.81c0-7.05 2.57-13.88 7.71-20.49 5.14-6.61 11.64-10.74 19.5-12.39.46 7.42-1.92 14.39-7.14 20.91-5.22 6.52-11.75 10.63-19.59 12.33-.14-.12-.29-.24-.48-.36z" />
                </svg>
                <span>Continue with Apple</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#d7c2b9] w-full" />
              <span className="bg-white px-3 text-[11px] text-[#554339] font-semibold uppercase tracking-wider shrink-0 relative z-10">
                Or continue with email
              </span>
            </div>

            {/* Email & Password Registration Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#201a17] block">Full Name *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#554339] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Darisi"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d7c2b9] focus:border-[#964407] focus:ring-2 focus:ring-[#964407]/20 outline-none text-xs text-[#201a17] placeholder:text-[#554339]/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#201a17] block">Work Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#554339] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d7c2b9] focus:border-[#964407] focus:ring-2 focus:ring-[#964407]/20 outline-none text-xs text-[#201a17] placeholder:text-[#554339]/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#201a17] block">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#554339] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-[#d7c2b9] focus:border-[#964407] focus:ring-2 focus:ring-[#964407]/20 outline-none text-xs text-[#201a17] placeholder:text-[#554339]/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#554339] hover:text-[#964407]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#201a17] block">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#554339] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d7c2b9] focus:border-[#964407] focus:ring-2 focus:ring-[#964407]/20 outline-none text-xs text-[#201a17] placeholder:text-[#554339]/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Terms Agreement Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-[#d7c2b9] text-[#964407] focus:ring-[#964407] cursor-pointer"
                />
                <label htmlFor="terms" className="text-[11px] text-[#554339] leading-relaxed cursor-pointer">
                  By continuing, you agree to TenoPilot&apos;s{" "}
                  <span className="font-semibold text-[#964407] underline underline-offset-2">Terms of Service</span> and{" "}
                  <span className="font-semibold text-[#964407] underline underline-offset-2">Privacy Policy</span>.
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-sm transition-all duration-200 shadow-md shadow-[#964407]/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending Verification Email...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Continue & Verify Email</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>

            {/* Footer Navigation Link */}
            <div className="text-center pt-2 border-t border-[#d7c2b9]/60">
              <p className="text-xs text-[#554339]">
                Already have an account?{" "}
                <Link href="/login" className="font-bold text-[#964407] hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </>
        )}

      </div>

      {/* Footer Branding */}
      <div className="mt-8 text-center text-[11px] text-[#554339] space-y-1">
        <p className="flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#964407]" /> Protected by 256-Bit SSL Enterprise Security
        </p>
        <p>© 2026 TenoPilot.com • All Rights Reserved.</p>
      </div>

      {/* PWA Install Banner */}
      <PWAInstallBanner />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fff8f6] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#964407] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignUpPageContent />
    </Suspense>
  );
}
