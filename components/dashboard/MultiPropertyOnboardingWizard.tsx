"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Sparkles,
  Building2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
  MapPin,
  Phone,
  Mail,
  User,
  KeyRound,
  Navigation,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { propertyStore } from "@/constants/propertyLayoutStore";
import { propertySettingsStore, CLEAN_ZERO_PROPERTY_SETTINGS } from "@/constants/propertySettings";
import { portfolioStore, PortfolioProperty } from "@/constants/portfolioStore";
import { initializeCleanProperty } from "@/lib/accountInitializer";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";

interface MultiPropertyOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  user: any;
  existingProperties: PortfolioProperty[];
  onPropertyCreated?: (newProp: PortfolioProperty) => void;
}

export function MultiPropertyOnboardingWizard({
  isOpen,
  onClose,
  profile,
  user,
  existingProperties,
  onPropertyCreated,
}: MultiPropertyOnboardingWizardProps) {
  const router = useRouter();

  // Wizard Step State matching /welcome (1: Profile, 2: 6-Digit MPIN, 3: Property & Location)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Primary Property Reference for Inherited Settings
  const primaryProperty = existingProperties[0] || null;

  // Step 1: Organization & Identity (100% LOCKED & INHERITED)
  const orgId = profile?.organizationId || `org_${profile?.uid || "estate_01"}`;
  const ownerName = profile?.displayName || user?.displayName || "Property Owner";
  const ownerEmail = (profile?.email || user?.email || "").toLowerCase().trim();
  const rawOwnerPhone = profile?.phone || "";
  const ownerPhone = rawOwnerPhone.replace(/\D/g, "").slice(-10);

  // Step 3: Property & Location (EXACT FORM FROM /welcome STEP 3)
  const [propertyName, setPropertyName] = useState("");
  const [propertyCategory, setPropertyCategory] = useState("PG / Co-Living");
  const [cityLocation, setCityLocation] = useState(primaryProperty?.location || "Bengaluru, Karnataka");
  const [isLocating, setIsLocating] = useState(false);

  // Inherited Operational Rules from Property #1 (handled seamlessly in background)
  const [inheritedRules, setInheritedRules] = useState<any>({
    billingCycleDates: "1st to End of Month",
    desiredDueDate: 1,
    gracePeriodDays: 3,
    houseRulesAndRegulations: "",
    upiPaymentId: "",
  });

  // Submission & Progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisionProgress, setProvisionProgress] = useState(0);
  const [provisionStatusText, setProvisionStatusText] = useState("Preparing property workspace...");
  const [error, setError] = useState<string | null>(null);

  // Pre-load inherited rules from Primary Property
  useEffect(() => {
    if (primaryProperty?.id) {
      try {
        const primId = primaryProperty.id;
        const localSettings = propertySettingsStore.getSettings(primId);
        if (localSettings && localSettings.propertyName !== "Sunshine Luxury PG") {
          setInheritedRules({
            billingCycleDates: localSettings.billingCycleDates || "1st to End of Month",
            desiredDueDate: localSettings.desiredDueDate ?? 1,
            gracePeriodDays: localSettings.gracePeriodDays ?? 3,
            houseRulesAndRegulations: localSettings.houseRulesAndRegulations || "",
            upiPaymentId: localSettings.upiPaymentId || "",
            includeDepositInOutstanding: localSettings.includeDepositInOutstanding ?? false,
          });
        } else if (db) {
          getDoc(doc(db, `properties/${primId}/settings/config`)).then((cfgSnap) => {
            if (cfgSnap.exists()) {
              const data = cfgSnap.data();
              setInheritedRules({
                billingCycleDates: data.billingCycleDates || "1st to End of Month",
                desiredDueDate: data.desiredDueDate ?? 1,
                gracePeriodDays: data.gracePeriodDays ?? 3,
                houseRulesAndRegulations: data.houseRulesAndRegulations || "",
                upiPaymentId: data.upiPaymentId || "",
                includeDepositInOutstanding: data.includeDepositInOutstanding ?? false,
              });
            }
          });
        }
      } catch (e) {
        console.warn("Notice loading primary rules in wizard:", e);
      }
    }
  }, [primaryProperty?.id]);

  // 1-Tap Geolocation via Browser GPS & Reverse Geocoding (exact same as /welcome)
  const handleDetectLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser. Please type location manually.");
      return;
    }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const neighborhood = addr.suburb || addr.neighbourhood || addr.residential || "";
            const city = addr.city || addr.town || addr.state_district || "Bengaluru";
            const state = addr.state || "";
            const formatted = [neighborhood, city, state].filter(Boolean).join(", ");
            if (formatted) setCityLocation(formatted);
          }
        } catch {
          setError("Could not detect exact address. Please type it in.");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setError("Location access was denied. Please type your city manually.");
      },
      { timeout: 8000 }
    );
  };

  // Master Provisioning Handler (Creates workspace and opens dashboard)
  const handleFinalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!propertyName.trim()) {
      setError("Please enter the Property / Building Name.");
      return;
    }
    if (!cityLocation.trim()) {
      setError("Please enter the Property Location.");
      return;
    }

    setIsSubmitting(true);
    setProvisionProgress(25);
    setProvisionStatusText("Creating clean property workspace...");

    try {
      const slugId = propertyName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const cleanPropId = slugId ? `prop-${Date.now()}-${slugId}` : `prop-${Date.now()}`;
      const nowIso = new Date().toISOString();

      // 1. Initialize Clean Property Settings with inherited operational rules
      setProvisionProgress(45);
      setProvisionStatusText("Inheriting operational rules and billing cycle...");

      const customSettings = {
        ...CLEAN_ZERO_PROPERTY_SETTINGS,
        propertyName: propertyName.trim(),
        propertyAddress: cityLocation.trim(),
        managerPhone: ownerPhone ? `+91 ${ownerPhone}` : "",
        billingCycleDates: inheritedRules.billingCycleDates || "1st to End of Month",
        desiredDueDate: inheritedRules.desiredDueDate ?? 1,
        gracePeriodDays: inheritedRules.gracePeriodDays ?? 3,
        houseRulesAndRegulations: inheritedRules.houseRulesAndRegulations || "",
        upiPaymentId: inheritedRules.upiPaymentId || "",
        propertyCategory: propertyCategory,
      };

      await initializeCleanProperty(
        cleanPropId,
        propertyName.trim(),
        ownerName,
        cityLocation.trim(),
        ownerPhone ? `+91 ${ownerPhone}` : undefined,
        customSettings
      );

      // 2. Set clean layout structure (0 floors, ready for manual / FastTrack setup)
      await propertyStore.updateStructure([], cleanPropId);

      // 3. Atomically Register in portfolio_properties AND properties collections
      setProvisionProgress(65);
      setProvisionStatusText("Registering building in organization portfolio...");

      const newBuilding: PortfolioProperty = {
        id: cleanPropId,
        name: propertyName.trim(),
        location: cityLocation.trim(),
        bedsCount: 40,
        occupancyRate: "0.0%",
        collectionRate: "0%",
        status: "HEALTHY",
        createdAt: nowIso,
        ownerEmail: ownerEmail,
      };

      await portfolioStore.addProperty(newBuilding, ownerEmail);

      if (db) {
        const propDocData = {
          id: cleanPropId,
          name: propertyName.trim(),
          propertyName: propertyName.trim(),
          category: propertyCategory,
          city: cityLocation.trim(),
          location: cityLocation.trim(),
          approxBeds: 40,
          totalBeds: 40,
          bedsCount: 40,
          ownerEmail: ownerEmail,
          ownerUid: profile?.uid || user?.uid || "",
          ownerPhone: ownerPhone ? `+91 ${ownerPhone}` : "",
          organizationId: orgId,
          createdAt: nowIso,
          status: "Active",
        };

        // Write root properties document
        await setDoc(doc(db, "properties", cleanPropId), propDocData, { merge: true });
        // Write portfolio_properties document
        await setDoc(doc(db, "portfolio_properties", cleanPropId), propDocData, { merge: true });

        // ⏱️ 4. Dedicated Independent Calendar Subscription Cycle Stamping (Per Property)
        setProvisionProgress(80);
        setProvisionStatusText("Stamping dedicated property subscription calendar...");

        const cycleEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const cycleData = {
          propertyId: cleanPropId,
          propertyName: propertyName.trim(),
          organizationId: orgId,
          ownerEmail: ownerEmail,
          ownerUid: profile?.uid || user?.uid || "",
          plan: "PRO_MONTHLY",
          status: "ACTIVE",
          activationDate: nowIso,
          cycleStartDate: nowIso,
          cycleEndDate: cycleEnd,
          durationDays: 30,
          updatedAt: nowIso,
        };

        await setDoc(doc(db, `properties/${cleanPropId}/subscription_cycle/active`), cycleData, { merge: true });

        // If Property #1 missing its dedicated subscription_cycle doc, stamp it safely
        if (primaryProperty?.id && primaryProperty.id !== cleanPropId) {
          try {
            const p1CycleRef = doc(db, `properties/${primaryProperty.id}/subscription_cycle/active`);
            const p1Snap = await getDoc(p1CycleRef);
            if (!p1Snap.exists()) {
              await setDoc(
                p1CycleRef,
                {
                  propertyId: primaryProperty.id,
                  propertyName: primaryProperty.name,
                  organizationId: orgId,
                  ownerEmail: ownerEmail,
                  plan: "PRO_MONTHLY",
                  status: "ACTIVE",
                  activationDate: "2026-10-27T18:00:00.000Z",
                  cycleStartDate: "2026-10-27T18:00:00.000Z",
                  cycleEndDate: "2026-11-27T18:00:00.000Z",
                  durationDays: 30,
                  updatedAt: nowIso,
                },
                { merge: true }
              );
            }
          } catch (e) {
            console.warn("Notice stamping primary property cycle:", e);
          }
        }

        // 5. Update Owner's users collection propertyIds
        const activeUid = profile?.uid || user?.uid;
        if (activeUid) {
          const uRef = doc(db, "users", activeUid);
          const uSnap = await getDoc(uRef);
          if (uSnap.exists()) {
            const uData = uSnap.data();
            const existingPropIds = Array.isArray(uData.propertyIds)
              ? uData.propertyIds
              : uData.assignedPropertyId
              ? [uData.assignedPropertyId]
              : [];
            if (!existingPropIds.includes(cleanPropId)) {
              await setDoc(
                uRef,
                {
                  propertyIds: [...existingPropIds, cleanPropId],
                  organizationId: orgId,
                  updatedAt: nowIso,
                },
                { merge: true }
              );
            }
          }
        }

        // 6. Update Staff Accounts for Owner
        if (ownerEmail) {
          const sRef = doc(db, "staff_accounts", ownerEmail);
          const sSnap = await getDoc(sRef);
          if (sSnap.exists()) {
            const sData = sSnap.data();
            const existingAssigned = Array.isArray(sData.assignedPropertyIds) ? sData.assignedPropertyIds : [];
            if (!existingAssigned.includes(cleanPropId)) {
              await setDoc(
                sRef,
                {
                  assignedPropertyIds: [...existingAssigned, cleanPropId],
                  organizationId: orgId,
                  updatedAt: nowIso,
                },
                { merge: true }
              );
            }
          }
        }

        // 7. Initialize clean 0-credit wallets (No trial bonuses)
        await setDoc(
          doc(db, `properties/${cleanPropId}/whatsapp/wallet`),
          { credits: 0, transactions: [], updatedAt: nowIso },
          { merge: true }
        );
        await setDoc(
          doc(db, `properties/${cleanPropId}/email/wallet`),
          { credits: 0, transactions: [], updatedAt: nowIso },
          { merge: true }
        );
      }

      setProvisionProgress(100);
      setProvisionStatusText("Ready! Launching workspace...");
      fireCelebrationConfetti();

      onPropertyCreated?.(newBuilding);

      setTimeout(() => {
        onClose();
        router.push(`/p/${cleanPropId}/overview?tour=true`);
      }, 800);
    } catch (err: any) {
      console.error("Multi-property onboarding error:", err);
      setError(`Workspace setup failed: ${err.message || "Unknown error"}`);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-[#d7c2b9] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 text-xs text-[#201a17]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Reusing exact /welcome micro-step indicator */}
        <div className="p-5 sm:p-6 border-b border-[#f1e7dd] bg-[#fffaf6]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#964407]/10 text-[#964407] flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg sm:text-xl text-[#201a17]">
                  {step === 1 && "Verified Master Profile"}
                  {step === 2 && "6-Digit Banking MPIN"}
                  {step === 3 && `Onboard Building #${existingProperties.length + 1}`}
                </h3>
                <p className="text-[11px] text-[#8a7f74]">
                  {step === 1 && "Single Organization SSOT (Locked)"}
                  {step === 2 && "Universal security PIN for all buildings"}
                  {step === 3 && `Expanding under ${primaryProperty?.name || "Your Organization"}`}
                </p>
              </div>
            </div>

            {!isSubmitting && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Stepper matching /welcome */}
          <div className="flex items-center justify-between relative px-2">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-[#964407] -translate-y-1/2 z-0 transition-all duration-300"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />

            {[
              { num: 1, label: "Profile", sub: "🔒 Locked" },
              { num: 2, label: "MPIN", sub: "🔒 Single PIN" },
              { num: 3, label: "Property", sub: "New Building" },
            ].map((s) => (
              <div key={s.num} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    step === s.num
                      ? "bg-[#964407] text-white ring-4 ring-orange-100 shadow-xs"
                      : step > s.num
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-400 border border-gray-300"
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-[10px] mt-1 font-bold ${step === s.num ? "text-[#964407]" : "text-gray-400"}`}>
                  {s.label}
                </span>
                <span className="text-[8px] text-gray-400">{s.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Form Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <span className="font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: VERIFIED MASTER PROFILE (LOCKED & PRE-FILLED)                     */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-amber-900">
                    Single Login Architecture
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    All buildings operate under your verified master credentials. You and your staff log in once to manage all properties.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Full Name */}
                <div className="p-3 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                        Master Admin Name
                      </span>
                      <span className="font-bold text-xs text-[#201a17]">{ownerName}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Verified
                  </span>
                </div>

                {/* Mobile Number */}
                <div className="p-3 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                        WhatsApp Login Mobile
                      </span>
                      <span className="font-mono font-bold text-xs text-[#201a17]">+91 {ownerPhone || "9206651295"}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Verified
                  </span>
                </div>

                {/* Email */}
                <div className="p-3 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                        Google SSO Email
                      </span>
                      <span className="font-bold text-xs text-[#201a17] truncate block">{ownerEmail}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center gap-1 shrink-0">
                    <Lock className="w-2.5 h-2.5" /> Verified
                  </span>
                </div>

                {/* Organization ID */}
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-center text-[10px] font-mono text-gray-600">
                  Organization SSOT: <strong>{orgId}</strong>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: 6-DIGIT BANKING MPIN (LOCKED & PRE-CONFIGURED)                    */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in text-center py-2">
              <div className="w-12 h-12 rounded-full bg-[#f8ede3] text-[#964407] flex items-center justify-center mx-auto mb-1">
                <KeyRound className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-bold text-sm text-[#201a17]">
                  Master Security MPIN
                </h4>
                <p className="text-[11px] text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Your 6-digit access code securely unlocks all building ledgers. You use the exact same PIN to switch and operate this new property.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#fffaf6] border border-[#f1e7dd] max-w-xs mx-auto space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Inherited Banking Code
                </span>
                <div className="font-mono text-2xl tracking-[0.5em] text-[#964407] font-black">
                  ● ● ● ● ● ●
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                  <Lock className="w-2.5 h-2.5" /> Single Credential Active
                </div>
              </div>

              <p className="text-[10px] text-gray-400 italic">
                You can change or reset your MPIN anytime from Settings & Security.
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: PROPERTY & LOCATION (EXACT FORM FROM /welcome STEP 3)             */}
          {/* ========================================================================= */}
          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4 animate-in fade-in">
              {/* Property / Building Name */}
              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1.5">
                  Property / Building Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    placeholder="e.g. Nomad Coliving or Sunshine Residency 2"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-semibold focus:ring-2 focus:ring-[#964407] focus:border-transparent text-xs"
                  />
                </div>
              </div>

              {/* Property Category Cards (Exact matching /welcome) */}
              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1.5">
                  What type of property do you manage?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "PG / Co-Living", desc: "Shared living" },
                    { label: "Student Hostel", desc: "Campus hostel" },
                    { label: "Apartment", desc: "Flats & units" },
                    { label: "House Rental", desc: "Private rentals" },
                  ].map((cat) => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setPropertyCategory(cat.label)}
                      className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        propertyCategory === cat.label
                          ? "bg-[#964407] text-white border-[#964407] shadow-xs"
                          : "bg-[#fff8f6] text-[#554339] border-[#d7c2b9] hover:bg-[#f8ede3]"
                      }`}
                    >
                      <p className="font-bold text-[11px] leading-snug">{cat.label}</p>
                      <p
                        className={`text-[9px] mt-0.5 ${
                          propertyCategory === cat.label ? "text-white/80" : "text-gray-400"
                        }`}
                      >
                        {cat.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Location with 1-Tap Geolocation button (Exact matching /welcome) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-gray-700 text-xs">
                    Property Location *
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    className="text-[11px] font-bold text-[#c2652a] hover:text-[#964407] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Detecting GPS...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3 h-3 text-[#c2652a]" />
                        <span>Use My Current Location</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={cityLocation}
                    onChange={(e) => setCityLocation(e.target.value)}
                    placeholder="e.g. Madhapur, Hyderabad, Telangana"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-300 bg-white text-[#201a17] placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#964407] focus:border-transparent text-xs"
                  />
                </div>
              </div>

              {/* Auto-Inherited Rules Badge Note */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[10px] space-y-0.5">
                <span className="font-bold flex items-center gap-1 text-emerald-900">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Auto-Inherited Operational Baseline:</span>
                </span>
                <p className="text-emerald-800">
                  Billing Cycle ({inheritedRules.billingCycleDates || "1st to End of Month"}) and due dates are automatically linked. You can configure rooms and beds inside your dashboard anytime.
                </p>
              </div>

              {/* Provisioning Progress Bar */}
              {isSubmitting && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span>{provisionStatusText}</span>
                    <span>{provisionProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-amber-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-[#964407] transition-all duration-300"
                      style={{ width: `${provisionProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Wizard Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#f1e7dd] bg-[#fffaf6] flex items-center justify-between shrink-0">
          <div>
            {step > 1 && !isSubmitting && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isSubmitting && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl hover:bg-gray-100 text-gray-500 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            )}

            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#7a3706] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span>Continue to MPIN</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#7a3706] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span>Continue to Property Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={() => handleFinalSubmit()}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>{isSubmitting ? "Launching..." : "Complete & Launch Property"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
