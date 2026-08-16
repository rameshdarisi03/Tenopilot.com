"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  Phone,
  Clock,
  RefreshCw,
  LogOut,
} from "lucide-react";
import {
  loginWithGoogle,
  registerWithEmailPassword,
  sendUserEmailVerification,
  logoutUser,
  getCleanAuthErrorMessage,
} from "@/lib/authService";
import { useAuth } from "@/providers/AuthProvider";
import { staffStore } from "@/lib/staffStore";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { CompactPwaInstallCard } from "@/components/pwa/CompactPwaInstallCard";

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityPin, setSecurityPin] = useState("123456");
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

  // Auto-polling Engine: Every 3.5s check if user clicked email verification link
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (user && !user.emailVerified && !isGoogleUser) {
      interval = setInterval(async () => {
        try {
          await user.reload();
          if (user.emailVerified) {
            router.push("/home");
          }
        } catch {
          // Silent polling
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
      setError("Passwords do not match.");
      return;
    }

    if (securityPin.length !== 6) {
      setError("Please set a 6-digit security PIN.");
      return;
    }

    setIsLoading(true);

    try {
      await registerWithEmailPassword(email, password, fullName);

      // Register master admin staff record
      staffStore.addGlobalStaff({
        id: `staff-master-${Date.now()}`,
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || "+91 98000 00000",
        role: "master_admin",
        assignedPropertyId: "sunshine-pg",
        assignedPropertyIds: ["*"],
        propertyName: "All Properties",
        status: "Active",
        joinedDate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        securityPin: securityPin || "123456",
      });

      // Save local device session
      localStorage.setItem(
        "tenopilot_saved_session",
        JSON.stringify({
          email: email.trim().toLowerCase(),
          name: fullName.trim(),
          role: "master_admin",
          propertyName: "All Properties",
        })
      );
      staffStore.setActiveRole("master_admin");

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
      staffStore.setActiveRole("master_admin");
      router.push("/home");
    } catch (err: any) {
      setError(getCleanAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendStatus(null);
    try {
      await sendUserEmailVerification();
      setResendStatus("Verification email sent! Check your inbox.");
    } catch (err: any) {
      setResendStatus(getCleanAuthErrorMessage(err));
    }
  };

  const handleCheckVerification = async () => {
    setIsVerifyingStatus(true);
    try {
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          router.push("/home");
        } else {
          setError("Email not verified yet. Please check your inbox or spam folder.");
        }
      }
    } catch {
      setError("Failed to check status. Try again.");
    } finally {
      setIsVerifyingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#140e0c] text-[#201a17] flex relative overflow-hidden font-sans">
      
      {/* 📱 MOBILE BACKGROUND (35% Opacity Leather Emblem Artwork + Backdrop Blur) */}
      <div className="lg:hidden absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src="/tenopilot-leather-emblem.jpg"
          alt="TenoPilot Leather Emblem"
          fill
          priority
          className="object-cover object-center opacity-35 scale-105 filter blur-xs"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#140e0c]/80 via-[#140e0c]/90 to-[#140e0c]" />
      </div>

      {/* 🖥️ DESKTOP LEFT COLUMN: Full Glory Edge-to-Edge 3D Leather Emblem Artwork */}
      <div className="hidden lg:block lg:w-1/2 relative min-h-screen bg-[#1c1513] overflow-hidden border-r border-[#3d2a22]">
        <Image
          src="/tenopilot-leather-emblem.jpg"
          alt="TenoPilot 3D Leather Emblem & Keys"
          fill
          priority
          className="object-cover object-center"
        />
      </div>

      {/* 🔑 RIGHT COLUMN: Ultra-Clean Magnific-Style Signup Card */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10 bg-white/95 lg:bg-white min-h-screen overflow-y-auto">
        <div className="w-full max-w-md space-y-5 my-auto">

          {/* Header Logo & Title */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex justify-center mb-1">
              <TenoPilotLogo size="md" />
            </div>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#201a17]">
              {isGatekeeperActive ? "Verify Your Email" : "Create Master Account"}
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              {isGatekeeperActive
                ? "Confirm your identity to unlock estate cloud features"
                : "Set up your property management operating system"}
            </p>
          </div>

          {/* Gatekeeper Email Verification Screen */}
          {isGatekeeperActive ? (
            <div className="p-6 bg-[#fff8f6] border border-[#d7c2b9] rounded-3xl space-y-4 text-xs animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#964407] flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Action Required: Verify Email</h4>
                  <p className="text-[11px] text-gray-500">{user?.email || email}</p>
                </div>
              </div>

              <p className="text-gray-600 leading-relaxed">
                We sent a secure verification link to your email. Click the link in your inbox to instantly activate your Master Admin account.
              </p>

              {resendStatus && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-medium text-[11px]">
                  {resendStatus}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleCheckVerification}
                  disabled={isVerifyingStatus}
                  className="w-full py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isVerifyingStatus ? "animate-spin" : ""}`} />
                  <span>I&apos;ve Verified My Email</span>
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="text-[11px] font-bold text-[#c2652a] hover:underline"
                  >
                    Resend Verification Link
                  </button>

                  <button
                    type="button"
                    onClick={() => logoutUser()}
                    className="text-[11px] font-bold text-gray-500 hover:text-rose-600 flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Signup Form */
            <div className="space-y-4 animate-in fade-in">
              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
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
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-gray-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
                  Or sign up with email
                </span>
                <div className="border-t border-gray-200 w-full" />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleEmailSignUp} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Darisi"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Work Email *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@property.com"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 chars"
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Confirm Password *</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-[11px]"
                    />
                  </div>
                </div>

                {/* 6-Digit Security PIN Setup */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Set 6-Digit App Security PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={securityPin}
                    onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full max-w-[180px] px-3.5 py-2 rounded-xl border border-gray-300 font-mono text-center font-bold tracking-widest bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Used for instant 2-second banking-grade unlocking on your device.
                  </p>
                </div>

                <label className="flex items-start gap-2 pt-1 text-[11px] text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 rounded text-[#c2652a]"
                  />
                  <span>
                    I agree to the <strong>Terms of Service</strong> & <strong>Privacy Policy</strong>.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50 mt-2"
                >
                  {isLoading ? "Creating Account..." : "Create Master Account"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Log in Link */}
              <div className="text-center pt-2">
                <span className="text-xs text-gray-500 font-medium">
                  Already have an account?{" "}
                  <Link href="/login" className="font-bold text-[#c2652a] hover:underline">
                    Log in
                  </Link>
                </span>
              </div>
            </div>
          )}

          {/* 📲 PWA SCAN TO INSTALL MOBILE & DESKTOP APP (COMPACT & THEMED) */}
          <div className="pt-2">
            <CompactPwaInstallCard />
          </div>

        </div>
      </div>

    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#140e0c]" />}>
      <SignUpPageContent />
    </Suspense>
  );
}
