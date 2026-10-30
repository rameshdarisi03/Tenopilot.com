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
  ArrowLeft,
  Car,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Building2,
  Bed as BedIcon,
  Clock,
  Check,
  Zap,
} from "lucide-react";
import { propertyStore, FloorConfig, RoomConfig, BedSlotConfig } from "@/constants/propertyLayoutStore";
import { selfKycStore, SelfKycSubmission } from "@/lib/selfKycStore";
import { propertySettingsStore } from "@/constants/propertySettings";
import { portfolioStore } from "@/constants/portfolioStore";
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";
import {
  sanitizePlainText,
  sanitizeDigitsOnly,
  sanitizeEmailAddress,
  sanitizeVehicleNumber,
  validateBase64Attachment,
  normalizePhoneNumber,
} from "@/utils/security";
import { compressPaymentScreenshot } from "@/lib/imageCompression";

const formatBedLabel = (bedCode?: string): string => {
  if (!bedCode) return "";
  const trimmed = bedCode.trim();
  return /^bed\s+/i.test(trimmed) ? trimmed : `Bed ${trimmed}`;
};

const formatDisplayDate = (isoDate: string | undefined): string => {
  if (!isoDate) return "";
  const clean = isoDate.split("T")[0];
  const parts = clean.split("-");
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monIdx = parseInt(m, 10) - 1;
  const monthName = months[monIdx] || m;
  return `${parseInt(d, 10)} ${monthName} ${y}`;
};

export default function WalkInSelfKycCheckinPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId =
    resolvedParams?.propertyId ||
    (typeof window !== "undefined" ? window.location.pathname.split("/")[2] : "") ||
    "";

  // Flow State: "STAY_TYPE" -> "BED_SELECT" -> "KYC_FORM" -> "SUCCESS"
  const [step, setStep] = useState<"STAY_TYPE" | "BED_SELECT" | "KYC_FORM" | "SUCCESS">("STAY_TYPE");

  // Property Layout
  const [structure, setStructure] = useState<FloorConfig[]>(() => propertyStore.getStructure(propertyId));

  // Selection state
  const [stayType, setStayType] = useState<"Tenant" | "Guest">("Tenant");
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>("");
  const [selectedBedCode, setSelectedBedCode] = useState<string>("");
  const [selectedBedTariff, setSelectedBedTariff] = useState<number>(0);

  // Form Fields
  const [fullName, setFullName] = useState("");
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
  const [residentAgreedToTerms, setResidentAgreedToTerms] = useState(false);
  const [highlightResidentTerms, setHighlightResidentTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selfieInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Real-time synchronization of property layout
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("tenopilot_post_login_redirect");
    }
    propertyStore.initFirebaseListener(propertyId);
    setStructure(propertyStore.getStructure(propertyId));
    const unsubscribe = propertyStore.subscribe(() => {
      setStructure(propertyStore.getStructure(propertyId));
    });
    return unsubscribe;
  }, [propertyId]);

  const [propSettings, setPropSettings] = useState(() =>
    propertySettingsStore.getSettings(propertyId)
  );

  useEffect(() => {
    if (!propertyId) return;
    propertySettingsStore.initFirebaseListener(propertyId);
    setPropSettings(propertySettingsStore.getSettings(propertyId));
    const unsub = propertySettingsStore.subscribe(() => {
      setPropSettings(propertySettingsStore.getSettings(propertyId));
    });
    return unsub;
  }, [propertyId]);

  const propertyName =
    propSettings?.propertyName ||
    (propertyId ? portfolioStore.getProperties().find((p) => p.id === propertyId)?.name : null) ||
    "Resident Digital Gate";

  // Existing active residents (phone & email sets) to block duplicate registration on public desk check-in without exposing PII
  const [existingResidentPhones, setExistingResidentPhones] = useState<Set<string>>(new Set());
  const [existingResidentEmails, setExistingResidentEmails] = useState<Set<string>>(new Set());
  const [allOccupants, setAllOccupants] = useState<Occupant[]>([]);

  useEffect(() => {
    if (!propertyId) return;

    const buildSets = (occupantsList: any[]) => {
      const pSet = new Set<string>();
      const eSet = new Set<string>();
      occupantsList.forEach((occ) => {
        if (occ.lifecycleStatus !== "Past") {
          if (occ.phone) {
            const digits = String(occ.phone).replace(/\D/g, "").slice(-10);
            if (digits.length === 10) pSet.add(digits);
          }
          if (occ.email) {
            const cleanEm = String(occ.email).trim().toLowerCase();
            if (cleanEm.length > 3 && cleanEm.includes("@")) eSet.add(cleanEm);
          }
        }
      });
      return { pSet, eSet };
    };

    // 1. Instantly populate from occupantStore if cached
    try {
      const localOccs = occupantStore.getOccupants(propertyId);
      if (localOccs && localOccs.length > 0) {
        setAllOccupants(localOccs);
        const { pSet, eSet } = buildSets(localOccs);
        setExistingResidentPhones(pSet);
        setExistingResidentEmails(eSet);
      }
    } catch {}

    // 2. Fetch from Cloud Firestore SSOT
    async function loadOccupants() {
      try {
        const snap = await getDocs(collection(db, "properties", propertyId, "occupants"));
        const fromFs: Occupant[] = [];
        snap.docs.forEach((d) => fromFs.push(d.data() as Occupant));
        if (fromFs.length > 0) {
          setAllOccupants(fromFs);
          const { pSet, eSet } = buildSets(fromFs);
          setExistingResidentPhones(pSet);
          setExistingResidentEmails(eSet);
        }
      } catch (e) {
        console.warn("Notice checking existing occupants:", e);
      }
    }
    loadOccupants();

    const unsub = occupantStore.subscribe(() => {
      const fresh = occupantStore.getOccupants(propertyId) || [];
      setAllOccupants(fresh);
      const { pSet, eSet } = buildSets(fresh);
      setExistingResidentPhones(pSet);
      setExistingResidentEmails(eSet);
    });
    return unsub;
  }, [propertyId]);

  // Fast map to cross-reference occupants by Room & Bed Slot
  const occupantByBedMap = useMemo(() => {
    const map = new Map<string, Occupant>();
    allOccupants.forEach((occ) => {
      if (occ.lifecycleStatus !== "Past") {
        const key = `${(occ.roomNumber || "").toUpperCase().trim()}_${(occ.bedCode || "").toUpperCase().trim()}`;
        map.set(key, occ);
      }
    });
    return map;
  }, [allOccupants]);

  // Validation: Mobile and Emergency must not be identical
  const cleanCandidateMobile = useMemo(() => {
    return phone.replace(/\D/g, "").slice(-10);
  }, [phone]);

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
  const isPhoneAlreadyRegistered = useMemo(() => {
    const digits = phone.replace(/\D/g, "").slice(-10);
    return digits.length === 10 && existingResidentPhones.has(digits);
  }, [phone, existingResidentPhones]);

  // Validation: Email must not already belong to an active resident
  const isEmailAlreadyRegistered = useMemo(() => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) return false;
    return existingResidentEmails.has(cleanEmail);
  }, [email, existingResidentEmails]);

  // Auto-restore previous documents if candidate has submitted previously in this property
  useEffect(() => {
    if (cleanCandidateMobile.length !== 10) return;
    async function restoreDocs() {
      try {
        const prev = await selfKycStore.fetchLatestSubmissionForInviteAsync(propertyId, "", cleanCandidateMobile);
        if (prev) {
          if (!fullName && prev.name) setFullName(prev.name);
          if (!email && prev.email) setEmail(prev.email);
          if (!workplace && prev.workplace) setWorkplace(prev.workplace);
          if (!emergencyPhone && prev.emergencyContact?.phone) setEmergencyPhone(prev.emergencyContact.phone.replace(/\D/g, "").slice(-10));
          if (!emergencyName && prev.emergencyContact?.name) setEmergencyName(prev.emergencyContact.name);
          if (!selfiePhoto && prev.photoUrl) setSelfiePhoto(prev.photoUrl);
          if (!aadhaarFront && prev.aadhaarFrontUrl) setAadhaarFront(prev.aadhaarFrontUrl);
          if (!aadhaarBack && prev.aadhaarBackUrl) setAadhaarBack(prev.aadhaarBackUrl);
          if (!aadhaarNumber && prev.aadhaarNumber) setAadhaarNumber(prev.aadhaarNumber);
        }
      } catch (e) {}
    }
    restoreDocs();
  }, [cleanCandidateMobile, propertyId]);

  // Real-time calculation of Available beds + Vacating beds getting freed by check-in date
  const { availableBeds, upcomingLaterBeds } = useMemo(() => {
    const available: {
      floorName: string;
      roomNumber: string;
      roomType: string;
      bed: BedSlotConfig;
      monthlyRent: number;
      dailyRate: number;
      isVacating: boolean;
      vacatingDate?: string;
    }[] = [];

    const later: {
      floorName: string;
      roomNumber: string;
      bedCode: string;
      vacatingDate: string;
    }[] = [];

    const targetDate = joiningDate || new Date().toISOString().split("T")[0];

    structure.forEach((floor) => {
      floor.rooms.forEach((room) => {
        room.beds.forEach((b) => {
          const occKey = `${room.roomNumber.toUpperCase().trim()}_${b.bedCode.toUpperCase().trim()}`;
          const occ = b.occupant || occupantByBedMap.get(occKey);

          const monthlyRent = room.customRentAmount || 12000;
          const dailyRate = Math.round(monthlyRent / 30);
          const roomType =
            room.sharingType === 1
              ? "Private Single"
              : room.sharingType === 2
              ? "Double Sharing"
              : room.sharingType === 3
              ? "Triple Sharing"
              : `${room.sharingType}-Sharing`;

          // Beds currently locked on Hold (Self-KYC in progress) must NEVER appear in available bed lists
          if (b.status === "Hold") return;

          // Determine effective vacating/departure date if any
          const rawVacDate =
            b.vacatingDate ||
            occ?.vacatingDate ||
            b.guestCheckoutDate ||
            (occ?.stayType === "Guest" ? occ?.dueDate : undefined);

          // 1. Bed is completely vacant right now (no active occupant and status is Available)
          if (b.status === "Available" || (!occ && b.status !== "Occupied" && b.status !== "Booked")) {
            available.push({
              floorName: floor.floorName,
              roomNumber: room.roomNumber,
              roomType,
              bed: b,
              monthlyRent,
              dailyRate,
              isVacating: false,
            });
            return;
          }

          // 2. Bed currently has an occupant or status is Vacating, but frees up on or before target checkin date!
          if (rawVacDate) {
            const cleanVacDate = rawVacDate.includes("-") ? rawVacDate.split("T")[0] : rawVacDate;
            if (cleanVacDate <= targetDate) {
              available.push({
                floorName: floor.floorName,
                roomNumber: room.roomNumber,
                roomType,
                bed: b,
                monthlyRent,
                dailyRate,
                isVacating: true,
                vacatingDate: cleanVacDate,
              });
            } else {
              later.push({
                floorName: floor.floorName,
                roomNumber: room.roomNumber,
                bedCode: b.bedCode,
                vacatingDate: cleanVacDate,
              });
            }
          }
        });
      });
    });

    return { availableBeds: available, upcomingLaterBeds: later };
  }, [structure, occupantByBedMap, joiningDate]);

  // Handle Bed selection
  const handleSelectBed = (roomNumber: string, bedCode: string, tariff: number) => {
    setSelectedRoomNumber(roomNumber);
    setSelectedBedCode(bedCode);
    setSelectedBedTariff(tariff);
  };

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

  const handleSubmitWalkInKYC = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!residentAgreedToTerms) {
      setHighlightResidentTerms(true);
      setErrorMessage("Please review and agree to the house rules and terms to proceed.");
      return;
    }

    const cleanName = sanitizePlainText(fullName, 100);
    if (!cleanName.trim()) {
      setErrorMessage("Please enter your full legal name.");
      return;
    }

    const cleanPhone = sanitizeDigitsOnly(phone, 10);
    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (isPhoneAlreadyRegistered) {
      setErrorMessage(
        "This mobile number is already registered with another resident in this property. If this is your number, please contact property management."
      );
      return;
    }

    if (isEmailAlreadyRegistered) {
      setErrorMessage(
        "This email address is already registered with another resident in this property. If this is your email, please contact property management."
      );
      return;
    }

    const cleanEmergency = sanitizeDigitsOnly(emergencyPhone, 10);
    if (cleanEmergency.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit emergency contact phone number.");
      return;
    }

    if (cleanPhone === cleanEmergency) {
      setErrorMessage("Emergency contact phone number cannot be the same as your primary mobile number.");
      return;
    }

    if (stayType === "Guest" && !guestCheckoutDate) {
      setErrorMessage("Please specify your expected checkout date.");
      return;
    }

    // 🛡️ Section 2 Mandatory Document & Identity Verification
    if (!selfiePhoto) {
      setErrorMessage("Please capture or upload your live resident photo / selfie.");
      return;
    }

    if (!aadhaarFront) {
      setErrorMessage("Please upload your Aadhaar card front photo.");
      return;
    }

    if (!aadhaarBack) {
      setErrorMessage("Please upload your Aadhaar card back photo.");
      return;
    }

    if (!residentAgreedToTerms) {
      setHighlightResidentTerms(true);
      setErrorMessage("Please review and agree to the house rules and terms to proceed.");
      return;
    }

    setSubmitting(true);
    try {
      const cleanVehicles = vehicleNumbers
        .map((v) => sanitizeVehicleNumber(v))
        .filter(Boolean);
      const submissionId = `sub-walkin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const rentAmount = selectedBedTariff || 8500;
      const securityDeposit = stayType === "Tenant" ? rentAmount * 2 : undefined;
      const guestDailyRate = stayType === "Guest" ? Math.round(rentAmount / 30) : undefined;

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

      // 1. Submit KYC and automatically put bed on Hold
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
      {/* Top Brand Header — PG First Architecture */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between pb-5 border-b border-gray-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#c2652a] to-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-[#c2652a]/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-base sm:text-lg text-gray-900 leading-tight">
              {propertyName}
            </h2>
            <p className="text-[11px] font-semibold text-gray-500">
              Official Walk-In Check-In Desk
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-800 bg-emerald-50/90 px-3 py-1.5 rounded-full border border-emerald-200/80 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">256-Bit Encrypted</span>
          <span className="sm:hidden">Verified</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl w-full mx-auto my-6 flex-1">
        {/* ========================================================================= */}
        {/* STEP 1: STAY TYPE SELECTION (Tenant vs Guest)                              */}
        {/* ========================================================================= */}
        {step === "STAY_TYPE" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#c2652a] bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                Welcome to {propertyName}
              </span>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-gray-900">
                How long will you be staying?
              </h1>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Select your accommodation category to view available beds and customized tariff plans.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Card 1: Monthly Tenant */}
              <div
                onClick={() => setStayType("Tenant")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  stayType === "Tenant"
                    ? "border-[#c2652a] bg-orange-50/40 shadow-md ring-2 ring-[#c2652a]/20"
                    : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#c2652a] flex items-center justify-center mb-3">
                  <Home className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-serif font-bold text-lg text-gray-900">Monthly Tenant</h3>
                  {stayType === "Tenant" && (
                    <span className="w-5 h-5 rounded-full bg-[#c2652a] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Long-term month-to-month stay for working professionals and students.
                </p>
                <div className="text-[11px] text-gray-600 space-y-1 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> Fixed monthly rent cycle
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> Refundable security deposit
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> Dedicated bed reservation
                  </div>
                </div>
              </div>

              {/* Card 2: Daily Guest */}
              <div
                onClick={() => setStayType("Guest")}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  stayType === "Guest"
                    ? "border-purple-600 bg-purple-50/40 shadow-md ring-2 ring-purple-600/20"
                    : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-serif font-bold text-lg text-gray-900">Daily Guest</h3>
                  {stayType === "Guest" && (
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Short-term daily accommodation for travelers, exams, or quick visits.
                </p>
                <div className="text-[11px] text-gray-600 space-y-1 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="text-purple-600 font-bold">✓</span> Per-day flexible tariff
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-purple-600 font-bold">✓</span> Zero lock-in deposit
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-purple-600 font-bold">✓</span> Express 1-minute check-in
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep("BED_SELECT")}
              className="w-full py-4 rounded-2xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold text-base transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>View Available Rooms & Beds</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: AVAILABLE BEDS SELECTION (REAL-TIME AVAILABILITY + VACATING BEDS)  */}
        {/* ========================================================================= */}
        {step === "BED_SELECT" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
              <div>
                <button
                  type="button"
                  onClick={() => setStep("STAY_TYPE")}
                  className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 mb-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <h2 className="font-serif font-bold text-2xl text-gray-900">Select Available Bed</h2>
                <p className="text-xs text-gray-500">
                  Showing beds ready on <strong>{formatDisplayDate(joiningDate)}</strong> for {propertyName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                  {availableBeds.length} Beds Available
                </span>
              </div>
            </div>

            {/* Real-time Check-In Date Selector */}
            <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#c2652a]" />
                    <span>Your Planned Check-In Date</span>
                  </label>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Includes currently vacant beds AND vacating beds freeing up by this date.
                  </p>
                </div>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={joiningDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setJoiningDate(newDate);
                    setSelectedRoomNumber("");
                    setSelectedBedCode("");
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white border border-gray-300 font-mono text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#c2652a] focus:border-[#c2652a] transition-all cursor-pointer shadow-2xs"
                />
              </div>

              {/* Quick Preset Date Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Quick Dates:</span>
                {[
                  { label: "Today", date: new Date().toISOString().split("T")[0] },
                  {
                    label: "Tomorrow",
                    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
                  },
                  {
                    label: "In 7 Days",
                    date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
                  },
                  {
                    label: "1st of Next Month",
                    date: (() => {
                      const now = new Date();
                      return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];
                    })(),
                  },
                ].map((chip) => {
                  const isActive = joiningDate === chip.date;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setJoiningDate(chip.date);
                        setSelectedRoomNumber("");
                        setSelectedBedCode("");
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#c2652a] text-white shadow-xs"
                          : "bg-white border border-gray-200 text-gray-700 hover:border-[#c2652a] hover:bg-orange-50/50"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {availableBeds.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-gray-800">No Beds Available on {formatDisplayDate(joiningDate)}</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {upcomingLaterBeds.length > 0
                    ? `We found ${upcomingLaterBeds.length} bed(s) vacating on later dates! Try picking a date starting from ${formatDisplayDate(upcomingLaterBeds[0].vacatingDate)} above.`
                    : "All rooms are currently occupied or on hold. Please contact the front desk manager for waitlist inquiries."}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {availableBeds.map((item, idx) => {
                  const isSelected = selectedRoomNumber === item.roomNumber && selectedBedCode === item.bed.bedCode;
                  const price = stayType === "Tenant" ? item.monthlyRent : item.dailyRate;
                  const unitText = stayType === "Tenant" ? "/ month" : "/ day";

                  return (
                    <div
                      key={`${item.roomNumber}-${item.bed.bedCode}-${idx}`}
                      onClick={() => handleSelectBed(item.roomNumber, item.bed.bedCode, item.monthlyRent)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-[#c2652a] bg-orange-50/50 shadow-md ring-2 ring-[#c2652a]/20"
                          : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isSelected
                              ? "bg-[#c2652a] text-white"
                              : item.isVacating
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          <BedIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-serif font-bold text-base text-gray-900">
                              Room {item.roomNumber} ({formatBedLabel(item.bed.bedCode)})
                            </span>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                              {item.roomType}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 block font-medium">
                            {item.floorName}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {item.isVacating ? (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-purple-600" />
                              Vacating {formatDisplayDate(item.vacatingDate)}
                            </span>
                            <span className="text-[9.5px] text-purple-900 font-semibold block">
                              Freed by your check-in
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Available Now
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] font-bold text-[#c2652a] flex items-center justify-end gap-1 mt-1">
                            <Check className="w-3 h-3 stroke-3" /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Notice of beds vacating on later dates */}
                {upcomingLaterBeds.length > 0 && (
                  <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/70 text-xs text-purple-900 flex items-center gap-2 animate-in fade-in">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>
                      <strong>{upcomingLaterBeds.length} additional bed(s)</strong> are vacating on later dates (from {formatDisplayDate(upcomingLaterBeds[0].vacatingDate)}). Choose a later date above to view and reserve them.
                    </span>
                  </div>
                )}
              </div>
            )}

            {selectedRoomNumber && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep("KYC_FORM")}
                  className="w-full py-4 rounded-2xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold text-base transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Continue with Room {selectedRoomNumber} ({selectedBedCode})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: KYC FORM                                                          */}
        {/* ========================================================================= */}
        {step === "KYC_FORM" && (
          <form onSubmit={handleSubmitWalkInKYC} className="space-y-6 animate-in fade-in">
            {/* Header with Back button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("BED_SELECT")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Change Bed Selection
              </button>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#c2652a] bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                Step 3 of 3: Digital KYC
              </span>
            </div>

            {/* Selected Room Summary Card (ZERO BANK DETAILS EXPOSED) */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <Home className="w-4 h-4 text-[#c2652a]" />
                  <span>Selected Room & Tariff</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {stayType === "Tenant" ? "Monthly Residency" : "Daily Guest Stay"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Room & Bed</span>
                  <span className="font-serif font-bold text-base sm:text-lg text-gray-900 block">
                    Room {selectedRoomNumber} ({selectedBedCode})
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 col-span-2 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Check-In Tariff</span>
                  <span className="font-semibold text-xs sm:text-sm text-gray-700 block mt-0.5">
                    Confirmed by PG Reception upon Approval
                  </span>
                </div>
              </div>
            </div>

            {/* Personal Details */}
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
                    name="fullName"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="As shown on Aadhaar card"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mobile Phone Number *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold text-xs">+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      maxLength={10}
                      value={phone}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("text");
                        const clean = normalizePhoneNumber(pasted);
                        setPhone(clean);
                      }}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      }}
                      placeholder="98765 43210"
                      className={`w-full pl-12 pr-3.5 py-2.5 rounded-xl border font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 ${
                        isPhoneAlreadyRegistered
                          ? "border-rose-500 bg-rose-50/40 text-rose-950 focus:border-rose-500"
                          : "border-gray-300 focus:border-[#c2652a]"
                      }`}
                    />
                  </div>
                  {isPhoneAlreadyRegistered && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1.5 animate-in fade-in">
                      <span>⚠️</span> This mobile number is already registered with another resident in this property.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="For receipts and notifications"
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-medium text-gray-900 focus:ring-2 transition-colors ${
                      isEmailAlreadyRegistered
                        ? "border-rose-500 bg-rose-50/40 text-rose-950 focus:border-rose-500 focus:ring-rose-200"
                        : "border-gray-300 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                    }`}
                  />
                  {isEmailAlreadyRegistered && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1.5 animate-in fade-in">
                      <span>⚠️</span> This email address is already registered with another resident in this property.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Check-in / Joining Date *</label>
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
                  <label className="block font-bold text-gray-700 mb-1">
                    {stayType === "Tenant" ? "Workplace / College" : "Purpose of Visit"}
                  </label>
                  <input
                    type="text"
                    value={stayType === "Tenant" ? workplace : purposeOfVisit}
                    onChange={(e) =>
                      stayType === "Tenant" ? setWorkplace(e.target.value) : setPurposeOfVisit(e.target.value)
                    }
                    placeholder={stayType === "Tenant" ? "e.g. Infosys, TCS, College" : "e.g. Business visit, exam"}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                  />
                </div>

                {/* Emergency Contact Phone & Name (No relation needed) */}
                <div className="sm:col-span-2 p-3 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-2">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-700" />
                    <span>Emergency Contact Number *</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        required
                        maxLength={10}
                        value={emergencyPhone}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData.getData("text");
                          const clean = normalizePhoneNumber(pasted);
                          setEmergencyPhone(clean);
                        }}
                        onChange={(e) => {
                          setEmergencyPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                        }}
                        placeholder="10-digit emergency phone number *"
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
                    Optional. Add bike, scooter, or car registration numbers for gate pass, parking allocation, and resident search.
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
                {/* Live Selfie Capture */}
                <div className={`p-4 rounded-2xl border transition-all space-y-2 ${!selfiePhoto ? "bg-amber-50/40 border-amber-200/80" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-purple-600" />
                      <span>Live Resident Photo / Selfie <span className="text-red-500">*</span></span>
                    </span>
                    {selfiePhoto ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Photo Captured
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Required
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
                  <div className={`p-4 rounded-2xl border transition-all space-y-2 ${!aadhaarFront ? "bg-amber-50/40 border-amber-200/80" : "bg-gray-50 border-gray-200"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">
                        Aadhaar Front Photo <span className="text-red-500">*</span>
                      </span>
                      {aadhaarFront ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ✓ Uploaded
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Required
                        </span>
                      )}
                    </div>
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

                  <div className={`p-4 rounded-2xl border transition-all space-y-2 ${!aadhaarBack ? "bg-amber-50/40 border-amber-200/80" : "bg-gray-50 border-gray-200"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">
                        Aadhaar Back Photo <span className="text-red-500">*</span>
                      </span>
                      {aadhaarBack ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ✓ Uploaded
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Required
                        </span>
                      )}
                    </div>
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



                {/* Terms Consent */}
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
                      <span>Please tick this box to complete check-in verification</span>
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
              disabled={submitting || isEmergencySameAsMobile || isPhoneAlreadyRegistered || isEmailAlreadyRegistered}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-base transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Check-In to Desk...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Submit Walk-In Check-In Request</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: SUCCESS CONFIRMATION                                              */}
        {/* ========================================================================= */}
        {step === "SUCCESS" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-10 shadow-sm text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-11 h-11" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Check-In Request Submitted
              </span>
              <h2 className="font-serif font-bold text-2xl sm:text-3xl text-gray-900">
                Bed Reserved & Placed on Hold!
              </h2>
              <p className="text-xs text-gray-600 max-w-md mx-auto">
                Thank you, <span className="font-bold text-gray-900">{fullName}</span>! Your documents and room request have been submitted to the front reception desk of <span className="font-bold">{propertyName}</span>.
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
                  Room {selectedRoomNumber} ({selectedBedCode})
                </span>
              </p>
              <p className="text-gray-700 flex items-center justify-between">
                <span>💰 Tariff:</span>
                <span className="font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                  Confirmed by PG Reception upon Approval
                </span>
              </p>
              <p className="text-gray-700 flex items-center justify-between">
                <span>📅 Check-in Date:</span>
                <span className="font-mono font-bold text-gray-900">{joiningDate}</span>
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600 text-left space-y-1">
              <p className="font-bold text-gray-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#c2652a]" /> Please inform reception desk
              </p>
              <p className="text-[11px] text-gray-500">
                The desk manager will verify your Aadhaar card and live photo. Once verified, they will approve your check-in and hand over your room key.
              </p>
            </div>

            <p className="text-[11px] text-gray-400">
              You can now show this screen to the reception desk manager. Welcome to {propertyName}!
            </p>
          </div>
        )}
      </main>

      {/* Footer — PG Branding First */}
      <footer className="text-center text-[11px] text-gray-500 py-3 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-1 max-w-2xl w-full mx-auto">
        <span className="font-semibold text-gray-600">
          © {new Date().getFullYear()} {propertyName} • Resident Care
        </span>
        <span className="text-[10px] text-gray-400">
          Powered by TenoPilot Cloud OS
        </span>
      </footer>
    </div>
  );
}
