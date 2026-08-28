"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Lock,
  User as UserIcon,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Ticket,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { founderStore } from "@/constants/founderStore";
import { staffStore } from "@/lib/staffStore";
import { portfolioStore, PortfolioProperty } from "@/constants/portfolioStore";
import { provisionNewPropertyWorkspace } from "@/lib/accountInitializer";
import { loginWithGoogle } from "@/lib/authService";

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [codePart1, setCodePart1] = useState("");
  const [codePart2, setCodePart2] = useState("");
  const part1Ref = useRef<HTMLInputElement>(null);
  const part2Ref = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activatedSuccess, setActivatedSuccess] = useState<any | null>(null);

  // Auto-populate from URL query ?code=XXXX-XXXX or ?code=XXXXXXXX
  useEffect(() => {
    const urlCode = searchParams?.get("code");
    if (urlCode) {
      const clean = urlCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (clean.length >= 8) {
        setCodePart1(clean.slice(0, 4));
        setCodePart2(clean.slice(4, 8));
      } else if (clean.length > 4) {
        setCodePart1(clean.slice(0, 4));
        setCodePart2(clean.slice(4));
      } else {
        setCodePart1(clean);
      }
    }
  }, [searchParams]);

  const handlePart1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (raw.length > 4) {
      // User pasted full code (e.g. 8K4N9X2M or 8K4N-9X2M)
      setCodePart1(raw.slice(0, 4));
      setCodePart2(raw.slice(4, 8));
      part2Ref.current?.focus();
    } else {
      setCodePart1(raw);
      if (raw.length === 4) {
        part2Ref.current?.focus();
      }
    }
  };

  const handlePart2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setCodePart2(raw.slice(0, 4));
  };

  const handlePart2KeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && codePart2 === "") {
      part1Ref.current?.focus();
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const authResult = await loginWithGoogle();
      const googleUser = authResult?.user;
      const googleProfile = authResult?.profile;
      const userEmail = googleUser?.email || googleProfile?.email;
      const userName = googleUser?.displayName || googleProfile?.displayName || "Property Owner";

      if (userEmail) {
        setIdentifier(userEmail);
        const hasManualCode = codePart1.length === 4 && codePart2.length === 4;
        const codeToRedeem = hasManualCode ? `${codePart1}-${codePart2}`.toUpperCase().trim() : "AUTO";

        founderStore.initFirebase();
        const res = await founderStore.redeemActivationCode(codeToRedeem, userEmail);

        if (res.success && res.invite) {
          const invite = res.invite;
          setActivatedSuccess(invite);

          const propId = `prop-${invite.id}`;
          await provisionNewPropertyWorkspace({
            propertyId: propId,
            propertyName: invite.pgName,
            ownerName: invite.ownerName || userName,
            ownerEmail: invite.ownerEmail || userEmail,
            ownerPhone: invite.ownerPhone || "",
            city: invite.city || "Bengaluru",
            approxBeds: invite.approxBeds || 80,
          });

          setTimeout(() => {
            router.push(`/p/${propId}/overview`);
            if (typeof window !== "undefined") {
              window.location.href = `/p/${propId}/overview`;
            }
          }, 1800);
          return;
        } else {
          // If no auto-pass was found, populate email and prompt for code
          setError(`Google account verified (${userEmail}). Please enter your Activation Code to link your PG.`);
          setTimeout(() => part1Ref.current?.focus(), 150);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Google sign-up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = identifier.trim();
    const cleanCode = `${codePart1}-${codePart2}`.toUpperCase().trim();

    if (!cleanId) {
      setError("Please enter your registered Mobile Number or Email Address.");
      return;
    }

    if (codePart1.length !== 4 || codePart2.length !== 4) {
      setError("Please enter your complete 8-character Activation Code.");
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
      founderStore.initFirebase();
      const res = await founderStore.redeemActivationCode(cleanCode, cleanId);

      if (res.success && res.invite) {
        const invite = res.invite;
        setActivatedSuccess(invite);

        const propId = `prop-${invite.id}`;
        await provisionNewPropertyWorkspace({
          propertyId: propId,
          propertyName: invite.pgName,
          ownerName: invite.ownerName,
          ownerEmail: invite.ownerEmail,
          ownerPhone: invite.ownerPhone,
          city: invite.city || "Bengaluru",
          approxBeds: invite.approxBeds || 80,
          securityPin: password.slice(0, 6),
        });

        setTimeout(() => {
          router.push(`/p/${propId}/overview`);
          if (typeof window !== "undefined") {
            window.location.href = `/p/${propId}/overview`;
          }
        }, 2000);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during activation.");
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
              <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#c2652a]/15 text-[#964407] border border-[#c2652a]/30">
                EXCLUSIVE ACCESS
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Property & Co-Living Operating System
            </p>
          </div>

          {/* Invitation-Only Security Notice */}
          <div className="p-3.5 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] text-xs text-[#6e391b] space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-[#964407]">
              <ShieldCheck className="w-4 h-4 text-[#c2652a] shrink-0" />
              Invitation-Only Platform
            </p>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              TenoPilot is restricted to verified PG and Hostel operators. An official Activation Code is required to create an account.
            </p>
          </div>

          {/* Success State */}
          {activatedSuccess ? (
            <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-300 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl animate-bounce">
                🎉
              </div>
              <h3 className="font-bold text-lg text-emerald-900">
                {activatedSuccess.pgName} Activated!
              </h3>
              <p className="text-xs text-emerald-700">
                Welcome {activatedSuccess.ownerName}! Initializing your property command dashboard...
              </p>
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
                <span>{isLoading ? "Verifying..." : "Sign Up with Google"}</span>
              </button>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-gray-200 w-full" />
                <span className="bg-white px-3 text-[10px] uppercase font-bold tracking-widest text-gray-400">
                  Or Sign Up with Code & Password
                </span>
              </div>

              {/* Gated Sign-Up Form */}
              <form onSubmit={handleActivationSubmit} className="space-y-4 text-xs">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800 font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 1. Mobile Number or Email */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Mobile Number or Email Address *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="9876543210 or owner@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white text-xs"
                    />
                  </div>
                </div>

              {/* 2. Activation Code (Dual-Box Split Input) */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Activation Code *
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Ticket className="w-4 h-4 text-[#c2652a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={part1Ref}
                      type="text"
                      maxLength={4}
                      required
                      value={codePart1}
                      onChange={handlePart1Change}
                      placeholder="8K4N"
                      className="w-full pl-9 pr-2 py-2.5 rounded-xl border border-gray-300 font-mono font-black text-center text-sm tracking-widest text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white uppercase shadow-2xs"
                    />
                  </div>

                  <span className="text-gray-400 font-black text-lg select-none shrink-0">—</span>

                  <div className="relative flex-1">
                    <input
                      ref={part2Ref}
                      type="text"
                      maxLength={4}
                      required
                      value={codePart2}
                      onChange={handlePart2Change}
                      onKeyDown={handlePart2KeyDown}
                      placeholder="9X2M"
                      className="w-full px-2 py-2.5 rounded-xl border border-gray-300 font-mono font-black text-center text-sm tracking-widest text-gray-900 focus:ring-2 focus:ring-[#c2652a] bg-white uppercase shadow-2xs"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 text-center">
                  Auto-advances to the second box on 4th character
                </p>
              </div>

              {/* 3. Password */}
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
                    placeholder="Create secure password"
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

              {/* 4. Confirm Password */}
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
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] text-white font-bold text-xs shadow-md shadow-[#ff3366]/20 hover:opacity-95 transition-all cursor-pointer active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Proceed with Sign Up ➔</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

          {/* Footer Navigation */}
          <div className="pt-3 border-t border-gray-200 text-center space-y-2 text-xs">
            <p className="text-gray-500">
              Already have an active account?{" "}
              <Link href="/login" className="font-bold text-[#c2652a] hover:underline">
                Log In
              </Link>
            </p>
            <p className="text-gray-500">
              Don&apos;t have an activation code?{" "}
              <a
                href="https://wa.me/919876543210?text=Hi%20TenoPilot%2C%20I%20am%20a%20PG%20owner%20and%20I%20would%20like%20to%20request%20an%20Activation%20Pass."
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Request Access Pass
              </a>
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
