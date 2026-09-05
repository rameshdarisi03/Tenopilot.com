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
import { doc, setDoc, getDoc } from "firebase/firestore";
import { provisionNewPropertyWorkspace } from "@/lib/accountInitializer";
import { syncUserSecurityPinToCloud, sanitizeTitleCase } from "@/lib/authService";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";

function WelcomeOnboardingContent() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Personal & Identity
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
      if (user.displayName && user.displayName !== "Property Owner" && !fullName) {
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
      setError("Please set a 6-digit numeric PIN.");
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

      // 3. Mark user profile complete in Firestore with Hack-Proof 10-Day Clock
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
      const finalPlanExpiresAt = existingPlanExpiresAt || new Date(new Date(finalCreatedAt).getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

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
      }, 1400);
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
          <div className="inline-flex justify-center mb-1">
            <TenoPilotLogo size="md" variant="terracotta" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#201a17]">
              Welcome to TenoPilot
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Configure your master property workspace in 2 quick steps
            </p>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              step === 1
                ? "bg-[#964407] text-white shadow-xs"
                : "bg-[#fff8f6] text-[#554339] border border-[#d7c2b9]"
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 1 ? "bg-white/20 text-white" : "bg-[#d7c2b9] text-[#201a17]"
              }`}>
                1
              </span>
              <span>Owner Profile</span>
            </div>

            <div className="w-6 h-0.5 bg-[#d7c2b9]" />

            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              step === 2
                ? "bg-[#964407] text-white shadow-xs"
                : "bg-[#fff8f6] text-[#554339] border border-[#d7c2b9]"
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 2 ? "bg-white/20 text-white" : "bg-[#d7c2b9] text-[#201a17]"
              }`}>
                2
              </span>
              <span>Property Setup</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Splash */}
        {isSuccess ? (
          <div className="py-10 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#201a17]">
                Workspace Initialized Successfully!
              </h3>
              <p className="text-xs text-gray-500">
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
                  <label className="block font-bold text-gray-700 mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Darisi"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#c2652a] focus:border-transparent text-xs"
                    />
                  </div>
                </div>

                {/* Email Address (Pre-populated & Verified) */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled
                      value={email || user?.email || ""}
                      className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-gray-200 bg-[#fff8f6] text-gray-600 font-mono text-xs cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                      Verified
                    </span>
                  </div>
                </div>

                {/* WhatsApp Mobile Number */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">
                    WhatsApp Mobile Number *
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3 rounded-xl border border-gray-300 bg-[#fff8f6] text-[#201a17] font-mono text-xs font-bold shrink-0">
                      🇮🇳 +91
                    </div>
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="9876543210"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#c2652a] focus:border-transparent text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Used for sending instant tenant PDF receipts &amp; admin login security
                  </p>
                </div>

                {/* Set 6-Digit PIN */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block font-bold text-gray-700">
                      Set 6-Digit PIN *
                    </label>
                    <span className="text-[10px] text-[#964407] font-semibold flex items-center gap-1">
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
                        placeholder="Enter 6-digit PIN"
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-mono tracking-widest text-center focus:ring-2 focus:ring-[#c2652a] focus:border-transparent text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
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
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-mono tracking-widest text-center focus:ring-2 focus:ring-[#c2652a] focus:border-transparent text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
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
                  className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-[#c2652a] via-[#b85b20] to-[#964407] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-[#c2652a]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
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
                      placeholder="e.g. Meghana Luxury Executive PG"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#c2652a] focus:border-transparent text-xs"
                    />
                  </div>
                </div>

                {/* Property Category */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">
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
                            ? "bg-[#964407] text-white border-[#964407] shadow-xs"
                            : "bg-[#fff8f6] text-[#554339] border-[#d7c2b9] hover:bg-[#f8ede3]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City & Address */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">
                    City &amp; Area Location *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Madhapur, Hitec City, Hyderabad"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#c2652a] focus:border-transparent text-xs"
                    />
                  </div>
                </div>

                {/* Floors & Beds Baseline */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#964407]" />
                      Total Floors
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={floorsCount}
                      onChange={(e) => setFloorsCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-[#201a17] font-medium focus:ring-2 focus:ring-[#c2652a] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Bed className="w-3.5 h-3.5 text-[#964407]" />
                      Approx Total Beds
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={approxBeds}
                      onChange={(e) => setApproxBeds(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-[#201a17] font-medium focus:ring-2 focus:ring-[#c2652a] text-xs"
                    />
                  </div>
                </div>

                {/* FastTrack AI Migration Teaser */}
                <div className="p-3 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] text-[11px] text-[#6e391b] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Hotel className="w-4 h-4 text-[#c2652a] shrink-0" />
                    <span>Have handwritten registers or PDFs? Import 50+ tenants in 1-click inside dashboard with FastTrack AI!</span>
                  </div>
                </div>

                {/* Actions: Back & Complete */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                    className="py-3 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#c2652a] via-[#b85b20] to-[#964407] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-[#c2652a]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
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
    <Suspense fallback={<div className="min-h-screen bg-[#fff8f6] flex items-center justify-center text-xs font-bold text-gray-500">Initializing TenoPilot...</div>}>
      <WelcomeOnboardingContent />
    </Suspense>
  );
}
