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
  ShieldCheck,
  Key,
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
import { AuthPwaInstallSection } from "@/components/pwa/AuthPwaInstallSection";

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

  // Security Setup Modal State (Post-Signup / Email Verification)
  const [showSecuritySetupModal, setShowSecuritySetupModal] = useState(false);
  const [setupPhone, setSetupPhone] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);

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
            setShowSecuritySetupModal(true);
          }
        } catch {
          // Silent polling
        }
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, isGoogleUser]);

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

    setIsLoading(true);

    try {
      await registerWithEmailPassword(email, password, fullName);

      // Register initial master admin staff record
      staffStore.addGlobalStaff({
        id: `staff-master-${Date.now()}`,
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: "+91 98000 00000",
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
        securityPin: "123456",
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
      setShowSecuritySetupModal(true);
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
          setShowSecuritySetupModal(true);
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

  const handleSaveSecuritySetup = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);

    if (newPin.length !== 6) {
      setSetupError("Security PIN must be exactly 6 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      setSetupError("Security PIN entries do not match.");
      return;
    }

    const currentEmail = user?.email || email || "owner@tenopilot.com";
    const currentName = user?.displayName || fullName || "Property Owner";

    // Update global staff record PIN
    const all = staffStore.getAllGlobalStaff();
    const existing = all.find((s) => s.email.toLowerCase() === currentEmail.toLowerCase());
    if (existing) {
      staffStore.setSecurityPin(existing.id, newPin);
    } else {
      staffStore.addGlobalStaff({
        id: `staff-master-${Date.now()}`,
        name: currentName,
        email: currentEmail,
        phone: setupPhone || "+91 98000 00000",
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
        securityPin: newPin,
      });
    }

    localStorage.setItem(
      "tenopilot_saved_session",
      JSON.stringify({
        email: currentEmail,
        name: currentName,
        role: "master_admin",
        propertyName: "All Properties",
        securityPin: newPin,
      })
    );

    router.push("/home");
    if (typeof window !== "undefined") {
      window.location.href = "/home";
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#201a17] flex relative overflow-hidden font-sans">
      
      {/* 📱 MOBILE BACKGROUND (30% Opacity Leather Emblem Artwork + Backdrop Blur) */}
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

      {/* 🖥️ DESKTOP LEFT 40%: Capped Artwork Panel (Zero Emblem Clipping) */}
      <div className="hidden lg:block lg:w-[40%] xl:w-[38%] 2xl:max-w-[580px] shrink-0 relative min-h-screen bg-[#f7f4ee] overflow-hidden border-r border-[#e8dfd8]">
        <Image
          src="/tenopilot-leather-emblem.jpg"
          alt="TenoPilot 3D Leather Emblem Artwork"
          fill
          priority
          className="object-cover object-center"
        />
      </div>

      {/* 🔑 RIGHT 60%: Responsive White Portal (Expands on Widescreens) */}
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
              {isGatekeeperActive ? "Verify Your Email" : "Join TenoPilot.com"}
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
            /* Streamlined Initial Signup Form */
            <div className="space-y-4 animate-in fade-in">
              {/* Google Sign Up Button */}
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
                <span>Sign up with Google</span>
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
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white"
                    />
                  </div>
                </div>

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
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white"
                    />
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

                {/* Button: "Create Account" */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50 mt-2"
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Log in Link */}
              <div className="text-center pt-1">
                <span className="text-xs text-gray-500 font-medium">
                  Already have an account?{" "}
                  <Link href="/login" className="font-bold text-[#c2652a] hover:underline">
                    Log in
                  </Link>
                </span>
              </div>
            </div>
          )}

          {/* 📲 PWA SCAN TO INSTALL MOBILE & DESKTOP APP SECTION */}
          <AuthPwaInstallSection />

        </div>
      </div>

      {/* ✨ POST-SIGNUP / VERIFICATION MASTER SECURITY SETUP MODAL */}
      {showSecuritySetupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5 animate-in zoom-in-95 text-xs text-[#201a17]">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-11 h-11 rounded-2xl bg-orange-100 text-[#c2652a] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-gray-900">
                  Complete Master Security Setup
                </h3>
                <p className="text-[11px] text-gray-500 font-medium">
                  Set your 6-digit PIN for instant banking-grade unlocking
                </p>
              </div>
            </div>

            {setupError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{setupError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSecuritySetup} className="space-y-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Mobile Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={setupPhone}
                    onChange={(e) => setSetupPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Set 6-Digit PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono text-center font-bold tracking-widest text-base bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Confirm 6-Digit PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono text-center font-bold tracking-widest text-base bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 leading-relaxed font-medium">
                🔒 <strong>Fintech Security:</strong> This PIN enables 2-second daily unlock on your phone & desktop without re-entering passwords.
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#c2652a] hover:bg-[#a65420] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <span>Save Security PIN & Launch TenoPilot</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f4ee]" />}>
      <SignUpPageContent />
    </Suspense>
  );
}
