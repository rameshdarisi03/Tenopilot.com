"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Lock,
  User as UserIcon,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { loginWithGoogle, registerWithEmailPassword } from "@/lib/authService";

function SignUpPageContent() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const authResult = await loginWithGoogle();
      if (typeof window !== "undefined") {
        sessionStorage.setItem("tenopilot_session_unlocked", "true");
      }
      router.push("/welcome");
    } catch (err: any) {
      console.error("Google sign up failed:", err);
      setError(err?.message || "Google sign-up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerWithEmailPassword(cleanEmail, password, cleanName);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("tenopilot_session_unlocked", "true");
        localStorage.setItem(
          "tenopilot_saved_session",
          JSON.stringify({
            email: cleanEmail,
            name: cleanName,
            role: "master_admin",
            hasSetPin: false,
          })
        );
      }
      setSuccessNotice("Account created! Redirecting to setup your workspace...");
      setTimeout(() => {
        router.push("/welcome");
      }, 1000);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#201a17] flex relative overflow-hidden font-sans">
      {/* Mobile Background Artwork */}
      <div className="lg:hidden absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src="/tenopilot-leather-emblem.jpg"
          alt="TenoPilot Leather Emblem"
          fill
          priority
          className="object-cover object-center opacity-25 scale-105 filter blur-xs"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#f7f4ee]/90 via-[#f7f4ee]/95 to-[#f7f4ee]" />
      </div>

      {/* Desktop Left Artwork Panel */}
      <div className="hidden lg:block lg:w-[40%] xl:w-[38%] 2xl:max-w-[580px] shrink-0 relative min-h-screen bg-[#f7f4ee] overflow-hidden border-r border-[#e8dfd8]">
        <Image
          src="/tenopilot-leather-emblem.jpg"
          alt="TenoPilot 3D Leather Emblem Artwork"
          fill
          priority
          className="object-cover object-center"
        />
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10 bg-white min-h-screen overflow-y-auto">
        <div className="w-full max-w-md space-y-6 my-auto">
          {/* Header */}
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
            <div className="flex items-center justify-center gap-2">
              <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#201a17] tracking-tight">
                Tenopilot.com
              </h1>
              <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                14-DAY FREE TRIAL
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Start your PG & Hostel Operating System in 60 seconds
            </p>
          </div>

          {/* Value Prop Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              Zero-Risk 14-Day Free Pro Access
            </p>
            <p className="text-[11px] text-emerald-700/90 leading-relaxed">
              No credit card required. Full access to Automated Rent Reminders, FastTrack AI, and Dual-Ledger Financials.
            </p>
          </div>

          {successNotice ? (
            <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-300 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-base text-emerald-900">
                {successNotice}
              </h3>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. Google 1-Click Sign-Up Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span>{isLoading ? "Connecting Google..." : "Continue with Google"}</span>
              </button>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-gray-200 w-full" />
                <span className="bg-white px-3 text-[10px] uppercase font-bold tracking-widest text-gray-400">
                  Or Sign Up with Email
                </span>
              </div>

              {/* Express Sign-Up Form */}
              <form onSubmit={handleEmailSignUp} className="space-y-3.5 text-xs">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800 font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Darisi"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@property.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create secure password (min. 6 characters)"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 mt-1 rounded-xl bg-gradient-to-r from-[#c2652a] via-[#b85b20] to-[#964407] text-white font-bold text-xs shadow-md shadow-[#c2652a]/20 hover:opacity-95 transition-all cursor-pointer active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Start 14-Day Free Trial</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="pt-3 border-t border-gray-200 text-center space-y-2 text-xs">
            <p className="text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-[#c2652a] hover:underline">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f4ee] flex items-center justify-center text-xs font-bold text-gray-500">Loading...</div>}>
      <SignUpPageContent />
    </Suspense>
  );
}
