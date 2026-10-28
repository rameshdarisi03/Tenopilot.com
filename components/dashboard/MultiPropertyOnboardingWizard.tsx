"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Sparkles,
  Building2,
  Bed,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Layers,
  Lock,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  Clock,
  HelpCircle,
  KeyRound,
  FileText,
  DollarSign,
  ChevronRight,
  Check,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { propertyStore, FloorConfig, RoomConfig, BedSlotConfig } from "@/constants/propertyLayoutStore";
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

  // Wizard Step State (1: Org Locked, 2: Property Info, 3: Billing Rules, 4: Layout Matrix)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Primary Property Reference for Inherited Settings
  const primaryProperty = existingProperties[0] || null;

  // Step 1: Organization & Identity (100% LOCKED & INHERITED)
  const orgId = profile?.organizationId || `org_${profile?.uid || "estate_01"}`;
  const ownerName = profile?.displayName || user?.displayName || "Property Owner";
  const ownerEmail = (profile?.email || user?.email || "").toLowerCase().trim();
  const rawOwnerPhone = profile?.phone || "";
  const ownerPhone = rawOwnerPhone.replace(/\D/g, "").slice(-10);

  // Step 2: New Property Identity & Front Desk (ACTIVE / EDITABLE)
  const [propertyName, setPropertyName] = useState("");
  const [propertyCategory, setPropertyCategory] = useState("PG / Co-Living");
  const [cityLocation, setCityLocation] = useState(primaryProperty?.location || "Bengaluru, Karnataka");
  const [caretakerPhone, setCaretakerPhone] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  // Step 3: Operational Rules & Billing Mode (PRE-FILLED & EDITABLE)
  const [billingCycleDates, setBillingCycleDates] = useState("1st to End of Month");
  const [desiredDueDate, setDesiredDueDate] = useState(1);
  const [gracePeriodDays, setGracePeriodDays] = useState(3);
  const [houseRules, setHouseRules] = useState(
    "1. Gate closes at 10:30 PM.\n2. Visitors allowed in lounge only.\n3. Monthly rent due by 5th.\n4. Maintain quiet hours after 11 PM."
  );
  const [upiPaymentId, setUpiPaymentId] = useState("");
  const [includeDepositInOutstanding, setIncludeDepositInOutstanding] = useState(false);

  // Step 4: Layout Matrix & Bed Setup
  const [numFloors, setNumFloors] = useState<number>(3);
  const [includeGroundFloor, setIncludeGroundFloor] = useState<boolean>(true);
  const [roomsPerFloor, setRoomsPerFloor] = useState<number>(4);
  const [sampleRoomNumber, setSampleRoomNumber] = useState<string>("101");
  const [defaultSharing, setDefaultSharing] = useState<number>(2);
  const [approxBedsCount, setApproxBedsCount] = useState<number>(24);

  // Tariffs per sharing type
  const [singleTariff, setSingleTariff] = useState<number>(12000);
  const [doubleTariff, setDoubleTariff] = useState<number>(8500);
  const [tripleTariff, setTripleTariff] = useState<number>(7000);
  const [fourSharingTariff, setFourSharingTariff] = useState<number>(6000);

  // Submission & Provisioning Progress State
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionProgress, setProvisionProgress] = useState(0);
  const [provisionStatusText, setProvisionStatusText] = useState("Initializing workspace...");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pre-fill operational rules from Primary Property on open
  useEffect(() => {
    if (primaryProperty?.id) {
      try {
        const primId = primaryProperty.id;
        const localSettings = propertySettingsStore.getSettings(primId);
        if (localSettings && localSettings.propertyName !== "Sunshine Luxury PG") {
          setBillingCycleDates(localSettings.billingCycleDates || "1st to End of Month");
          setDesiredDueDate(localSettings.desiredDueDate ?? 1);
          setGracePeriodDays(localSettings.gracePeriodDays ?? 3);
          setHouseRules(localSettings.houseRulesAndRegulations || "");
          setUpiPaymentId(localSettings.upiPaymentId || "");
          setIncludeDepositInOutstanding(localSettings.includeDepositInOutstanding ?? false);
        } else if (db) {
          getDoc(doc(db, `properties/${primId}/settings/config`)).then((cfgSnap) => {
            if (cfgSnap.exists()) {
              const data = cfgSnap.data();
              setBillingCycleDates(data.billingCycleDates || "1st to End of Month");
              setDesiredDueDate(data.desiredDueDate ?? 1);
              setGracePeriodDays(data.gracePeriodDays ?? 3);
              setHouseRules(data.houseRulesAndRegulations || "");
              setUpiPaymentId(data.upiPaymentId || "");
              setIncludeDepositInOutstanding(data.includeDepositInOutstanding ?? false);
            }
          });
        }
      } catch (e) {
        console.warn("Notice pre-filling primary rules:", e);
      }
    }
  }, [primaryProperty?.id]);

  // Dynamic Structure Generator
  const generatedStructure: FloorConfig[] = useMemo(() => {
    const floors: FloorConfig[] = [];
    let floorCounter = 1;

    for (let fl = 0; fl < numFloors; fl++) {
      const isGround = includeGroundFloor && fl === 0;
      const floorName = isGround ? "Ground Floor" : `Floor ${floorCounter}`;
      const rooms: RoomConfig[] = [];

      for (let r = 0; r < roomsPerFloor; r++) {
        let rmNumber = "";
        const roomSeq = r + 1;
        const pad2 = roomSeq < 10 ? `0${roomSeq}` : `${roomSeq}`;

        if (isGround) {
          rmNumber = `G${pad2}`;
        } else {
          rmNumber = `${floorCounter}${pad2}`;
        }

        const beds: BedSlotConfig[] = [];
        for (let b = 0; b < defaultSharing; b++) {
          const bedLetter = String.fromCharCode(65 + b);
          beds.push({
            id: `bed_${rmNumber.toLowerCase()}_${bedLetter.toLowerCase()}_${b}`,
            bedCode: `Bed ${bedLetter}`,
            status: "Available",
          });
        }

        rooms.push({
          id: `room_${rmNumber.toLowerCase()}_${r}`,
          roomNumber: rmNumber,
          sharingType: defaultSharing,
          beds,
          specialFeatureTag: defaultSharing === 1 ? "Private Single" : `${defaultSharing}-Sharing Suite`,
        });
      }

      floors.push({
        id: `fl_${Date.now()}_${fl + 1}`,
        floorName: floorName.toUpperCase(),
        floorSubtitle: isGround ? "RECEPTION & RESIDENT SUITES" : "EXECUTIVE RESIDENT SUITES",
        totalBeds: rooms.reduce((acc, rm) => acc + rm.beds.length, 0),
        rooms,
      });

      if (!isGround) {
        floorCounter++;
      }
    }

    return floors;
  }, [numFloors, includeGroundFloor, roomsPerFloor, defaultSharing]);

  const totalCalculatedBeds = useMemo(() => {
    return generatedStructure.reduce((acc, f) => acc + f.totalBeds, 0);
  }, [generatedStructure]);

  // Keep approxBedsCount updated
  useEffect(() => {
    setApproxBedsCount(totalCalculatedBeds || 24);
  }, [totalCalculatedBeds]);

  // GPS Location detection helper
  const handleDetectLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setValidationError("Geolocation not supported by your browser. Please enter location manually.");
      return;
    }
    setIsLocating(true);
    setValidationError(null);
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
          setValidationError("Could not detect exact address. Please type it in.");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setValidationError("Location access was denied. Please type your city manually.");
      },
      { timeout: 8000 }
    );
  };

  // Step Navigation Validators
  const handleNextFromStep1 = () => {
    setValidationError(null);
    setCurrentStep(2);
  };

  const handleNextFromStep2 = () => {
    setValidationError(null);
    if (!propertyName.trim()) {
      setValidationError("Please enter the Building / Property Name.");
      return;
    }
    if (!cityLocation.trim()) {
      setValidationError("Please enter the Property Location & City.");
      return;
    }
    setCurrentStep(3);
  };

  const handleNextFromStep3 = () => {
    setValidationError(null);
    setCurrentStep(4);
  };

  // Final Master Provisioning Handler
  const handleFinalProvision = async () => {
    setValidationError(null);
    setIsProvisioning(true);
    setProvisionProgress(15);
    setProvisionStatusText("Creating clean cloud property workspace...");

    try {
      const slugId = propertyName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const cleanPropId = slugId ? `prop-${Date.now()}-${slugId}` : `prop-${Date.now()}`;
      const nowIso = new Date().toISOString();

      // Step A: Initialize Clean Property Settings with inherited/customized values
      setProvisionProgress(35);
      setProvisionStatusText("Configuring operational rules and billing cycle...");

      const customSettings = {
        ...CLEAN_ZERO_PROPERTY_SETTINGS,
        propertyName: propertyName.trim(),
        propertyAddress: cityLocation.trim(),
        managerPhone: caretakerPhone ? `+91 ${caretakerPhone}` : ownerPhone ? `+91 ${ownerPhone}` : "",
        billingCycleDates: billingCycleDates,
        desiredDueDate: desiredDueDate,
        gracePeriodDays: gracePeriodDays,
        houseRulesAndRegulations: houseRules,
        upiPaymentId: upiPaymentId,
        includeDepositInOutstanding: includeDepositInOutstanding,
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

      // Step B: Persist generated Floor, Room, and Bed Structure
      setProvisionProgress(55);
      setProvisionStatusText("Structuring floors, rooms, and bed matrix...");
      await propertyStore.updateStructure(generatedStructure, cleanPropId);

      // Step C: Atomically Register in portfolio_properties AND properties collections
      setProvisionProgress(70);
      setProvisionStatusText("Registering building in organization portfolio...");

      const newBuilding: PortfolioProperty = {
        id: cleanPropId,
        name: propertyName.trim(),
        location: cityLocation.trim(),
        bedsCount: approxBedsCount,
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
          approxBeds: approxBedsCount,
          totalBeds: approxBedsCount,
          bedsCount: approxBedsCount,
          ownerEmail: ownerEmail,
          ownerUid: profile?.uid || user?.uid || "",
          ownerPhone: ownerPhone ? `+91 ${ownerPhone}` : "",
          caretakerPhone: caretakerPhone ? `+91 ${caretakerPhone}` : "",
          organizationId: orgId,
          createdAt: nowIso,
          status: "Active",
        };

        // Write root properties document
        await setDoc(doc(db, "properties", cleanPropId), propDocData, { merge: true });
        // Write portfolio_properties document
        await setDoc(doc(db, "portfolio_properties", cleanPropId), propDocData, { merge: true });

        // ⏱️ Step D: Independent Calendar Subscription Cycle Stamping (Per Property)
        setProvisionProgress(85);
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

        // Step E: Update Owner's users collection propertyIds
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

        // Step F: Update Staff Accounts for Owner
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

        // Step G: Initialize clean 0-credit wallets (No trial bonuses)
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
      setProvisionStatusText("Ready! Launching your new property dashboard...");
      fireCelebrationConfetti();

      onPropertyCreated?.(newBuilding);

      setTimeout(() => {
        onClose();
        router.push(`/p/${cleanPropId}/overview?tour=true`);
      }, 900);
    } catch (err: any) {
      console.error("Multi-property onboarding error:", err);
      setValidationError(`Provisioning failed: ${err.message || "Unknown error"}`);
      setIsProvisioning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-[#d7c2b9] shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 text-xs text-[#201a17]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Wizard Header & Stepper */}
        <div className="p-5 sm:p-6 border-b border-[#f1e7dd] bg-[#fffaf6] shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#964407]/10 text-[#964407] flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg sm:text-xl text-[#201a17]">
                  Onboard Building #{existingProperties.length + 1}
                </h3>
                <p className="text-[11px] text-[#8a7f74]">
                  Expanding under <strong className="text-[#964407]">{primaryProperty?.name || "Your Organization"}</strong>
                </p>
              </div>
            </div>

            {!isProvisioning && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
            <div
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                currentStep === 1
                  ? "bg-[#964407] text-white border-[#964407] shadow-xs"
                  : currentStep > 1
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-gray-50 text-gray-400 border-gray-200"
              }`}
            >
              <span>1. Credentials</span>
              <span className="text-[8px] opacity-80">🔒 Locked</span>
            </div>

            <div
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                currentStep === 2
                  ? "bg-[#964407] text-white border-[#964407] shadow-xs"
                  : currentStep > 2
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-gray-50 text-gray-400 border-gray-200"
              }`}
            >
              <span>2. Identity</span>
              <span className="text-[8px] opacity-80">Property Info</span>
            </div>

            <div
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                currentStep === 3
                  ? "bg-[#964407] text-white border-[#964407] shadow-xs"
                  : currentStep > 3
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-gray-50 text-gray-400 border-gray-200"
              }`}
            >
              <span>3. Rules</span>
              <span className="text-[8px] opacity-80">Pre-filled</span>
            </div>

            <div
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                currentStep === 4
                  ? "bg-[#964407] text-white border-[#964407] shadow-xs"
                  : "bg-gray-50 text-gray-400 border-gray-200"
              }`}
            >
              <span>4. Layout</span>
              <span className="text-[8px] opacity-80">Floors & Beds</span>
            </div>
          </div>
        </div>

        {/* Wizard Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {validationError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <span className="font-bold">⚠️</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: ORGANIZATION CREDENTIALS & SINGLE LOGIN (LOCKED & PRE-FILLED)     */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-amber-900">
                    Single Organization Identity (SSOT)
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    All buildings run under your verified master credentials. You and your staff log in once at{" "}
                    <strong>tenopilot.com</strong> with single credentials to manage all properties.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Organization ID */}
                <div className="p-3.5 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9]/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Organization ID
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  </div>
                  <p className="font-mono font-bold text-xs text-[#201a17] truncate">{orgId}</p>
                </div>

                {/* Master Admin */}
                <div className="p-3.5 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9]/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Master Admin
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Verified
                    </span>
                  </div>
                  <p className="font-bold text-xs text-[#201a17] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>{ownerName}</span>
                  </p>
                </div>

                {/* Registered Phone */}
                <div className="p-3.5 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9]/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Registered Phone
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> WhatsApp Auth
                    </span>
                  </div>
                  <p className="font-mono font-bold text-xs text-[#201a17] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>+91 {ownerPhone || "9206651295"}</span>
                  </p>
                </div>

                {/* Registered Email */}
                <div className="p-3.5 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9]/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Primary Email
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Google SSO
                    </span>
                  </div>
                  <p className="font-bold text-xs text-[#201a17] flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{ownerEmail}</span>
                  </p>
                </div>
              </div>

              {/* Security MPIN Preview */}
              <div className="p-3.5 rounded-2xl bg-[#fffaf6] border border-[#f1e7dd] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#964407]" />
                  <div>
                    <span className="font-bold text-xs text-[#201a17]">6-Digit Security MPIN</span>
                    <p className="text-[10px] text-gray-500">
                      Inherited from master account. Same PIN unlocks front desk operations across all buildings.
                    </p>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-gray-100 font-mono tracking-widest text-gray-600 font-black">
                  ● ● ● ● ● ●
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PROPERTY IDENTITY & FRONT DESK (ACTIVE / EDITABLE)                */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#554339] mb-1.5">
                  Building / Property Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nomad Coliving or Ramesh Executive PG #2"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#d7c2b9] focus:outline-none focus:ring-2 focus:ring-[#964407] font-semibold text-xs bg-[#fff8f6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#554339] mb-1.5">
                    Property Category
                  </label>
                  <select
                    value={propertyCategory}
                    onChange={(e) => setPropertyCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#d7c2b9] focus:outline-none focus:ring-2 focus:ring-[#964407] font-medium text-xs bg-[#fff8f6]"
                  >
                    <option value="PG / Co-Living">PG / Co-Living</option>
                    <option value="Men's Executive PG">Men&apos;s Executive PG</option>
                    <option value="Women's Luxury PG">Women&apos;s Luxury PG</option>
                    <option value="Student Hostel">Student Hostel</option>
                    <option value="Serviced Apartments">Serviced Apartments</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#554339] mb-1.5">
                    Front Desk / Caretaker Phone (Optional)
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-2xl border border-r-0 border-[#d7c2b9] bg-gray-50 text-gray-500 font-bold text-xs">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={caretakerPhone}
                      onChange={(e) => setCaretakerPhone(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-3 py-3 rounded-r-2xl border border-[#d7c2b9] focus:outline-none focus:ring-2 focus:ring-[#964407] font-medium text-xs bg-[#fff8f6]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#554339]">
                    Location / Area & City *
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    className="text-[10px] font-bold text-[#964407] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{isLocating ? "Detecting GPS..." : "📍 Auto-Detect Location"}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Madhapur, Hyderabad, Telangana"
                  value={cityLocation}
                  onChange={(e) => setCityLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#d7c2b9] focus:outline-none focus:ring-2 focus:ring-[#964407] font-medium text-xs bg-[#fff8f6]"
                />
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-[10px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Adding this property automatically assigns a clean multi-tenant slug ID and distinct tenant registry.
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: OPERATIONAL RULES & BILLING MODE (PRE-FILLED & EDITABLE)          */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-bold text-[11px]">
                    Pre-filled from {primaryProperty?.name || "Ramesh Residencies"} (Editable)
                  </span>
                </div>
                <span className="text-[10px] text-emerald-800">Customize if needed</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Billing Cycle Mode */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Billing Cycle Mode
                  </label>
                  <select
                    value={billingCycleDates}
                    onChange={(e) => setBillingCycleDates(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#d7c2b9] font-medium text-xs bg-[#fff8f6]"
                  >
                    <option value="1st to End of Month">1st to End of Month</option>
                    <option value="10th to 9th">10th to 9th of next month</option>
                    <option value="15th to 14th">15th to 14th of next month</option>
                    <option value="Date of Joining">Dynamic Date of Joining</option>
                  </select>
                </div>

                {/* Monthly Rent Due Date */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Monthly Due Day
                  </label>
                  <select
                    value={desiredDueDate}
                    onChange={(e) => setDesiredDueDate(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#d7c2b9] font-medium text-xs bg-[#fff8f6]"
                  >
                    {[1, 2, 3, 5, 7, 10, 15].map((d) => (
                      <option key={d} value={d}>
                        {d}st/th of each month
                      </option>
                    ))}
                  </select>
                </div>

                {/* Overdue Grace Period */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Grace Period
                  </label>
                  <select
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#d7c2b9] font-medium text-xs bg-[#fff8f6]"
                  >
                    <option value={2}>2 Days</option>
                    <option value={3}>3 Days (Recommended)</option>
                    <option value={5}>5 Days</option>
                    <option value={7}>7 Days</option>
                  </select>
                </div>
              </div>

              {/* UPI ID */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Primary UPI ID for Rent Collection (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9206651295@ybl or property@okhdfcbank"
                  value={upiPaymentId}
                  onChange={(e) => setUpiPaymentId(e.target.value.trim())}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#d7c2b9] font-medium text-xs bg-[#fff8f6]"
                />
              </div>

              {/* House Rules */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  House Rules & Tenant Code of Conduct
                </label>
                <textarea
                  rows={3}
                  value={houseRules}
                  onChange={(e) => setHouseRules(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#d7c2b9] font-medium text-xs bg-[#fff8f6] leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: LAYOUT MATRIX & BED SETUP                                         */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Total Floors
                  </label>
                  <select
                    value={numFloors}
                    onChange={(e) => setNumFloors(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#d7c2b9] font-bold text-xs bg-[#fff8f6]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((f) => (
                      <option key={f} value={f}>
                        {f} Floor{f > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Rooms / Floor
                  </label>
                  <select
                    value={roomsPerFloor}
                    onChange={(e) => setRoomsPerFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#d7c2b9] font-bold text-xs bg-[#fff8f6]"
                  >
                    {[2, 3, 4, 5, 6, 8, 10, 12].map((r) => (
                      <option key={r} value={r}>
                        {r} Rooms
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Default Sharing
                  </label>
                  <select
                    value={defaultSharing}
                    onChange={(e) => setDefaultSharing(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#d7c2b9] font-bold text-xs bg-[#fff8f6]"
                  >
                    <option value={1}>1-Sharing (Private)</option>
                    <option value={2}>2-Sharing (Double)</option>
                    <option value={3}>3-Sharing (Triple)</option>
                    <option value={4}>4-Sharing (Quad)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Ground Floor
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncludeGroundFloor(!includeGroundFloor)}
                    className={`w-full py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                      includeGroundFloor
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-gray-100 text-gray-600 border-gray-300"
                    }`}
                  >
                    {includeGroundFloor ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>{includeGroundFloor ? "Includes Ground" : "Floor 1 Only"}</span>
                  </button>
                </div>
              </div>

              {/* Layout Summary Card */}
              <div className="p-4 rounded-2xl bg-[#0f172a] text-white space-y-2 border border-white/10 shadow-md">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 border-b border-white/10 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Auto-Generated Structure Matrix</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                    {totalCalculatedBeds} Total Beds
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Floors</span>
                    <span className="font-bold text-white text-base">{numFloors}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Rooms</span>
                    <span className="font-bold text-white text-base">
                      {numFloors * roomsPerFloor}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Capacity</span>
                    <span className="font-bold text-emerald-400 text-base">{totalCalculatedBeds} Beds</span>
                  </div>
                </div>
              </div>

              {/* Tariffs / Sharing Rates */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Default Room Tariffs (₹ / month)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 block">1-Sharing</span>
                    <input
                      type="number"
                      value={singleTariff}
                      onChange={(e) => setSingleTariff(Number(e.target.value))}
                      className="w-full bg-transparent font-bold text-xs focus:outline-none"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 block">2-Sharing</span>
                    <input
                      type="number"
                      value={doubleTariff}
                      onChange={(e) => setDoubleTariff(Number(e.target.value))}
                      className="w-full bg-transparent font-bold text-xs focus:outline-none"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 block">3-Sharing</span>
                    <input
                      type="number"
                      value={tripleTariff}
                      onChange={(e) => setTripleTariff(Number(e.target.value))}
                      className="w-full bg-transparent font-bold text-xs focus:outline-none"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 block">4-Sharing</span>
                    <input
                      type="number"
                      value={fourSharingTariff}
                      onChange={(e) => setFourSharingTariff(Number(e.target.value))}
                      className="w-full bg-transparent font-bold text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Provisioning In-Flight Progress Animation */}
          {isProvisioning && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3 animate-in fade-in">
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
        </div>

        {/* Wizard Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#f1e7dd] bg-[#fffaf6] flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 && !isProvisioning && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isProvisioning && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl hover:bg-gray-100 text-gray-500 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            )}

            {currentStep === 1 && (
              <button
                type="button"
                onClick={handleNextFromStep1}
                className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#7a3706] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span>Continue to Property Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleNextFromStep2}
                className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#7a3706] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span>Continue to Operational Rules</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                onClick={handleNextFromStep3}
                className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#7a3706] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span>Continue to Layout Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 4 && (
              <button
                type="button"
                onClick={handleFinalProvision}
                disabled={isProvisioning}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>{isProvisioning ? "Building Workspace..." : "Complete & Launch Property"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
