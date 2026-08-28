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
import { initializeCleanProperty } from "@/lib/accountInitializer";

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

        // Register local session
        const propId = `prop-${invite.id}`;
        staffStore.addGlobalStaff({
          id: `owner-${Date.now()}`,
          name: invite.ownerName,
          email: invite.ownerEmail,
          phone: invite.ownerPhone,
          role: "master_admin",
          assignedPropertyId: propId,
          assignedPropertyIds: [propId],
          propertyName: invite.pgName,
          status: "Active",
          joinedDate: new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          securityPin: password.slice(0, 6),
        });

        const newPropertyRecord: PortfolioProperty = {
          id: propId,
          name: invite.pgName,
          location: `${invite.city || "Bengaluru"}, India`,
          bedsCount: 80,
          occupancyRate: "0.0%",
          collectionRate: "0%",
          status: "HEALTHY",
          createdAt: new Date().toISOString(),
          ownerEmail: invite.ownerEmail,
        };

        // Initialize clean property layout and add to isolated portfolio
        initializeCleanProperty(propId, invite.pgName, invite.ownerName);
        portfolioStore.addProperty(newPropertyRecord, invite.ownerEmail);

        localStorage.setItem(
          "tenopilot_saved_session",
          JSON.stringify({
            email: invite.ownerEmail,
            phone: invite.ownerPhone,
            name: invite.ownerName,
            role: "master_admin",
            propertyName: invite.pgName,
            propertyId: propId,
          })
        );
        staffStore.setActiveRole("master_admin");

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
            /* Gated Sign-Up Form */
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
                    <span>Activate My Property ➔</span>
                  </>
                )}
              </button>
            </form>
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
