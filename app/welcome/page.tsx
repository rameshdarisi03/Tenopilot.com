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
  Layers,
  Bed,
  Hotel,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { provisionNewPropertyWorkspace } from "@/lib/accountInitializer";
import { syncUserSecurityPinToCloud, sanitizeTitleCase } from "@/lib/authService";

function WelcomeOnboardingContent() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Personal & Identity
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState("Property Owner");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Step 2: Property Baseline
  const [propertyName, setPropertyName] = useState("");
  const [propertyCategory, setPropertyCategory] = useState("PG / Co-Living");
  const [city, setCity] = useState("Hyderabad, Telangana");
  const [floorsCount, setFloorsCount] = useState<number>(4);
  const [approxBeds, setApproxBeds] = useState<number>(50);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Pre-fill user details from AuthProvider / Firebase
  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      if (user.displayName && !fullName) {
        setFullName(sanitizeTitleCase(user.displayName));
      }
    }
  }, [user, fullName]);

  // If user already has properties and is fully onboarded, redirect back to /home
  useEffect(() => {
    if (!loading && profile && profile.assignedPropertyId && profile.email === "isharapandey01@gmail.com") {
      router.replace("/home");
    }
  }, [profile, loading, router]);

  // Validation for Step 1
  const handleNextToStep2 = () => {
    setError(null);
    const cleanName = fullName.trim();
    const cleanPhone = phone.replace(/\D/g, "");

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit WhatsApp mobile number.");
      return;
    }

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError("Please set a 6-digit numeric Banking Security PIN.");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match. Please re-enter your 6-digit PIN.");
      return;
    }

    setStep(2);
  };

  // Submission for Step 2
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPropName = propertyName.trim();
    if (!cleanPropName) {
      setError("Please enter your Property or PG Name.");
      return;
    }

    setIsSubmitting(true);

    try {
      const activeUser = auth.currentUser || user;
      const ownerEmail = (activeUser?.email || email).toLowerCase().trim();
      const ownerUid = activeUser?.uid || `user-${Date.now()}`;
      const orgId = `org_${ownerUid}`;
      const propertyId = `prop-${Date.now()}`;
      const cleanPhone = phone.replace(/\D/g, "");

      // 1. Synchronize Security PIN to Cloud
      await syncUserSecurityPinToCloud(ownerEmail, pin, ownerUid);

      // 2. Call Master Workspace Initializer (Existing SSOT)
      await provisionNewPropertyWorkspace({
        propertyId: propertyId,
        propertyName: cleanPropName,
        ownerName: fullName.trim(),
        ownerEmail: ownerEmail,
        ownerPhone: cleanPhone,
        city: city.trim(),
        approxBeds: Number(approxBeds) || 40,
        securityPin: pin,
      });

      // 3. Mark user profile complete in Firestore
      const userDocRef = doc(db, "users", ownerUid);
      await setDoc(
        userDocRef,
        {
          uid: ownerUid,
          email: ownerEmail,
          displayName: fullName.trim(),
          phone: cleanPhone,
          role: "master_admin",
          organizationId: orgId,
          assignedPropertyId: propertyId,
          onboardingCompleted: true,
          hasSetPin: true,
          securityPin: pin,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 4. Update local session state
      if (typeof window !== "undefined") {
        sessionStorage.setItem("tenopilot_session_unlocked", "true");
        localStorage.setItem(
          "tenopilot_saved_session",
          JSON.stringify({
            email: ownerEmail,
            name: fullName.trim(),
            role: "master_admin",
            propertyName: cleanPropName,
            assignedPropertyId: propertyId,
            hasSetPin: true,
            securityPin: pin,
          })
        );
      }

      setIsSuccess(true);

      setTimeout(() => {
        router.replace("/home");
      }, 1500);
    } catch (err: any) {
      console.error("Onboarding error:", err);
      setError(err?.message || "Failed to initialize workspace. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Background Ambient Cyber Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-xl bg-slate-900/80 border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        
        {/* Header with App Logo & Stepper */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
            <Image
              src="/tenopilot-app-icon.png"
              alt="TenoPilot Logo"
              width={40}
              height={40}
              className="rounded-xl"
              priority
            />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>Welcome to TenoPilot</span>
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Let&apos;s configure your master property workspace in 2 quick steps
            </p>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              step === 1
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs shadow-emerald-500/20"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}>
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">1</span>
              <span>Owner Identity</span>
            </div>

            <div className="w-6 h-0.5 bg-slate-800" />

            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              step === 2
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs shadow-emerald-500/20"
                : "bg-slate-800/60 text-slate-500 border border-slate-800"
            }`}>
              <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-400 flex items-center justify-center text-[10px] font-black">2</span>
              <span>Property Setup</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-950/50 border border-rose-800/60 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Splash */}
        {isSuccess ? (
          <div className="py-10 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">
                Workspace Initialized Successfully!
              </h3>
              <p className="text-xs text-slate-400">
                Opening &ldquo;{propertyName}&rdquo; dashboard in realtime...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* STEP 1: Personal & Identity */}
            {step === 1 && (
              <div className="space-y-4 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">
                    Owner / Manager Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Darisi"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/60 text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs"
                    />
                  </div>
                </div>

                {/* Email Address (Pre-populated & Verified) */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled
                      value={email || user?.email || ""}
                      className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-xs cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      Verified
                    </span>
                  </div>
                </div>

                {/* WhatsApp Mobile Number */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">
                    WhatsApp Mobile Number *
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3 rounded-xl border border-slate-700/80 bg-slate-800/80 text-slate-300 font-mono text-xs font-bold shrink-0">
                      🇮🇳 +91
                    </div>
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="9876543210"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/60 text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Used for sending instant tenant PDF receipts &amp; admin login security
                  </p>
                </div>

                {/* Role Designation */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">
                    Your Role in the Organization
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Property Owner", "Managing Partner", "General Manager"].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all text-center ${
                          selectedRole === role
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs shadow-emerald-500/20"
                            : "bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6-Digit Banking Security PIN Setup */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block font-bold text-slate-300">
                      Set 6-Digit Banking Security PIN *
                    </label>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Quick 1-Tap App Unlock
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Enter PIN */}
                    <div className="relative">
                      <input
                        type={showPin ? "text" : "password"}
                        maxLength={6}
                        required
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="Create 6-digit PIN"
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/60 text-white placeholder-slate-500 font-mono tracking-widest text-center focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Confirm PIN */}
                    <div className="relative">
                      <input
                        type={showConfirmPin ? "text" : "password"}
                        maxLength={6}
                        required
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="Confirm 6-digit PIN"
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/60 text-white placeholder-slate-500 font-mono tracking-widest text-center focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showConfirmPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Continue to Step 2 Button */}
                <button
                  type="button"
                  onClick={handleNextToStep2}
                  className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <span>Continue to Property Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: Property Setup & Room Baseline */}
            {step === 2 && (
              <form onSubmit={handleFinalSubmit} className="space-y-4 text-xs">
                {/* Property Name */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">
                    Property / Building Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={propertyName}
                      onChange={(e) => setPropertyName(e.target.value)}
                      placeholder="e.g. Meghana Luxury Executive PG"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/60 text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs"
                    />
                  </div>
                </div>

                {/* Property Category */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">
                    Property Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {["PG / Co-Living", "Student Hostel", "Apartment", "House Rental"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPropertyCategory(cat)}
                        className={`py-2 px-2 rounded-xl border text-[10px] font-bold transition-all text-center ${
                          propertyCategory === cat
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs shadow-emerald-500/20"
                            : "bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City & Address */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">
                    City &amp; Area Location *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Madhapur, Hitec City, Hyderabad"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/60 text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs"
                    />
                  </div>
                </div>

                {/* Floors & Beds Baseline */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      Total Floors
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={floorsCount}
                      onChange={(e) => setFloorsCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/60 text-white font-medium focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Bed className="w-3.5 h-3.5 text-slate-400" />
                      Approx Total Beds
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={approxBeds}
                      onChange={(e) => setApproxBeds(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/60 text-white font-medium focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                </div>

                {/* FastTrack AI Migration Teaser */}
                <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-300 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Hotel className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Have handwritten registers or PDFs? Import 50+ tenants in 1-click inside dashboard with FastTrack AI!</span>
                  </div>
                </div>

                {/* Actions: Back & Complete */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                    className="py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Launch Property Workspace ➔</span>
                      </>
                    )}
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
    <Suspense fallback={<div className="min-h-screen bg-[#07090e] flex items-center justify-center text-xs font-bold text-slate-500">Initializing TenoPilot...</div>}>
      <WelcomeOnboardingContent />
    </Suspense>
  );
}
