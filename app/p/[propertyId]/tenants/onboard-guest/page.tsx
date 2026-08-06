"use client";

import { use, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { MOCK_OCCUPANTS_200, Occupant } from "@/constants/mockOccupants";
import {
  propertyStore,
  getBedVacatingDate,
  FloorConfig,
  RoomConfig,
  BedSlotConfig,
} from "@/constants/propertyLayoutStore";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle2,
  FileText,
  Upload,
  Camera,
  Bed,
  Check,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info,
  Filter,
  Loader2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  validateDocumentFile,
  autoCompressImage,
  ProcessedDocument,
} from "@/utils/documentSecurity";
import { uploadKycDocumentToFirebase } from "@/utils/uploadDocument";
import { lookupExistingOccupant } from "@/utils/phoneLookup";

export default function OnboardGuestPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";
  const router = useRouter();

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Wizard Step State (1: Guest Details, 2: Bed Allocation, 3: Quick KYC Photo — Streamlined 3 steps!)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State — Step 1: Guest Personal & Stay Details (Excludes workplace/office fields as per Update 03!)
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");

  // Instant lookup match against occupantStore (APPLIES STRICTLY TO PRIMARY PHONE FIELD ONLY)
  const existingOccupantMatch = useMemo(() => {
    return lookupExistingOccupant(phone);
  }, [phone]);
  const [emergencyCountryCode, setEmergencyCountryCode] = useState("+91");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [address, setAddress] = useState("");

  const [checkInDate, setCheckInDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const future = new Date();
    future.setDate(future.getDate() + 7); // Default 7-day guest stay
    return future.toISOString().split("T")[0];
  });

  const [totalTariff, setTotalTariff] = useState<number>(3500);
  const [depositAmount, setDepositAmount] = useState<number>(1000);

  // Form State — Step 2: Bed Allocation & Desired Sharing Filter (Defaults to 2 Sharing)
  const [desiredSharingFilter, setDesiredSharingFilter] = useState<number | "ALL">(2);
  const [selectedBed, setSelectedBed] = useState<{
    bedId: string;
    bedCode: string;
    roomNumber: string;
    floorName: string;
  } | null>(null);

  // Form State — Step 3: Quick KYC Upload & Auto-Compression Documents (Capped PDF 1MB, Front/Back ID Images)
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [idUploadMode, setIdUploadMode] = useState<"IMAGES" | "PDF">("IMAGES");
  const [photoDoc, setPhotoDoc] = useState<ProcessedDocument | null>(null);
  const [aadhaarFrontDoc, setAadhaarFrontDoc] = useState<ProcessedDocument | null>(null);
  const [aadhaarBackDoc, setAadhaarBackDoc] = useState<ProcessedDocument | null>(null);

  // Live Firebase Storage URLs
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [uploadingState, setUploadingState] = useState<{
    photo?: boolean;
    front?: boolean;
    back?: boolean;
    pdf?: boolean;
  }>({});

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdGuest, setCreatedGuest] = useState<Occupant | null>(null);

  // Reactive property structure state subscribed to propertyStore
  const [propertyStructure, setPropertyStructure] = useState<FloorConfig[]>([]);

  // Dynamic Stay Duration Calculation (Check-in vs Check-out)
  const stayDays = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  }, [checkInDate, checkOutDate]);

  useEffect(() => {
    setPropertyStructure(propertyStore.getStructure());
    const unsubscribe = propertyStore.subscribe(() => {
      setPropertyStructure(propertyStore.getStructure());
    });
    return unsubscribe;
  }, []);

  // Intelligent Floor Navigation Filter for Guest Onboarding:
  const onboardingFloorNavigation = useMemo(() => {
    return propertyStructure
      .map((fl) => ({
        ...fl,
        rooms: fl.rooms
          .filter((rm) => {
            if (desiredSharingFilter === "ALL") return true;
            return rm.sharingType === desiredSharingFilter;
          })
          .map((rm) => ({
            ...rm,
            beds: rm.beds
              .filter(
                (bd) => bd.status === "Available" || bd.status === "Vacating"
              )
              .map((bd) => {
                const vacatingDateStr = getBedVacatingDate(bd) || "15 Aug 2026";
                const cleanDate = vacatingDateStr.replace(" 2026", "");
                if (bd.status !== "Vacating") return bd;
                return {
                  ...bd,
                  vacatingDate: vacatingDateStr,
                  vacatingNote: `Vacating ${cleanDate}`,
                };
              }),
          }))
          .filter((rm) => rm.beds.length > 0),
      }))
      .filter((fl) => fl.rooms.length > 0);
  }, [propertyStructure, desiredSharingFilter]);

  // Validation per step
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrimaryPhone = phone.replace(/\D/g, "");
    const cleanEmergency = emergencyPhone.replace(/\D/g, "");

    // Rule 1: Primary phone must be exactly 10 digits
    if (cleanPrimaryPhone.length !== 10) {
      alert("Mobile phone number must be exactly 10 digits.");
      return;
    }

    // Rule 2: Emergency contact number CANNOT be the same as primary phone number
    if (cleanEmergency && cleanPrimaryPhone === cleanEmergency) {
      alert("Emergency contact number cannot be the same as your primary mobile phone number. Please enter a different number (e.g. Parent/Guardian).");
      return;
    }

    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (!selectedBed) return;
    setCurrentStep(3);
  };

  // Upload handler pushing to Firebase Cloud Storage live bucket
  const handleFileUpload = async (
    docType: "photo" | "aadhaar_front" | "aadhaar_back" | "aadhaar_pdf",
    file: File
  ) => {
    const val = validateDocumentFile(file);
    if (!val.valid) {
      alert(val.error);
      return;
    }

    setUploadingState((prev) => ({ ...prev, [docType]: true }));

    try {
      // Step 1: Auto-compress client side
      const proc = await autoCompressImage(file);

      if (docType === "photo") setPhotoDoc(proc);
      if (docType === "aadhaar_front") setAadhaarFrontDoc(proc);
      if (docType === "aadhaar_back") setAadhaarBackDoc(proc);

      // Step 2: Push to Live Firebase Storage Container
      const tempId = `guest-${Date.now()}`;
      const cloudUrl = await uploadKycDocumentToFirebase(
        propertyId,
        tempId,
        docType,
        proc.file,
        proc.fileName
      );

      if (docType === "photo") setPhotoUrl(cloudUrl);
      setPhotoUploaded(true);
    } catch (e: any) {
      alert(`Error uploading file to storage: ${e?.message || e}`);
    } finally {
      setUploadingState((prev) => ({ ...prev, [docType]: false }));
    }
  };

  // Final Action: Complete Guest Onboarding
  const handleFinalGuestSubmit = () => {
    const newId = `guest-${Date.now()}`;
    const formattedCheckIn = new Date(checkInDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedCheckOut = new Date(checkOutDate).toLocaleDateString(
      "en-GB",
      { day: "2-digit", month: "short", year: "numeric" }
    );
    const fullPhoneNumber = `${countryCode} ${phone.trim()}`;
    const fullEmergencyPhone = emergencyPhone.trim()
      ? `${emergencyCountryCode} ${emergencyPhone.trim()}`
      : "+91 98000 11122";

    // Calculate stay duration
    const diffTime = Math.abs(
      new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()
    );
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 7;

    // Automatic Date Evaluation Engine (Onboarding Date vs Check-In Date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetCheckIn = checkInDate ? new Date(checkInDate) : today;
    targetCheckIn.setHours(0, 0, 0, 0);
    const isFutureCheckIn = targetCheckIn > today;

    const initialLifecycleStatus: "Active" | "Booked" = isFutureCheckIn ? "Booked" : "Active";
    const initialPaymentStatus: "Due" = "Due"; // Tariff + Deposit is RECEIVABLE upon onboarding!

    const newGuest: Occupant = {
      id: newId,
      name: fullName.trim(),
      phone: fullPhoneNumber,
      email: `${fullName.toLowerCase().replace(/\s+/g, ".")}@guest.com`,
      stayType: "Guest",
      lifecycleStatus: initialLifecycleStatus,
      paymentStatus: initialPaymentStatus,
      daysDiff: isFutureCheckIn ? 0 : diffDays,
      daysRemainingText: isFutureCheckIn ? "Due on Check-In" : `${diffDays} Days Remaining`,
      rentAmount: totalTariff,
      dueDate: formattedCheckOut,
      dueDay: new Date(checkOutDate).getDate(),
      lastPaidDate: isFutureCheckIn ? "Pending Check-In" : "Unpaid / Due Now",
      roomNumber: selectedBed ? selectedBed.roomNumber : "101",
      bedCode: selectedBed ? selectedBed.bedCode : "BED A",
      joiningDate: formattedCheckIn,
      avatar: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
      kycVerified: photoUploaded,
      hasPdfAgreement: false,
      address: address.trim(),
      aadhaarNumber: "XXXX-XXXX-8811",
      emergencyContact: {
        name: "Parent / Guardian",
        phone: fullEmergencyPhone,
        relation: "Family",
      },
      kycDocs: {
        idMode: idUploadMode,
        photoUrl: photoUrl || photoDoc?.previewUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
        aadhaarFrontUrl: aadhaarFrontDoc?.previewUrl || undefined,
        aadhaarBackUrl: aadhaarBackDoc?.previewUrl || undefined,
      },
      securityDeposit: depositAmount || 1000,
      depositStatus: "PENDING",
      partialPaidThisCycle: 0,
      arrearsBalance: 0,
      paymentHistory: [],
    };

    // Prepend to MOCK_OCCUPANTS_200 & occupantStore (Saves to localStorage & Firebase)
    MOCK_OCCUPANTS_200.unshift(newGuest);

    // Update bed status in propertyStore
    if (selectedBed) {
      const updatedStructure = propertyStructure.map((fl) => {
        if (fl.floorName !== selectedBed.floorName) return fl;
        return {
          ...fl,
          rooms: fl.rooms.map((rm) => {
            if (rm.roomNumber !== selectedBed.roomNumber) return rm;
            return {
              ...rm,
              beds: rm.beds.map((bd) => {
                if (bd.bedCode !== selectedBed.bedCode) return bd;
                return {
                  ...bd,
                  status: "Guest" as const,
                  guestCheckoutDate: formattedCheckOut,
                  occupant: newGuest,
                };
              }),
            };
          }),
        };
      });

      propertyStore.updateStructure(updatedStructure);
    }

    setCreatedGuest(newGuest);
    setShowSuccessModal(true);
  };

  return (
    <div className="flex min-h-screen bg-[#fcf9f8] text-gray-900 font-sans selection:bg-purple-500/20 selection:text-purple-700">
      {/* Left Sidebar */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area (100% Viewport Width w-full) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full">
        <PropertyHeader
          title="Guest Onboarding"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Content Body */}
        <div className="p-4 md:p-8 space-y-6 flex-1 pb-28 w-full max-w-4xl mx-auto">
          {/* Top Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
            <Link
              href={`/p/${propertyId}/tenants`}
              className="hover:text-purple-700 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Tenant Operations
            </Link>
            <span>/</span>
            <span className="text-purple-900 font-bold">New Short-Term Guest</span>
          </div>

          {/* Stepper Header (Streamlined 3 Steps for Guests!) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  Onboard Short-term Guest <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full font-sans font-bold">🟣 SHORT-STAY</span>
                </h1>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">
                  Streamlined 3-step wizard for daily/weekly guests (No lease agreement required)
                </p>
              </div>

              <span className="md:hidden text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                Step {currentStep} of 3
              </span>
            </div>

            {/* Desktop 3-Step Stepper Bar */}
            <div className="hidden md:flex items-center justify-between pt-2">
              {[
                { step: 1, label: "1. Guest & Stay Details" },
                { step: 2, label: "2. Bed Allocation" },
                { step: 3, label: "3. Quick KYC & Photo" },
              ].map((s) => {
                const isActive = currentStep === s.step;
                const isDone = currentStep > s.step;

                return (
                  <div
                    key={s.step}
                    className={`flex items-center gap-2 text-xs font-bold ${
                      isActive
                        ? "text-purple-700"
                        : isDone
                        ? "text-emerald-700"
                        : "text-gray-400"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                        isActive
                          ? "bg-purple-700 text-white shadow-xs"
                          : isDone
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : s.step}
                    </div>
                    <span>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 1: GUEST PERSONAL & STAY DETAILS (NO Workplace/Office fields!) */}
          {currentStep === 1 && (
            <form
              onSubmit={handleStep1Next}
              className="bg-white rounded-2xl border border-gray-200 p-5 md:p-8 shadow-xs space-y-6 animate-in fade-in"
            >
              <h2 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <User className="w-5 h-5 text-purple-700" /> Guest Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Guest Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Verma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-purple-700"
                  />
                </div>

                {/* Primary Mobile Phone (Strict 10 Digits) */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Mobile Phone Number * (10 Digits)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-16 px-2.5 py-3 rounded-xl border border-gray-300 font-mono font-bold text-center text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-purple-700 shrink-0 bg-gray-50"
                      title="Country Code (default +91)"
                    />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="flex-1 px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-purple-700"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Format: +91 followed by 10 digit mobile number
                  </span>

                  {/* INSTANT EXISTING PROFILE LOOKUP ALERT BANNER */}
                  {existingOccupantMatch && (
                    <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1 animate-in fade-in">
                      <div className="font-bold flex items-center gap-1.5 text-amber-950">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        Existing Profile Found: {existingOccupantMatch.name}
                      </div>
                      <p className="text-[11px] text-amber-800">
                        This mobile number is registered to a <strong>{existingOccupantMatch.stayType}</strong> (Status: <strong>{existingOccupantMatch.lifecycleStatus}</strong>) in Room {existingOccupantMatch.roomNumber} ({existingOccupantMatch.bedCode}).
                      </p>
                    </div>
                  )}
                </div>

                {/* Emergency Contact Number (Cannot be same as Primary Phone) */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Emergency Contact Number * (Must be different)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={emergencyCountryCode}
                      onChange={(e) => setEmergencyCountryCode(e.target.value)}
                      className="w-16 px-2.5 py-3 rounded-xl border border-gray-300 font-mono font-bold text-center text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-purple-700 shrink-0 bg-gray-50"
                      title="Country Code (default +91)"
                    />
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="9812345678 (Parent/Guardian)"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="flex-1 px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-purple-700"
                    />
                  </div>
                  {phone.trim() &&
                    emergencyPhone.trim() &&
                    phone.replace(/\D/g, "") === emergencyPhone.replace(/\D/g, "") && (
                      <span className="text-[11px] text-red-600 font-bold mt-1 block">
                        ❌ Error: Emergency contact number matches primary mobile number! Please enter a different number.
                      </span>
                    )}
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Home Address
                  </label>
                  <input
                    type="text"
                    placeholder="City, State"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-purple-700"
                  />
                </div>
              </div>

              {/* Guest Stay Dates & Tariff Subsection */}
              <h2 className="font-serif font-bold text-xl text-gray-900 flex items-center justify-between border-b border-gray-100 pb-3 pt-4">
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-700" /> Short Stay Dates & Tariff
                </span>
                {stayDays > 0 && (
                  <span className="text-xs bg-purple-100 text-purple-900 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-purple-700" />
                    {stayDays} {stayDays === 1 ? "Day (1 Night)" : `Days (${stayDays} Nights)`}
                  </span>
                )}
              </h2>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Check-in Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-purple-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Expected Check-out *
                    </label>
                    <input
                      type="date"
                      required
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-purple-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Total Stay Tariff (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={totalTariff}
                      onChange={(e) => setTotalTariff(Number(e.target.value))}
                      className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-purple-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Security Deposit (₹)
                    </label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-purple-700"
                    />
                  </div>
                </div>

                {/* 📅 DYNAMIC STAY DURATION HELPER BANNER */}
                {stayDays > 0 ? (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50/50 border border-purple-200 text-purple-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="p-1 rounded-lg bg-purple-200/80 text-purple-800">
                        <Clock className="w-4 h-4" />
                      </span>
                      <span>
                        Stay Duration Calculated: <strong className="text-purple-950 font-extrabold text-sm">{stayDays} {stayDays === 1 ? "Day (1 Night)" : `Days (${stayDays} Nights)`}</strong>
                      </span>
                    </div>
                    {totalTariff > 0 && (
                      <span className="text-[11px] font-mono text-purple-900 bg-white/90 px-3 py-1 rounded-lg border border-purple-200/80 font-bold shadow-2xs">
                        ⚡ Effective Rate: ₹{Math.round(totalTariff / stayDays).toLocaleString("en-IN")} / day
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Expected checkout date must be after check-in date.
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md min-h-[48px]"
                >
                  Proceed to Bed Allocation <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: REUSED FLOOR NAVIGATION BED ALLOCATION WITH INTELLIGENT DESIRED SHARING FILTER */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-8 shadow-xs space-y-6 animate-in fade-in">
              {/* STICKY TOP FILTER & CONTROL BAR */}
              <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md pb-4 pt-2 border-b border-gray-200/80 space-y-4 shadow-2xs">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2">
                      <Bed className="w-5 h-5 text-purple-700" /> Select Bed for {fullName || "Guest"}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                      Showing available 🟢 & vacating 🟧 beds across floor navigation (Occupied beds hidden)
                    </p>
                  </div>

                  {selectedBed && (
                    <span className="bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-2xs shrink-0">
                      ✓ Selected: {selectedBed.floorName} Room {selectedBed.roomNumber} ({selectedBed.bedCode})
                    </span>
                  )}
                </div>

                {/* INTELLIGENT DESIRED ROOM SHARING FILTER (Defaults to 2 Sharing) */}
                <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-purple-700" /> Filter by Desired Room Sharing:
                    </label>
                    <span className="text-[10px] text-gray-500 font-medium">
                      Pre-selected to 2 Sharing by default
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    {[
                      { val: "ALL", label: "ALL SHARING" },
                      { val: 1, label: "1 SHARING (Single)" },
                      { val: 2, label: "2 SHARING (Double)" },
                      { val: 3, label: "3 SHARING (Triple)" },
                      { val: 4, label: "4 SHARING (Four)" },
                    ].map((opt) => {
                      const isActive = desiredSharingFilter === opt.val;
                      return (
                        <button
                          type="button"
                          key={String(opt.val)}
                          onClick={() => setDesiredSharingFilter(opt.val as any)}
                          className={`px-3.5 py-1.5 rounded-full transition-all ${
                            isActive
                              ? "bg-purple-700 text-white shadow-xs"
                              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Floor Navigation Hierarchy Grid */}
              {onboardingFloorNavigation.length > 0 ? (
                <div className="space-y-6">
                  {onboardingFloorNavigation.map((floor) => (
                    <div key={floor.id} className="space-y-3">
                      {/* Floor Header Bar */}
                      <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-800">
                            {floor.floorName}
                          </span>
                          <span className="text-[11px] text-gray-400 font-bold">
                            — {floor.floorSubtitle}
                          </span>
                        </div>
                      </div>

                      {/* Rooms Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {floor.rooms.map((room) => (
                          <div
                            key={room.id}
                            className="bg-[#fcfcfc] rounded-xl border border-gray-200 p-4 space-y-3 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-serif font-bold text-base text-gray-900">
                                  Room {room.roomNumber}
                                </h3>
                                <span className="text-[9px] text-gray-400 font-bold uppercase">
                                  {room.sharingType} SHARING CAPACITY
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {room.specialFeatureTag && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                    {room.specialFeatureTag}
                                  </span>
                                )}
                                <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[9px] font-bold">
                                  {room.sharingType} SHARING
                                </span>
                              </div>
                            </div>

                            {/* Bed Slot Buttons (NO Tenant Names displayed for privacy!) */}
                            <div className="grid grid-cols-2 gap-2">
                              {room.beds.map((bed) => {
                                const isSelected =
                                  selectedBed?.bedId === bed.id;
                                const isVacating = bed.status === "Vacating";

                                return (
                                  <button
                                    type="button"
                                    key={bed.id}
                                    onClick={() =>
                                      setSelectedBed({
                                        bedId: bed.id,
                                        bedCode: bed.bedCode,
                                        roomNumber: room.roomNumber,
                                        floorName: floor.floorName,
                                      })
                                    }
                                    className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[60px] ${
                                      isSelected
                                        ? "bg-purple-700 text-white border-purple-700 ring-2 ring-purple-700/30 shadow-md scale-[1.02]"
                                        : isVacating
                                        ? "bg-orange-50/60 text-orange-900 border-orange-200 hover:bg-orange-100/70"
                                        : "bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-100/80"
                                    }`}
                                  >
                                    <span className="font-extrabold text-xs">
                                      {bed.bedCode}
                                    </span>

                                    {/* Status & Date Badge ONLY — NO Tenant Names! */}
                                    <span className={`text-[10px] font-bold ${isSelected ? "text-white" : ""}`}>
                                      {isVacating
                                        ? (bed as any).vacatingNote || `Vacating ${bed.vacatingDate || "15 Aug"}`
                                        : "Available 🟢"}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                  No available or vacating beds match the selected {desiredSharingFilter}-sharing filter. Try selecting "ALL SHARING".
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 text-xs min-h-[48px]"
                >
                  ← Back to Details
                </button>
                <button
                  type="button"
                  disabled={!selectedBed}
                  onClick={handleStep2Next}
                  className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md min-h-[48px]"
                >
                  Proceed to Quick KYC <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: QUICK KYC PHOTO & COMPLETE GUEST ONBOARDING WITH LIVE FIREBASE STORAGE UPLOADS */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-8 shadow-xs space-y-6 animate-in fade-in text-xs">
              <h2 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Camera className="w-5 h-5 text-purple-700" /> Quick Guest KYC & Photo
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Guest Photo Card */}
                <div className="p-5 rounded-2xl border border-gray-200 bg-[#fcfcfc] space-y-3 text-center flex flex-col items-center justify-between">
                  <div className="space-y-1">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-700 w-12 h-12 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-gray-900">
                      Guest Photo Headshot
                    </h3>
                    <p className="text-gray-500 text-[11px]">
                      JPG, PNG (Max 10MB raw — Auto-compressed)
                    </p>
                  </div>

                  <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-800 flex items-center justify-center gap-2 shadow-2xs transition-all w-full">
                    {uploadingState.photo ? (
                      <Loader2 className="w-4 h-4 text-purple-700 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-purple-700 shrink-0" />
                    )}
                    {photoDoc ? "Change Photo" : "Upload / Capture Photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload("photo", file);
                      }}
                    />
                  </label>

                  {photoDoc && (
                    <div className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 rounded-xl w-full font-medium">
                      ✓ Uploaded & Synced to Cloud Storage: <strong>{photoDoc.fileName}</strong>
                    </div>
                  )}
                </div>

                {/* Guest ID Proof Card */}
                <div className="p-5 rounded-2xl border border-gray-200 bg-[#fcfcfc] space-y-4 text-center flex flex-col items-center justify-between">
                  <div className="space-y-1">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-700 w-12 h-12 flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-gray-900">
                      Govt ID / Aadhaar Proof
                    </h3>
                    <p className="text-gray-500 text-[11px]">
                      Choose upload mode below:
                    </p>
                  </div>

                  {/* ID Upload Mode Tab Selector */}
                  <div className="flex bg-gray-200/70 p-1 rounded-xl w-full text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setIdUploadMode("IMAGES")}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        idUploadMode === "IMAGES"
                          ? "bg-white text-purple-700 shadow-2xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      💳 Front & Back Photos
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdUploadMode("PDF")}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        idUploadMode === "PDF"
                          ? "bg-white text-purple-700 shadow-2xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      📄 Single PDF (Max 1MB)
                    </button>
                  </div>

                  {/* MODE A: Front & Back Images */}
                  {idUploadMode === "IMAGES" ? (
                    <div className="grid grid-cols-2 gap-3 w-full pt-1">
                      {/* Front Image Input */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-gray-700 block">
                          ID Card Front *
                        </span>
                        <label className="cursor-pointer px-3 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-[11px] font-bold text-gray-800 flex items-center justify-center gap-1.5 shadow-2xs transition-all w-full">
                          {uploadingState.front ? (
                            <Loader2 className="w-3.5 h-3.5 text-purple-700 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                          )}
                          {aadhaarFrontDoc ? "Change Front" : "Upload Front"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload("aadhaar_front", file);
                            }}
                          />
                        </label>
                        {aadhaarFrontDoc && (
                          <div className="text-[9px] bg-emerald-50 text-emerald-800 p-1.5 rounded-lg font-medium">
                            ✓ Front ({aadhaarFrontDoc.compressedSizeMb} MB)
                          </div>
                        )}
                      </div>

                      {/* Back Image Input */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-gray-700 block">
                          ID Card Back *
                        </span>
                        <label className="cursor-pointer px-3 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-[11px] font-bold text-gray-800 flex items-center justify-center gap-1.5 shadow-2xs transition-all w-full">
                          {uploadingState.back ? (
                            <Loader2 className="w-3.5 h-3.5 text-purple-700 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                          )}
                          {aadhaarBackDoc ? "Change Back" : "Upload Back"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload("aadhaar_back", file);
                            }}
                          />
                        </label>
                        {aadhaarBackDoc && (
                          <div className="text-[9px] bg-emerald-50 text-emerald-800 p-1.5 rounded-lg font-medium">
                            ✓ Back ({aadhaarBackDoc.compressedSizeMb} MB)
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* MODE B: Single PDF (Max 1MB) */
                    <div className="w-full space-y-2 pt-1">
                      <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-800 flex items-center justify-center gap-2 shadow-2xs transition-all w-full">
                        {uploadingState.pdf ? (
                          <Loader2 className="w-4 h-4 text-purple-700 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 text-purple-700" />
                        )}
                        {aadhaarFrontDoc ? "Change PDF File" : "Upload ID PDF"}
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload("aadhaar_pdf", file);
                          }}
                        />
                      </label>

                      <p className="text-[10px] text-gray-400 font-medium">
                        Strictly capped to 1 MB limit for identity PDF documents
                      </p>

                      {aadhaarFrontDoc && (
                        <div className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 rounded-xl w-full font-medium">
                          ✓ Uploaded PDF: <strong>{aadhaarFrontDoc.fileName}</strong> ({aadhaarFrontDoc.compressedSizeMb} MB)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-700 shrink-0" />
                <span>
                  Don't have ID handy? Click <strong>Skip for Now</strong> below. Guest profile status will show <strong>KYC Pending 🟡</strong> until updated.
                </span>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full md:w-auto px-6 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 text-xs min-h-[48px]"
                >
                  ← Back to Allocation
                </button>

                <div className="flex w-full md:w-auto items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUploaded(false);
                      setPhotoDoc(null);
                      setAadhaarFrontDoc(null);
                      setAadhaarBackDoc(null);
                      handleFinalGuestSubmit();
                    }}
                    className="flex-1 md:flex-none px-5 py-3.5 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs shadow-2xs min-h-[48px]"
                  >
                    Skip for Now (KYC Pending 🟡)
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalGuestSubmit}
                    className="flex-1 md:flex-none px-8 py-3.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all min-h-[48px]"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Complete Guest Onboarding
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CENTERED SUCCESS CONFETTI DIALOG WITH PURPLE GUEST BADGE 🟣 */}
        {showSuccessModal && createdGuest && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-purple-200 shadow-2xl max-w-md w-full p-8 text-center space-y-6 animate-in zoom-in-95">
              <div className="w-20 h-20 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-inner text-3xl">
                🎉
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                  🟣 SHORT-TERM GUEST ONBOARDED
                </span>
                <h3 className="font-serif font-bold text-2xl text-gray-900 mt-2">
                  {createdGuest.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Successfully assigned to Room {createdGuest.roomNumber} ({createdGuest.bedCode})
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Stay Duration</span>
                  <span className="font-mono font-bold text-purple-900">
                    {createdGuest.daysDiff} Days ({createdGuest.joiningDate} → {createdGuest.dueDate})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Total Tariff</span>
                  <span className="font-mono font-bold text-purple-700">
                    ₹{createdGuest.rentAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">KYC Status</span>
                  <span className="font-bold text-emerald-600">
                    {createdGuest.kycVerified ? "VERIFIED ✓" : "PENDING 🟡"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <Link
                  href={`/p/${propertyId}/tenants/${createdGuest.id}`}
                  className="w-full py-3.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
                >
                  View Guest Profile <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={`/p/${propertyId}/tenants`}
                  className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 text-xs"
                >
                  Back to Directory
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
