"use client";

import { use, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ShieldCheck,
  CheckCircle2,
  Camera,
  Upload,
  User,
  Phone,
  Home,
  CreditCard,
  Briefcase,
  Sparkles,
  Lock,
  ArrowRight,
  Car,
  Plus,
  Trash2,
  AlertCircle,
  Building2,
  Bed as BedIcon,
  Clock,
  Check,
  Zap,
} from "lucide-react";
import { propertyStore, FloorConfig } from "@/constants/propertyLayoutStore";
import { selfKycStore, SelfKycInvite, SelfKycSubmission } from "@/lib/selfKycStore";
import { propertySettingsStore } from "@/constants/propertySettings";
import { occupantStore } from "@/constants/mockOccupants";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";
import {
  sanitizePlainText,
  sanitizeDigitsOnly,
  sanitizeEmailAddress,
  sanitizeVehicleNumber,
  validateBase64Attachment,
} from "@/utils/security";
import { compressPaymentScreenshot } from "@/lib/imageCompression";

const formatBedLabel = (bedCode?: string): string => {
  if (!bedCode) return "";
  const trimmed = bedCode.trim();
  return /^bed\s+/i.test(trimmed) ? trimmed : `Bed ${trimmed}`;
};

export default function TenantSelfOnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams?.token || "";

  // 1. Invite State (for personalized invite links)
  const [invite, setInvite] = useState<SelfKycInvite | null>(null);
  const [invitePropertyId, setInvitePropertyId] = useState<string>("");
  const [loadingInvite, setLoadingInvite] = useState(true);

  // Resolved propertyId: from invite, or token (if slug), or fallback
  const propertyId =
    invitePropertyId ||
    (token && !token.startsWith("inv-") && token !== "undefined" ? token : "sunshine-pg");

  // Step state:
  // "INVITE_FORM"  -> Pre-filled form with held room/bed from direct owner link
  // "WALK_IN_FORM" -> Clean pre-joining onboarding form with bed selection
  // "SUCCESS"      -> Confirmation screen once submitted to reception desk
  const [step, setStep] = useState<"LOADING" | "INVITE_FORM" | "WALK_IN_FORM" | "SUCCESS">("LOADING");

  // Property Layout for bed selection (if walk-in QR or general link)
  const [structure, setStructure] = useState<FloorConfig[]>(() => propertyStore.getStructure(propertyId));

  // Selection state for walk-in check-in
  const [stayType, setStayType] = useState<"Tenant" | "Guest">("Tenant");
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>("");
  const [selectedBedCode, setSelectedBedCode] = useState<string>("");
  const [selectedBedTariff, setSelectedBedTariff] = useState<number>(0);

  // Form Fields
  const [candidateName, setCandidateName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [guestCheckoutDate, setGuestCheckoutDate] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [purposeOfVisit, setPurposeOfVisit] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [vehicleNumbers, setVehicleNumbers] = useState<string[]>([""]);

  // Document uploads
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [residentAgreedToTerms, setResidentAgreedToTerms] = useState(false);
  const [highlightResidentTerms, setHighlightResidentTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selfieInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // 1. Resolve token on mount
  useEffect(() => {
    async function resolveToken() {
      setLoadingInvite(true);
      try {
        let paramPropId = "";
        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          paramPropId = sp.get("p") || "";
        }
        const result = await selfKycStore.fetchInviteAsync(token, paramPropId);
        if (result?.invite) {
          const inv = result.invite;
          setInvite(inv);
          const resolvedPropId = result.propertyId || inv.propertyId || paramPropId || propertyId;
          setInvitePropertyId(resolvedPropId);
          setCandidateName(inv.candidateName || "");
          setPhone(inv.candidatePhone || "");
          setEmail(inv.candidateEmail || "");
          setSignatureName(inv.candidateName || "");
          setStayType(inv.stayType || "Tenant");
          setSelectedRoomNumber(inv.roomNumber || "");
          setSelectedBedCode(inv.bedCode || "");
          setSelectedBedTariff(inv.rentAmount || 0);
          setStep("INVITE_FORM");
        } else {
          // If no specific invite exists, open the pre-joining walk-in onboarding form directly.
          // Zero database search, zero 'resident not found' errors.
          setStep("WALK_IN_FORM");
        }
      } catch (e) {
        console.warn("Token resolution notice:", e);
        setStep("WALK_IN_FORM");
      } finally {
        setLoadingInvite(false);
      }
    }
    resolveToken();
  }, [token]);

  // Synchronize property layout for walk-in bed choices
  useEffect(() => {
    propertyStore.initFirebaseListener(propertyId);
    setStructure(propertyStore.getStructure(propertyId));
    const unsubscribe = propertyStore.subscribe(() => {
      setStructure(propertyStore.getStructure(propertyId));
    });
    return unsubscribe;
  }, [propertyId]);

  // Existing active residents (phone & email maps) to block duplicate mobile numbers and emails within the same property
  const [existingResidentMap, setExistingResidentMap] = useState<
    Map<string, { name: string; roomNumber: string; bedCode: string }>
  >(new Map());
  const [existingResidentEmailMap, setExistingResidentEmailMap] = useState<
    Map<string, { name: string; roomNumber: string; bedCode: string }>
  >(new Map());

  useEffect(() => {
    const targetProp = invitePropertyId || propertyId;
    if (!targetProp) return;

    const buildMaps = (occupantsList: any[]) => {
      const pMap = new Map<string, { name: string; roomNumber: string; bedCode: string }>();
      const eMap = new Map<string, { name: string; roomNumber: string; bedCode: string }>();
      occupantsList.forEach((occ) => {
        if (occ.lifecycleStatus !== "Past") {
          if (occ.phone) {
            const digits = String(occ.phone).replace(/\D/g, "").slice(-10);
            if (digits.length === 10) {
              pMap.set(digits, {
                name: occ.name || "Active Resident",
                roomNumber: occ.roomNumber || "",
                bedCode: occ.bedCode || "",
              });
            }
          }
          if (occ.email) {
            const cleanEm = String(occ.email).trim().toLowerCase();
            if (cleanEm.length > 3 && cleanEm.includes("@")) {
              eMap.set(cleanEm, {
                name: occ.name || "Active Resident",
                roomNumber: occ.roomNumber || "",
                bedCode: occ.bedCode || "",
              });
            }
          }
        }
      });
      return { pMap, eMap };
    };

    // 1. Instantly populate from occupantStore if cached
    try {
      const localOccs = occupantStore.getOccupants(targetProp);
      if (localOccs && localOccs.length > 0) {
        const { pMap, eMap } = buildMaps(localOccs);
        setExistingResidentMap(pMap);
        setExistingResidentEmailMap(eMap);
      }
    } catch {}

    // 2. Fetch from Cloud Firestore SSOT
    async function loadOccupants() {
      try {
        const snap = await getDocs(collection(db, "properties", targetProp, "occupants"));
        const fromFs: any[] = [];
        snap.docs.forEach((d) => fromFs.push(d.data()));
        if (fromFs.length > 0) {
          const { pMap, eMap } = buildMaps(fromFs);
          setExistingResidentMap(pMap);
          setExistingResidentEmailMap(eMap);
        }
      } catch (e) {
        console.warn("Notice checking existing occupants:", e);
      }
    }
    loadOccupants();
  }, [invitePropertyId, propertyId]);

  // Validation: Mobile and Emergency must not be identical
  const cleanCandidateMobile = useMemo(() => {
    return (invite?.candidatePhone || phone).replace(/\D/g, "").slice(-10);
  }, [invite?.candidatePhone, phone]);

  const cleanEmergencyDigits = useMemo(() => {
    return emergencyPhone.replace(/\D/g, "").slice(-10);
  }, [emergencyPhone]);

  const isEmergencySameAsMobile = useMemo(() => {
    return Boolean(
      cleanCandidateMobile &&
      cleanEmergencyDigits &&
      cleanCandidateMobile.length === 10 &&
      cleanEmergencyDigits.length === 10 &&
      cleanCandidateMobile === cleanEmergencyDigits
    );
  }, [cleanCandidateMobile, cleanEmergencyDigits]);

  // Validation: On public walk-in form, primary mobile must not already belong to an active resident
  const phoneConflict = useMemo(() => {
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) return null;
    return existingResidentMap.get(digits) || null;
  }, [phone, existingResidentMap]);

  // Validation: Email must not already belong to an active resident
  const emailConflict = useMemo(() => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) return null;
    return existingResidentEmailMap.get(cleanEmail) || null;
  }, [email, existingResidentEmailMap]);

  // Property Branding & Name
  const propertySettings = propertySettingsStore.getSettings(invitePropertyId || propertyId);
  const propertyName = propertySettings?.propertyName || "Ramesh Residencies";

  // Compute available beds across floors for walk-in candidates
  const availableBeds = useMemo(() => {
    const list: {
      roomNumber: string;
      bedCode: string;
      roomType: string;
      monthlyRent: number;
      dailyRate: number;
    }[] = [];

    structure.forEach((floor) => {
      floor.rooms.forEach((room) => {
        room.beds.forEach((bed) => {
          if (bed.status === "Available") {
            const monthlyRent = room.customRentAmount || 12000;
            const dailyRate = Math.round(monthlyRent / 30);
            const roomType =
              room.sharingType === 1
                ? "Single Private"
                : room.sharingType === 2
                ? "Double Sharing"
                : room.sharingType === 3
                ? "Triple Sharing"
                : `${room.sharingType}-Sharing`;
            list.push({
              roomNumber: room.roomNumber,
              bedCode: bed.bedCode,
              roomType,
              monthlyRent,
              dailyRate,
            });
          }
        });
      });
    });

    return list;
  }, [structure]);

  // Auto-select first available bed if none is selected yet in walk-in mode
  useEffect(() => {
    if (step === "WALK_IN_FORM" && !selectedRoomNumber && availableBeds.length > 0) {
      setSelectedRoomNumber(availableBeds[0].roomNumber);
      setSelectedBedCode(availableBeds[0].bedCode);
      setSelectedBedTariff(
        stayType === "Tenant" ? availableBeds[0].monthlyRent : availableBeds[0].dailyRate
      );
    }
  }, [step, selectedRoomNumber, availableBeds, stayType]);

  // Strictly validated, sanitized, and lightweight compressed file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("File size exceeds 15MB limit. Please upload a smaller image or compressed PDF.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Unsupported file format. Please upload JPG, PNG, WebP or PDF documents only.");
      return;
    }

    // PDF files: read directly as base64 with strict validation
    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const validation = validateBase64Attachment(result);
        if (!validation.valid) {
          alert(validation.error || "Invalid file content.");
          return;
        }
        setter(result);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Camera & Gallery Images: Automatically compress to max 1000px & 0.72 quality (~40-70KB)
    // Guarantees high visual crispness while preventing Firestore 1MB document overflow
    compressPaymentScreenshot(file, 1000, 0.72)
      .then(({ base64 }) => {
        const validation = validateBase64Attachment(base64);
        if (!validation.valid) {
          alert(validation.error || "Invalid image content.");
          return;
        }
        setter(base64);
      })
      .catch(() => {
        // Fallback to FileReader if client canvas is unavailable
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          const validation = validateBase64Attachment(result);
          if (!validation.valid) {
            alert(validation.error || "Invalid file content.");
            return;
          }
          setter(result);
        };
        reader.readAsDataURL(file);
      });
  };

  // =========================================================================
  // SUBMISSION 1: FROM PRE-RESERVED INVITE LINK
  // =========================================================================
  const handleSubmitInviteKYC = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!residentAgreedToTerms) {
      setHighlightResidentTerms(true);
      setErrorMessage("Please review and agree to the house rules and terms to continue.");
      return;
    }

    const cleanName = sanitizePlainText(candidateName, 100);
    if (!cleanName.trim()) {
      setErrorMessage("Please enter your full name as shown on your Aadhaar card.");
      return;
    }

    const cleanEmerPhone = sanitizeDigitsOnly(emergencyPhone, 10);
    if (cleanEmerPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit emergency contact phone number.");
      return;
    }

    const cleanCandPhone = (invite?.candidatePhone || phone).replace(/\D/g, "").slice(-10);
    if (cleanEmerPhone === cleanCandPhone) {
      setErrorMessage("Emergency contact phone number cannot be the same as your primary mobile number.");
      return;
    }

    if (emailConflict) {
      setErrorMessage(
        `This email address is already registered with an active resident in this property (${emailConflict.name} in Room ${emailConflict.roomNumber}).`
      );
      return;
    }

    if (!invite) return;

    setSubmitting(true);
    try {
      const cleanVehicles = vehicleNumbers
        .map((v) => sanitizeVehicleNumber(v))
        .filter(Boolean);
      const submissionId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const submission: SelfKycSubmission = {
        id: submissionId,
        propertyId: invitePropertyId || invite.propertyId || propertyId,
        inviteId: invite.id,
        submissionType: "INVITE",
        stayType: invite.stayType,
        roomNumber: invite.roomNumber,
        bedCode: invite.bedCode,
        rentAmount: invite.rentAmount,
        securityDeposit: invite.securityDeposit,
        guestDailyRate: invite.guestDailyRate,
        guestCheckoutDate: invite.stayType === "Guest" ? guestCheckoutDate : undefined,
        joiningDate: joiningDate || new Date().toISOString().split("T")[0],
        name: cleanName,
        phone: invite.candidatePhone || phone,
        countryCode: "+91",
        email: email.trim() ? sanitizeEmailAddress(email) : undefined,
        emergencyContact: {
          name: sanitizePlainText(emergencyName || "Emergency Contact", 100),
          phone: cleanEmerPhone,
        },
        workplace: workplace.trim() ? sanitizePlainText(workplace, 150) : undefined,
        purposeOfVisit: invite.stayType === "Guest" && purposeOfVisit.trim() ? sanitizePlainText(purposeOfVisit, 200) : undefined,
        vehicleNumbers: cleanVehicles.length > 0 ? cleanVehicles : undefined,
        photoUrl: selfiePhoto || undefined,
        aadhaarNumber: aadhaarNumber.trim() ? sanitizeDigitsOnly(aadhaarNumber, 16) : undefined,
        aadhaarFrontUrl: aadhaarFront || undefined,
        aadhaarBackUrl: aadhaarBack || undefined,
        agreedToHouseRules: true,
        status: "PENDING",
        submittedAt: new Date().toISOString(),
      };

      await selfKycStore.submitKyc(submission);
      setStep("SUCCESS");
      fireCelebrationConfetti();
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to submit verification. Please check your network and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // SUBMISSION 2: FROM GENERAL QR SCAN OR WALK-IN LINK (ZERO DB BLOCKING)
  // =========================================================================
  const handleSubmitWalkInKYC = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!residentAgreedToTerms) {
      setHighlightResidentTerms(true);
      setErrorMessage("Please review and agree to the house rules and terms to proceed.");
      return;
    }

    const cleanName = sanitizePlainText(candidateName, 100);
    if (!cleanName.trim()) {
      setErrorMessage("Please enter your full legal name as shown on your Aadhaar card.");
      return;
    }

    const cleanPhone = sanitizeDigitsOnly(phone, 10);
    if (cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile phone number.");
      return;
    }

    if (phoneConflict) {
      setErrorMessage(
        `This mobile number is already registered with an active resident in this property (${phoneConflict.name} in Room ${phoneConflict.roomNumber}).`
      );
      return;
    }

    if (emailConflict) {
      setErrorMessage(
        `This email address is already registered with an active resident in this property (${emailConflict.name} in Room ${emailConflict.roomNumber}).`
      );
      return;
    }

    const cleanEmergency = sanitizeDigitsOnly(emergencyPhone, 10);
    if (cleanEmergency.length < 10) {
      setErrorMessage("Please enter a valid 10-digit emergency contact phone number.");
      return;
    }

    if (cleanPhone === cleanEmergency) {
      setErrorMessage("Emergency contact phone number cannot be the same as your primary mobile number.");
      return;
    }

    if (stayType === "Guest" && !guestCheckoutDate) {
      setErrorMessage("Please select your expected checkout date.");
      return;
    }

    if (!selectedRoomNumber || !selectedBedCode) {
      setErrorMessage("Please select your room and bed accommodation.");
      return;
    }

    setSubmitting(true);
    try {
      const cleanVehicles = vehicleNumbers
        .map((v) => sanitizeVehicleNumber(v))
        .filter(Boolean);
      const submissionId = `sub-walkin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const rentAmount = selectedBedTariff || (stayType === "Tenant" ? 12000 : 500);
      const securityDeposit = stayType === "Tenant" ? rentAmount * 2 : undefined;
      const guestDailyRate = stayType === "Guest" ? rentAmount : undefined;

      const submission: SelfKycSubmission = {
        id: submissionId,
        propertyId,
        submissionType: "WALK_IN_QR",
        stayType,
        roomNumber: selectedRoomNumber,
        bedCode: selectedBedCode,
        rentAmount,
        securityDeposit,
        guestDailyRate,
        guestCheckoutDate: stayType === "Guest" ? guestCheckoutDate : undefined,
        joiningDate: joiningDate || new Date().toISOString().split("T")[0],
        name: cleanName,
        phone: cleanPhone,
        countryCode: "+91",
        email: email.trim() ? sanitizeEmailAddress(email) : undefined,
        emergencyContact: {
          name: sanitizePlainText(emergencyName || "Emergency Contact", 100),
          phone: cleanEmergency,
        },
        workplace: workplace.trim() ? sanitizePlainText(workplace, 150) : undefined,
        purposeOfVisit: stayType === "Guest" && purposeOfVisit.trim() ? sanitizePlainText(purposeOfVisit, 200) : undefined,
        vehicleNumbers: cleanVehicles.length > 0 ? cleanVehicles : undefined,
        photoUrl: selfiePhoto || undefined,
        aadhaarNumber: aadhaarNumber.trim() ? sanitizeDigitsOnly(aadhaarNumber, 16) : undefined,
        aadhaarFrontUrl: aadhaarFront || undefined,
        aadhaarBackUrl: aadhaarBack || undefined,
        agreedToHouseRules: true,
        status: "PENDING",
        submittedAt: new Date().toISOString(),
      };

      // Places bed on Hold and sends to Reception Desk
      await selfKycStore.submitKyc(submission);
      setStep("SUCCESS");
      fireCelebrationConfetti();
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to submit check-in request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-gray-900 font-sans flex flex-col justify-between p-4 sm:p-6">
      {/* Top Brand Header */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between pb-6 border-b border-gray-200">
        <TenoPilotLogo size="sm" />
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-2xs">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>256-Bit Encrypted Self-KYC</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl w-full mx-auto my-6 flex-1">
        {/* LOADING STATE */}
        {loadingInvite && (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm space-y-4">
            <div className="w-10 h-10 border-3 border-[#c2652a] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-gray-500">Loading your check-in portal...</p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 1: DIRECT OWNER INVITE ONBOARDING (BED ALREADY ON HOLD)             */}
        {/* ========================================================================= */}
        {!loadingInvite && step === "INVITE_FORM" && invite && (
          <form onSubmit={handleSubmitInviteKYC} className="space-y-6 animate-in fade-in">
            {/* Greeting & Property Banner */}
            <div className="bg-gradient-to-r from-orange-500 to-[#c2652a] text-white rounded-3xl p-6 sm:p-7 shadow-lg shadow-orange-500/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full text-white">
                  {invite.stayType === "Tenant" ? "🏠 Monthly Tenant Check-In" : "⚡ Daily Guest Check-In"}
                </span>
                <span className="text-[10px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Bed Held for You
                </span>
              </div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl">
                Welcome, {invite.candidateName}!
              </h1>
              <p className="text-xs text-white/90">
                You're completing digital onboarding for <span className="font-bold underline">{propertyName}</span>. Please verify your details and upload your ID proofs below.
              </p>
            </div>

            {/* Pre-Locked Stay Type, Room & Tariff Card (ZERO BANK DETAILS EXPOSED) */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <Home className="w-4 h-4 text-[#c2652a]" />
                  <span>Reserved Accommodation & Stay Type</span>
                </div>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> RESERVED & ON HOLD
                </span>
              </div>

              {/* Locked Stay Type Banner */}
              <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#c2652a] text-white flex items-center justify-center font-bold text-xs">
                    {invite.stayType === "Tenant" ? <Home className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-orange-950 block">Stay Plan</span>
                    <span className="font-serif font-bold text-sm text-gray-900 block">
                      {invite.stayType === "Tenant" ? "Monthly Tenant" : "Short-Term Daily Guest"}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-600 bg-white px-2.5 py-1 rounded-lg border border-gray-200 flex items-center gap-1 shadow-xs">
                  <Lock className="w-3 h-3 text-[#c2652a]" /> Locked by Management
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Assigned Room & Bed</span>
                  <span className="font-serif font-bold text-base sm:text-lg text-gray-900 block">
                    Room {invite.roomNumber} ({formatBedLabel(invite.bedCode)})
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 block mt-0.5">
                    Locked on Hold 🔒
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    {invite.stayType === "Tenant" ? "Monthly Tariff" : "Daily Rate"}
                  </span>
                  <span className="font-mono font-bold text-base sm:text-lg text-emerald-700 block">
                    ₹{(invite.rentAmount ?? 0).toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-gray-400 block">
                    {invite.stayType === "Tenant" ? "/ month" : "/ day"}
                  </span>
                </div>

                {invite.stayType === "Tenant" && (
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Security Deposit</span>
                    <span className="font-mono font-bold text-base sm:text-lg text-purple-700 block">
                      ₹{((invite.securityDeposit ?? (invite.rentAmount ?? 0) * 2)).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-gray-400 block">Refundable on exit</span>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Information Form */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#c2652a]" />
                <span>1. Personal & Contact Details</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateName}
                    onChange={(e) => {
                      setCandidateName(e.target.value);
                      if (!signatureName) setSignatureName(e.target.value);
                    }}
                    placeholder="As shown on Aadhaar card"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mobile Phone Number *</label>
                  <input
                    type="tel"
                    disabled
                    value={
                      invite.candidatePhone
                        ? invite.candidatePhone.startsWith("+")
                          ? invite.candidatePhone
                          : `+91 ${invite.candidatePhone}`
                        : ""
                    }
                    className="w-full px-3.5 py-2.5 bg-gray-100 rounded-xl border border-gray-200 font-mono font-bold text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="For rent receipts & invoices"
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-medium text-gray-900 focus:ring-2 transition-colors ${
                      emailConflict
                        ? "border-rose-500 bg-rose-50/40 text-rose-950 focus:border-rose-500 focus:ring-rose-200"
                        : "border-gray-300 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                    }`}
                  />
                  {emailConflict && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1.5 animate-in fade-in">
                      <span>⚠️</span> This email address is already registered with <strong>{emailConflict.name}</strong> in Room {emailConflict.roomNumber} ({formatBedLabel(emailConflict.bedCode)}).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Joining / Check-In Date *</label>
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                  />
                </div>

                {invite.stayType === "Guest" && (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Expected Checkout Date *</label>
                    <input
                      type="date"
                      required
                      value={guestCheckoutDate}
                      onChange={(e) => setGuestCheckoutDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Workplace / Company / College</label>
                  <input
                    type="text"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    placeholder="e.g. TCS / Infosys / Oxford College"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                  />
                </div>

                {/* Emergency Contact Number */}
                <div className="sm:col-span-2 p-3 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-2">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-700" />
                    <span>Emergency Contact Number *</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="10-digit phone number *"
                        className={`w-full px-3.5 py-2 rounded-xl border font-mono font-bold text-gray-900 text-xs focus:ring-1 focus:ring-[#c2652a] ${
                          isEmergencySameAsMobile ? "border-rose-500 bg-rose-50/40" : "border-gray-300 bg-white"
                        }`}
                      />
                      {isEmergencySameAsMobile && (
                        <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                          <span>⚠️</span> Emergency contact cannot be your own mobile number.
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        placeholder="Contact Name (optional)"
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 font-medium text-gray-900 text-xs focus:ring-1 focus:ring-[#c2652a] bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Multi-Vehicle Plate Numbers */}
                <div className="sm:col-span-2 space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-700 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-gray-500" />
                      <span>Resident Vehicle Plate Numbers</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setVehicleNumbers([...vehicleNumbers, ""])}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#c2652a] hover:text-[#a3521e] px-2.5 py-1 rounded-lg hover:bg-orange-50 border border-orange-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Vehicle</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {vehicleNumbers.map((veh, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="e.g. KA 03 HK 4772"
                            value={veh}
                            onChange={(e) => {
                              const updated = [...vehicleNumbers];
                              updated[idx] = e.target.value.toUpperCase();
                              setVehicleNumbers(updated);
                            }}
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 text-xs uppercase tracking-wider focus:ring-1 focus:ring-[#c2652a] bg-gray-50/50"
                          />
                          <Car className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                        {vehicleNumbers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setVehicleNumbers(vehicleNumbers.filter((_, i) => i !== idx))}
                            className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove vehicle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400 block">
                    Optional. Add bike, scooter, or car numbers for gate security and parking allocation.
                  </span>
                </div>
              </div>
            </div>

            {/* Document Verification & Selfie Upload */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>2. Identity Verification & Documents</span>
              </h2>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Aadhaar Number (Last 4 digits or Full)</label>
                  <input
                    type="text"
                    maxLength={14}
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    placeholder="XXXX-XXXX-4772"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                {/* Live Selfie Capture */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-purple-600" /> Live Resident Photo / Selfie
                    </span>
                    {selfiePhoto && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Photo Captured
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={selfieInputRef}
                    accept="image/*"
                    capture="user"
                    onChange={(e) => handleFileUpload(e, setSelfiePhoto)}
                    className="hidden"
                  />
                  {selfiePhoto ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={selfiePhoto}
                        alt="Selfie preview"
                        className="w-16 h-16 rounded-2xl object-cover border border-gray-300 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => selfieInputRef.current?.click()}
                        className="py-2 px-3 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer shadow-2xs"
                      >
                        Retake Photo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => selfieInputRef.current?.click()}
                      className="w-full py-3 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-98 transition-all"
                    >
                      <Camera className="w-4 h-4 text-[#c2652a]" />
                      <span>Take Live Selfie or Upload Photo</span>
                    </button>
                  )}
                </div>

                {/* Aadhaar Front & Back */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <span className="text-xs font-bold text-gray-800 block">Aadhaar Card Front Photo</span>
                    <input
                      type="file"
                      ref={frontInputRef}
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, setAadhaarFront)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => frontInputRef.current?.click()}
                      className="w-full py-2.5 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {aadhaarFront ? "✓ Front Uploaded" : "Upload Front Side"}
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <span className="text-xs font-bold text-gray-800 block">Aadhaar Card Back Photo</span>
                    <input
                      type="file"
                      ref={backInputRef}
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, setAadhaarBack)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => backInputRef.current?.click()}
                      className="w-full py-2.5 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {aadhaarBack ? "✓ Back Uploaded" : "Upload Back Side"}
                    </button>
                  </div>
                </div>

                {/* Digital Signature */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Electronic Signature (Type Your Full Legal Name) *</label>
                  <input
                    type="text"
                    required
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-serif font-bold text-gray-900 text-sm focus:ring-1 focus:ring-[#c2652a]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    By submitting, I confirm that all provided details and identity documents are authentic.
                  </p>
                </div>

                {/* Terms & House Rules Consent */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    highlightResidentTerms
                      ? "bg-rose-50/90 border-rose-300 ring-2 ring-rose-200 shadow-sm"
                      : residentAgreedToTerms
                      ? "bg-emerald-50/60 border-emerald-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-gray-600 leading-snug">
                    <input
                      type="checkbox"
                      checked={residentAgreedToTerms}
                      onChange={(e) => {
                        setResidentAgreedToTerms(e.target.checked);
                        if (e.target.checked) setHighlightResidentTerms(false);
                      }}
                      className={`mt-0.5 w-4 h-4 rounded cursor-pointer shrink-0 accent-emerald-600 ${
                        highlightResidentTerms
                          ? "border-rose-400 ring-2 ring-rose-300"
                          : "border-gray-300 text-emerald-600 focus:ring-emerald-600"
                      }`}
                    />
                    <span>
                      I confirm my residency details, agree to the house rules,{" "}
                      <Link href="/terms" target="_blank" className="font-bold text-[#c2652a] hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" target="_blank" className="font-bold text-[#c2652a] hover:underline">
                        Privacy Policy
                      </Link>
                      , and consent to receiving accommodation receipts and notices via Email and WhatsApp.
                    </span>
                  </label>
                  {highlightResidentTerms && (
                    <p className="text-[11px] font-bold text-rose-700 mt-2 pl-6 flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Please tick this box to complete resident verification</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || isEmergencySameAsMobile || Boolean(emailConflict)}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-base transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Reception Desk...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Submit Digital KYC for Approval</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* CASE 2: PRE-JOINING WALK-IN ONBOARDING FORM (ZERO DATABASE VERIFICATION)  */}
        {/* ========================================================================= */}
        {!loadingInvite && step === "WALK_IN_FORM" && (
          <form onSubmit={handleSubmitWalkInKYC} className="space-y-6 animate-in fade-in">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-orange-500 to-[#c2652a] text-white rounded-3xl p-6 sm:p-7 shadow-lg shadow-orange-500/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full text-white">
                  ⚡ Pre-Joining Digital Check-In
                </span>
                <span className="text-[10px] font-bold bg-emerald-400 text-emerald-950 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Public Registration
                </span>
              </div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl">
                Welcome to {propertyName}!
              </h1>
              <p className="text-xs text-white/90">
                Please complete your pre-joining check-in form. Once submitted, your registration will be sent directly to the reception desk for instant approval.
              </p>
            </div>

            {/* 1. Stay Type Selector */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Select Your Stay Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStayType("Tenant")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    stayType === "Tenant"
                      ? "border-[#c2652a] bg-orange-50/50 shadow-xs"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <Home className={`w-5 h-5 mb-1 ${stayType === "Tenant" ? "text-[#c2652a]" : "text-gray-400"}`} />
                  <span className="font-serif font-bold text-sm block text-gray-900">Monthly Tenant</span>
                  <span className="text-[10px] text-gray-500 block">Long term month-to-month stay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStayType("Guest")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    stayType === "Guest"
                      ? "border-purple-600 bg-purple-50/50 shadow-xs"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <Zap className={`w-5 h-5 mb-1 ${stayType === "Guest" ? "text-purple-600" : "text-gray-400"}`} />
                  <span className="font-serif font-bold text-sm block text-gray-900">Daily Guest</span>
                  <span className="text-[10px] text-gray-500 block">Short term daily billing</span>
                </button>
              </div>
            </div>

            {/* 2. Room & Bed Selection */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                <BedIcon className="w-4 h-4 text-[#c2652a]" />
                <span>Select Accommodation</span>
              </h2>

              {availableBeds.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Choose Available Room & Bed *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {availableBeds.map((slot) => {
                      const isSelected =
                        selectedRoomNumber === slot.roomNumber && selectedBedCode === slot.bedCode;
                      const tariff = stayType === "Tenant" ? slot.monthlyRent : slot.dailyRate;
                      return (
                        <div
                          key={`${slot.roomNumber}-${slot.bedCode}`}
                          onClick={() => {
                            setSelectedRoomNumber(slot.roomNumber);
                            setSelectedBedCode(slot.bedCode);
                            setSelectedBedTariff(tariff);
                          }}
                          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "border-[#c2652a] bg-orange-50/60 shadow-xs ring-1 ring-[#c2652a]"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <div>
                            <span className="font-serif font-bold text-xs text-gray-900 block">
                              Room {slot.roomNumber} ({formatBedLabel(slot.bedCode)})
                            </span>
                            <span className="text-[10px] text-gray-500 block">{slot.roomType}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Available
                            </span>
                            <span className="text-[9px] text-gray-400 block mt-0.5">
                              Vacant Bed
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Room Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 101"
                      value={selectedRoomNumber}
                      onChange={(e) => setSelectedRoomNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Bed Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. B1"
                      value={selectedBedCode}
                      onChange={(e) => setSelectedBedCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-gray-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Personal & Contact Details */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#c2652a]" />
                <span>Resident Contact Information</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateName}
                    onChange={(e) => {
                      setCandidateName(e.target.value);
                      if (!signatureName) setSignatureName(e.target.value);
                    }}
                    placeholder="As shown on Aadhaar card"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mobile Phone Number *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono font-bold text-xs">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className={`w-full pl-12 pr-3.5 py-2.5 rounded-xl border font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 ${
                        phoneConflict
                          ? "border-rose-500 bg-rose-50/40 text-rose-950 focus:border-rose-500"
                          : "border-gray-300 focus:border-[#c2652a]"
                      }`}
                    />
                  </div>
                  {phoneConflict && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1.5 animate-in fade-in">
                      <span>⚠️</span> This mobile number is already registered with <strong>{phoneConflict.name}</strong> in Room {phoneConflict.roomNumber} ({formatBedLabel(phoneConflict.bedCode)}).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="For rent receipts & invoices"
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-medium text-gray-900 focus:ring-2 transition-colors ${
                      emailConflict
                        ? "border-rose-500 bg-rose-50/40 text-rose-950 focus:border-rose-500 focus:ring-rose-200"
                        : "border-gray-300 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                    }`}
                  />
                  {emailConflict && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1.5 animate-in fade-in">
                      <span>⚠️</span> This email address is already registered with <strong>{emailConflict.name}</strong> in Room {emailConflict.roomNumber} ({formatBedLabel(emailConflict.bedCode)}).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Joining / Check-In Date *</label>
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                  />
                </div>

                {stayType === "Guest" && (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Expected Checkout Date *</label>
                    <input
                      type="date"
                      required
                      value={guestCheckoutDate}
                      onChange={(e) => setGuestCheckoutDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Workplace / Company / College</label>
                  <input
                    type="text"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    placeholder="e.g. TCS / Infosys / Oxford College"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                  />
                </div>

                {/* Emergency Contact */}
                <div className="sm:col-span-2 p-3 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-2">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-700" />
                    <span>Emergency Contact Number *</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="10-digit phone number *"
                        className={`w-full px-3.5 py-2 rounded-xl border font-mono font-bold text-gray-900 text-xs focus:ring-1 focus:ring-[#c2652a] ${
                          isEmergencySameAsMobile ? "border-rose-500 bg-rose-50/40" : "border-gray-300 bg-white"
                        }`}
                      />
                      {isEmergencySameAsMobile && (
                        <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                          <span>⚠️</span> Emergency contact cannot be your own mobile number.
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        placeholder="Contact Name (optional)"
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 font-medium text-gray-900 text-xs focus:ring-1 focus:ring-[#c2652a] bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Multi-Vehicle Plate Numbers */}
                <div className="sm:col-span-2 space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-700 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-gray-500" />
                      <span>Resident Vehicle Plate Numbers</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setVehicleNumbers([...vehicleNumbers, ""])}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#c2652a] hover:text-[#a3521e] px-2.5 py-1 rounded-lg hover:bg-orange-50 border border-orange-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Vehicle</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {vehicleNumbers.map((veh, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="e.g. KA 03 HK 4772"
                            value={veh}
                            onChange={(e) => {
                              const updated = [...vehicleNumbers];
                              updated[idx] = e.target.value.toUpperCase();
                              setVehicleNumbers(updated);
                            }}
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 text-xs uppercase tracking-wider focus:ring-1 focus:ring-[#c2652a] bg-gray-50/50"
                          />
                          <Car className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                        {vehicleNumbers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setVehicleNumbers(vehicleNumbers.filter((_, i) => i !== idx))}
                            className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove vehicle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400 block">
                    Optional. Add bike, scooter, or car registration numbers for gate security pass.
                  </span>
                </div>
              </div>
            </div>

            {/* 4. ID Proofs & Live Photo */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Identity Verification & Documents</span>
              </h2>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Aadhaar Number (Last 4 digits or Full)</label>
                  <input
                    type="text"
                    maxLength={14}
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    placeholder="XXXX-XXXX-4772"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                {/* Live Selfie Capture */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-purple-600" /> Live Resident Photo / Selfie
                    </span>
                    {selfiePhoto && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Photo Captured
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={selfieInputRef}
                    accept="image/*"
                    capture="user"
                    onChange={(e) => handleFileUpload(e, setSelfiePhoto)}
                    className="hidden"
                  />
                  {selfiePhoto ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={selfiePhoto}
                        alt="Selfie preview"
                        className="w-16 h-16 rounded-2xl object-cover border border-gray-300 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => selfieInputRef.current?.click()}
                        className="py-2 px-3 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer shadow-2xs"
                      >
                        Retake Photo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => selfieInputRef.current?.click()}
                      className="w-full py-3 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-98 transition-all"
                    >
                      <Camera className="w-4 h-4 text-[#c2652a]" />
                      <span>Take Live Selfie or Upload Photo</span>
                    </button>
                  )}
                </div>

                {/* Aadhaar Front & Back */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <span className="text-xs font-bold text-gray-800 block">Aadhaar Card Front Photo</span>
                    <input
                      type="file"
                      ref={frontInputRef}
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, setAadhaarFront)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => frontInputRef.current?.click()}
                      className="w-full py-2.5 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {aadhaarFront ? "✓ Front Uploaded" : "Upload Front Side"}
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <span className="text-xs font-bold text-gray-800 block">Aadhaar Card Back Photo</span>
                    <input
                      type="file"
                      ref={backInputRef}
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, setAadhaarBack)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => backInputRef.current?.click()}
                      className="w-full py-2.5 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {aadhaarBack ? "✓ Back Uploaded" : "Upload Back Side"}
                    </button>
                  </div>
                </div>

                {/* Signature */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Electronic Signature (Type Your Full Legal Name) *</label>
                  <input
                    type="text"
                    required
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-serif font-bold text-gray-900 text-sm focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                {/* Consent Checkbox */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    highlightResidentTerms
                      ? "bg-rose-50/90 border-rose-300 ring-2 ring-rose-200 shadow-sm"
                      : residentAgreedToTerms
                      ? "bg-emerald-50/60 border-emerald-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-gray-600 leading-snug">
                    <input
                      type="checkbox"
                      checked={residentAgreedToTerms}
                      onChange={(e) => {
                        setResidentAgreedToTerms(e.target.checked);
                        if (e.target.checked) setHighlightResidentTerms(false);
                      }}
                      className={`mt-0.5 w-4 h-4 rounded cursor-pointer shrink-0 accent-emerald-600 ${
                        highlightResidentTerms
                          ? "border-rose-400 ring-2 ring-rose-300"
                          : "border-gray-300 text-emerald-600 focus:ring-emerald-600"
                      }`}
                    />
                    <span>
                      I confirm my residency details, agree to the house rules,{" "}
                      <Link href="/terms" target="_blank" className="font-bold text-[#c2652a] hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" target="_blank" className="font-bold text-[#c2652a] hover:underline">
                        Privacy Policy
                      </Link>
                      , and consent to receiving accommodation receipts and notices via Email and WhatsApp.
                    </span>
                  </label>
                  {highlightResidentTerms && (
                    <p className="text-[11px] font-bold text-rose-700 mt-2 pl-6 flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Please tick this box to complete registration</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || isEmergencySameAsMobile || Boolean(phoneConflict || emailConflict)}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-base transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Reception Desk...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Submit Pre-Joining Registration for Approval</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* CASE 3: SUCCESS STATE                                                     */}
        {/* ========================================================================= */}
        {step === "SUCCESS" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-10 shadow-sm text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-11 h-11" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Check-In Submitted Successfully
              </span>
              <h2 className="font-serif font-bold text-2xl sm:text-3xl text-gray-900">
                Registration in Review!
              </h2>
              <p className="text-xs text-gray-600 max-w-md mx-auto">
                Thank you, <span className="font-bold text-gray-900">{candidateName}</span>! Your pre-joining KYC details and documents have been submitted to the reception desk of <span className="font-bold">{propertyName}</span>.
              </p>
            </div>

            <div className="p-5 bg-gradient-to-br from-orange-50/60 to-amber-50/60 rounded-3xl border border-orange-100 text-left text-xs space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-orange-200/60">
                <span className="font-bold text-gray-800">Accommodation Status:</span>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-full border border-rose-300">
                  BED ON HOLD 🔒
                </span>
              </div>
              <p className="text-gray-700 flex items-center justify-between">
                <span>🏢 Room & Bed:</span>
                <span className="font-bold text-gray-900">
                  Room {selectedRoomNumber || invite?.roomNumber} ({formatBedLabel(selectedBedCode || invite?.bedCode)})
                </span>
              </p>
              <p className="text-gray-700 flex items-center justify-between">
                <span>💰 Tariff:</span>
                {invite ? (
                  <span className="font-mono font-bold text-emerald-700">
                    ₹{(invite.rentAmount ?? 0).toLocaleString("en-IN")}{" "}
                    {stayType === "Tenant" ? "/ month" : "/ day"}
                  </span>
                ) : (
                  <span className="font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                    Confirmed by Reception upon Approval
                  </span>
                )}
              </p>
              <p className="text-gray-700 flex items-center justify-between">
                <span>📅 Check-in Date:</span>
                <span className="font-mono font-bold text-gray-900">
                  {joiningDate}
                </span>
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600 text-left space-y-1">
              <p className="font-bold text-gray-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#c2652a]" /> What happens next?
              </p>
              <p className="text-[11px] text-gray-500">
                The property manager will review your Aadhaar details and photo. Once approved, your bed will be active and you will receive your official check-in confirmation and rent receipt on WhatsApp.
              </p>
            </div>

            <p className="text-[11px] text-gray-400">
              You can now safely close this browser window. Welcome to TenoPilot!
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-gray-400 py-2">
        Powered by TenoPilot Intelligent Property Operating System
      </footer>
    </div>
  );
}
