"use client";

import { use, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { MOCK_OCCUPANTS_200, occupantStore, Occupant } from "@/constants/mockOccupants";
import {
  propertyStore,
  getBedVacatingDate,
  FloorConfig,
  RoomConfig,
  BedSlotConfig,
} from "@/constants/propertyLayoutStore";
import {
  propertySettingsStore,
  PropertySettingsData,
  CLEAN_ZERO_PROPERTY_SETTINGS,
} from "@/constants/propertySettings";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
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
} from "lucide-react";
import {
  validateDocumentFile,
  autoCompressImage,
  ProcessedDocument,
} from "@/utils/documentSecurity";
import { uploadKycDocumentToFirebase } from "@/utils/uploadDocument";
import { downloadRentalAgreementPdf } from "@/utils/pdfGenerator";
import { lookupExistingOccupant } from "@/utils/phoneLookup";
import { UnifiedPhotoUploadSlot } from "@/components/dashboard/UnifiedPhotoUploadSlot";
import { saveOccupantToFirestore } from "@/lib/firestoreService";

export default function OnboardTenantPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";
  const router = useRouter();

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Wizard Step State (1: Personal, 2: Bed Allocation, 3: KYC, 4: Agreement Preview)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State — Step 1: Personal Details
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");

  // Instant lookup match against occupantStore (APPLIES STRICTLY TO PRIMARY PHONE FIELD ONLY)
  const existingOccupantMatch = useMemo(() => {
    return lookupExistingOccupant(phone, propertyId);
  }, [phone, propertyId]);
  const [email, setEmail] = useState("");
  const [emergencyCountryCode, setEmergencyCountryCode] = useState("+91");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [address, setAddress] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [workplaceAddress, setWorkplaceAddress] = useState("");
  const [joiningDate, setJoiningDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [monthlyRent, setMonthlyRent] = useState<number>(12500);
  const [depositAmount, setDepositAmount] = useState<number>(25000);
  const [rentDueDate, setRentDueDate] = useState<string>("1st of month");

  // Form State — Step 2: Bed Allocation & Desired Sharing Filter (Defaults to 2 Sharing)
  const [desiredSharingFilter, setDesiredSharingFilter] = useState<number | "ALL">(2);
  const [selectedBed, setSelectedBed] = useState<{
    bedId: string;
    bedCode: string;
    roomNumber: string;
    floorName: string;
  } | null>(null);

  // Form State — Step 3: KYC Upload & Auto-Compression Documents (Capped PDF 1MB, Front/Back ID Images)
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [aadhaarUploaded, setAadhaarUploaded] = useState(false);
  const [idUploadMode, setIdUploadMode] = useState<"IMAGES" | "PDF">("IMAGES");
  const [photoDoc, setPhotoDoc] = useState<ProcessedDocument | null>(null);
  const [aadhaarDoc, setAadhaarDoc] = useState<ProcessedDocument | null>(null);
  const [aadhaarFrontDoc, setAadhaarFrontDoc] = useState<ProcessedDocument | null>(null);
  const [aadhaarBackDoc, setAadhaarBackDoc] = useState<ProcessedDocument | null>(null);

  // Live Firebase Storage URLs
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [aadhaarFrontUrl, setAadhaarFrontUrl] = useState<string>("");
  const [aadhaarBackUrl, setAadhaarBackUrl] = useState<string>("");
  const [isPhotoSaved, setIsPhotoSaved] = useState<boolean>(false);
  const [aadhaarUrl, setAadhaarUrl] = useState<string>("");
  const [isIdSaved, setIsIdSaved] = useState<boolean>(false);
  const [uploadingState, setUploadingState] = useState<{
    photo?: boolean;
    front?: boolean;
    back?: boolean;
    pdf?: boolean;
  }>({});

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Success Modal State (Step 5)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<Occupant | null>(null);

  // Reactive property structure state subscribed to propertyStore
  const [propertyStructure, setPropertyStructure] = useState<FloorConfig[]>(() =>
    typeof window !== "undefined" ? propertyStore.getStructure(propertyId) : []
  );

  // Reactive property settings state subscribed to propertySettingsStore
  const [settings, setSettings] = useState<PropertySettingsData>(() =>
    typeof window !== "undefined" ? propertySettingsStore.getSettings(propertyId) : CLEAN_ZERO_PROPERTY_SETTINGS
  );

  const getSharingRent = (sharingType: number): number => {
    const tiers = settings?.rentalTiers;
    if (sharingType === 1) return tiers?.sharing1 || 20000;
    if (sharingType === 2) return tiers?.sharing2 || 12000;
    if (sharingType === 3) return tiers?.sharing3 || 8500;
    if (sharingType === 4) return tiers?.sharing4 || 6000;
    return tiers?.sharing2 || 12000;
  };

  useEffect(() => {
    propertyStore.initFirebaseListener(propertyId);
    propertySettingsStore.initFirebaseListener(propertyId);
    setPropertyStructure(propertyStore.getStructure(propertyId));
    setSettings(propertySettingsStore.getSettings(propertyId));

    const unsubscribeProperty = propertyStore.subscribe(() => {
      setPropertyStructure(propertyStore.getStructure(propertyId));
    });
    const unsubscribeSettings = propertySettingsStore.subscribe(() => {
      setSettings(propertySettingsStore.getSettings(propertyId));
    });

    return () => {
      unsubscribeProperty();
      unsubscribeSettings();
    };
  }, [propertyId]);

  // Intelligent Floor Navigation Filter for Onboarding:
  // 1. Shows Available 🟢 & Vacating 🟧 beds (Hides Occupied & Booked beds)
  // 2. Filters dynamically based on desiredSharingFilter (e.g. 2 Sharing by default)
  const onboardingFloorNavigation = useMemo(() => {
    return propertyStructure
      .map((fl) => ({
        ...fl,
        rooms: fl.rooms
          .filter((rm) => {
            if (desiredSharingFilter === "ALL") return true;
            return Number(rm.sharingType) === Number(desiredSharingFilter);
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

    // Rule 3: Check if active resident with this phone already exists in this property
    if (existingOccupantMatch && existingOccupantMatch.lifecycleStatus !== "Past") {
      alert(`Cannot onboard: A resident with mobile number ${cleanPrimaryPhone} ("${existingOccupantMatch.name}" in Room ${existingOccupantMatch.roomNumber}) is already active in your property. Duplicate active resident mobile numbers are not permitted.`);
      return;
    }

    // Rule 4: Check if active resident with this name already exists in this property
    const allOccupants = occupantStore.getOccupants(propertyId) || [];
    const activeNameMatch = allOccupants.find(
      (o) => o.lifecycleStatus !== "Past" && o.name.toLowerCase().trim() === fullName.toLowerCase().trim()
    );
    if (activeNameMatch) {
      alert(`Cannot onboard: A resident with name "${fullName}" is already registered in Room ${activeNameMatch.roomNumber}. Duplicate active tenant names are not permitted.`);
      return;
    }

    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (!selectedBed) return;
    setCurrentStep(3);
  };

  const handleStep3Next = () => {
    setCurrentStep(4);
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
      if (docType === "aadhaar_pdf") setAadhaarDoc(proc);
      if (docType === "aadhaar_front") setAadhaarFrontDoc(proc);
      if (docType === "aadhaar_back") setAadhaarBackDoc(proc);

      // Step 2: Push to Live Firebase Storage Container
      const tempId = `occ-${Date.now()}`;
      const cloudUrl = await uploadKycDocumentToFirebase(
        propertyId,
        tempId,
        docType,
        proc.file,
        proc.fileName
      );

      if (docType === "photo") setPhotoUrl(cloudUrl);
      if (docType === "aadhaar_pdf" || docType === "aadhaar_front") setAadhaarUrl(cloudUrl);

      if (docType === "photo") setPhotoUploaded(true);
      if (docType === "aadhaar_pdf" || docType === "aadhaar_front" || docType === "aadhaar_back") {
        setAadhaarUploaded(true);
      }
    } catch (e: any) {
      alert(`Error uploading file to storage: ${e?.message || e}`);
    } finally {
      setUploadingState((prev) => ({ ...prev, [docType]: false }));
    }
  };

  // Final Action: Agree & Onboard Tenant
  const handleFinalSubmit = () => {
    const newId = `og-tenant-${Date.now()}`;
    const formattedJoiningDate = new Date(joiningDate).toLocaleDateString(
      "en-GB",
      { day: "2-digit", month: "short", year: "numeric" }
    );
    const fullPhoneNumber = `${countryCode} ${phone.trim()}`;
    const fullEmergencyPhone = emergencyPhone.trim()
      ? `${emergencyCountryCode} ${emergencyPhone.trim()}`
      : "+91 98000 11122";

    const isIdProvided = Boolean(aadhaarFrontUrl || aadhaarBackUrl || aadhaarFrontDoc || aadhaarBackDoc || aadhaarDoc);
    const isVerified = isIdProvided;
    const finalAadhaarNumber = isIdProvided ? "XXXX-XXXX-9012" : "Skipped";

    // Automatic Date Evaluation Engine (Onboarding Date vs Target Joining Date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetJoiningDate = joiningDate ? new Date(joiningDate) : today;
    targetJoiningDate.setHours(0, 0, 0, 0);
    const isFutureMoveIn = targetJoiningDate > today;

    const initialLifecycleStatus: "Active" | "Booked" = isFutureMoveIn ? "Booked" : "Active";
    const initialPaymentStatus: "Due" = "Due";

    const newTenant: Occupant = {
      id: newId,
      name: fullName.trim(),
      phone: fullPhoneNumber,
      email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      stayType: "Tenant",
      lifecycleStatus: initialLifecycleStatus,
      paymentStatus: initialPaymentStatus,
      daysDiff: isFutureMoveIn ? 0 : 30,
      daysRemainingText: isFutureMoveIn ? "Due on Check-In" : "DUE NOW",
      rentAmount: monthlyRent,
      dueDate: isFutureMoveIn ? formattedJoiningDate : formattedJoiningDate,
      dueDay: 1,
      lastPaidDate: isFutureMoveIn ? "Pending Check-In" : "Unpaid / Due Now",
      roomNumber: selectedBed ? selectedBed.roomNumber : "101",
      bedCode: selectedBed ? selectedBed.bedCode : "BED A",
      joiningDate: formattedJoiningDate,
      avatar: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
      kycVerified: isVerified,
      hasPdfAgreement: true,
      workplace: workplace.trim(),
      address: address.trim(),
      aadhaarNumber: finalAadhaarNumber,
      emergencyContact: {
        name: "Parent / Guardian",
        phone: fullEmergencyPhone,
        relation: "Family",
      },
      kycDocs: {
        idMode: idUploadMode,
        photoUrl: photoUrl || photoDoc?.previewUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
        aadhaarFrontUrl: aadhaarFrontDoc?.previewUrl || aadhaarUrl || undefined,
        aadhaarBackUrl: aadhaarBackDoc?.previewUrl || undefined,
        aadhaarPdfUrl: aadhaarDoc?.previewUrl || aadhaarUrl || undefined,
      },
      securityDeposit: depositAmount || 25000,
      depositStatus: "PENDING",
      partialPaidThisCycle: 0,
      arrearsBalance: 0,
      paymentHistory: [],
    };

    // Direct Cloud Firestore write & sync across all pages
    saveOccupantToFirestore(propertyId, newTenant);
    occupantStore.updateOccupants([newTenant, ...occupantStore.getOccupants(propertyId)], propertyId);

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
                  status: "Occupied" as const,
                  occupant: newTenant,
                };
              }),
            };
          }),
        };
      });

      propertyStore.updateStructure(updatedStructure, propertyId);
    }

    setCreatedTenant(newTenant);
    setShowSuccessModal(true);
  };

  return (
    <div className="flex min-h-screen bg-[#fcf9f8] text-gray-900 font-sans selection:bg-[#c2652a]/20 selection:text-[#c2652a]">
      {/* Left Sidebar */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area (100% Viewport Width w-full) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full">
        <PropertyHeader
          title="Tenant Onboarding"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Content Body */}
        <div className="p-4 md:p-8 space-y-6 flex-1 pb-28 w-full max-w-4xl mx-auto">
          {/* Top Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
            <Link
              href={`/p/${propertyId}/tenants`}
              className="hover:text-[#c2652a] flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Tenant Operations
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-bold">New Tenant Onboarding</span>
          </div>

          {/* Floating Toast Notification Banner */}
          {toastMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-700 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            </div>
          )}

          {/* Stepper Header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">
                  Onboard Long-term Tenant
                </h1>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">
                  Complete 4-step wizard to register tenant, assign bed, and generate agreement
                </p>
              </div>

              <span className="md:hidden text-xs font-bold text-[#c2652a] bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                Step {currentStep} of 4
              </span>
            </div>

            {/* Desktop 4-Step Stepper Bar */}
            <div className="hidden md:flex items-center justify-between pt-2">
              {[
                { step: 1, label: "1. Personal & Rent" },
                { step: 2, label: "2. Bed Allocation" },
                { step: 3, label: "3. KYC & Docs" },
                { step: 4, label: "4. Rental Agreement" },
              ].map((s) => {
                const isActive = currentStep === s.step;
                const isDone = currentStep > s.step;

                return (
                  <div
                    key={s.step}
                    className={`flex items-center gap-2 text-xs font-bold ${
                      isActive
                        ? "text-[#c2652a]"
                        : isDone
                        ? "text-emerald-700"
                        : "text-gray-400"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                        isActive
                          ? "bg-[#c2652a] text-white shadow-xs"
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

          {/* STEP 1: PERSONAL & FINANCIAL DETAILS */}
          {currentStep === 1 && (
            <form
              onSubmit={handleStep1Next}
              className="bg-white rounded-2xl border border-gray-200 p-5 md:p-8 shadow-xs space-y-6 animate-in fade-in"
            >
              <h2 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <User className="w-5 h-5 text-[#c2652a]" /> Personal & Contact Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Mehta"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a]"
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
                      className="w-16 px-2.5 py-3 rounded-xl border border-gray-300 font-mono font-bold text-center text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a] shrink-0 bg-gray-50"
                      title="Country Code (default +91)"
                    />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="flex-1 px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a]"
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

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="aarav.mehta@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a]"
                  />
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
                      className="w-16 px-2.5 py-3 rounded-xl border border-gray-300 font-mono font-bold text-center text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a] shrink-0 bg-gray-50"
                      title="Country Code (default +91)"
                    />
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="9812345678 (Parent/Guardian)"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="flex-1 px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a]"
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

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">
                    Permanent Address
                  </label>
                  <input
                    type="text"
                    placeholder="House No, Street, City, State, Pincode"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Workplace / College Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Infosys / IIT West"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Workplace Address
                  </label>
                  <input
                    type="text"
                    placeholder="Tech Park Phase 2"
                    value={workplaceAddress}
                    onChange={(e) => setWorkplaceAddress(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>
              </div>

              {/* Financial Terms Subsection */}
              <h2 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3 pt-4">
                <CreditCard className="w-5 h-5 text-[#c2652a]" /> Financial Terms & Joining Date
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Move-in Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Security Deposit (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md min-h-[48px]"
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
                      <Bed className="w-5 h-5 text-[#c2652a]" /> Select Bed for {fullName || "Tenant"}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                      Showing available 🟢 & vacating 🟧 beds across floor navigation (Occupied beds hidden)
                    </p>
                  </div>

                  {selectedBed && (
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-2xs shrink-0">
                      ✓ Selected: {selectedBed.floorName} Room {selectedBed.roomNumber} ({selectedBed.bedCode})
                    </span>
                  )}
                </div>

                {/* INTELLIGENT DESIRED ROOM SHARING FILTER (Defaults to 2 Sharing) */}
                <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-[#c2652a]" /> Filter by Desired Room Sharing:
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
                              ? "bg-[#c2652a] text-white shadow-xs"
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
                                <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-[9px] font-bold">
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
                                    onClick={() => {
                                      setSelectedBed({
                                        bedId: bed.id,
                                        bedCode: bed.bedCode,
                                        roomNumber: room.roomNumber,
                                        floorName: floor.floorName,
                                      });
                                      const autoRent = room.customRentAmount || getSharingRent(room.sharingType);
                                      setMonthlyRent(autoRent);
                                      setDepositAmount(settings.defaultSecurityDeposit || autoRent * 2);
                                    }}
                                    className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[60px] ${
                                      isSelected
                                        ? "bg-[#c2652a] text-white border-[#c2652a] ring-2 ring-[#c2652a]/30 shadow-md scale-[1.02]"
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

              {/* 💡 AUTO-FILLED EDITABLE MONTHLY RENT TARIFF INPUT */}
              {selectedBed && (
                <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-gray-900 text-xs flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#c2652a]" /> Monthly Rent Tariff for {selectedBed.roomNumber} ({selectedBed.bedCode}) *
                    </label>
                    <span className="text-[10px] bg-orange-100 text-[#c2652a] font-extrabold px-2.5 py-0.5 rounded-full">
                      ✓ Auto-filled from Room Config (Editable)
                    </span>
                  </div>
                  <input
                    type="number"
                    required
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 text-base md:text-sm focus:ring-1 focus:ring-[#c2652a] bg-white shadow-2xs"
                  />
                  <p className="text-[10px] text-gray-500 font-medium">
                    Owner Flexibility: You can edit or give a special discount to this tenant.
                  </p>
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
                  className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md min-h-[48px]"
                >
                  Proceed to KYC Upload <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: KYC & DOCUMENT UPLOAD WITH UNIFIED LIVE CAMERA + FILE UPLOADS */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-8 shadow-xs space-y-6 animate-in fade-in text-xs">
              <h2 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText className="w-5 h-5 text-[#c2652a]" /> Documents & Verification
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Tenant Profile Headshot Photo Card */}
                <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-4 text-center flex flex-col items-center justify-between">
                  <div className="space-y-1 w-full">
                    <div className="p-3 rounded-full bg-orange-100 text-[#c2652a] w-12 h-12 flex items-center justify-center mx-auto mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-gray-900">
                      Tenant Profile Photo
                    </h3>
                    <p className="text-gray-500 text-[11px]">
                      JPG, PNG (Max 10MB raw — Auto-compressed to ~300KB)
                    </p>
                  </div>

                  <div className="w-full">
                    <UnifiedPhotoUploadSlot
                      label="Tenant Profile Photo"
                      aspectRatio="headshot"
                      value={photoUrl || photoDoc?.previewUrl}
                      onChange={(base64) => {
                        setPhotoUrl(base64);
                        setIsPhotoSaved(true);
                        triggerToast("✓ Profile photo attached successfully!");
                      }}
                      onRemove={() => {
                        setPhotoUrl("");
                        setPhotoDoc(null);
                        setIsPhotoSaved(false);
                        triggerToast("Profile photo removed.");
                      }}
                    />
                  </div>
                </div>

                {/* 2. Aadhaar / Govt ID Card Section */}
                <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-4 text-center flex flex-col items-center justify-between">
                  <div className="space-y-1 w-full">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-700 w-12 h-12 flex items-center justify-center mx-auto mb-2">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-gray-900">
                      Aadhaar Card / Govt ID Proof
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
                          ? "bg-white text-blue-700 shadow-2xs"
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
                          ? "bg-white text-blue-700 shadow-2xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      📄 Single PDF (Max 1MB)
                    </button>
                  </div>

                  {/* MODE A: Front & Back Images (Stacked Vertically for Maximum Clarity) */}
                  {idUploadMode === "IMAGES" ? (
                    <div className="space-y-4 w-full pt-1 text-left">
                      {/* Front ID Photo Slot */}
                      <div className="space-y-1.5">
                        <label className="block font-bold text-gray-900 text-xs flex items-center gap-1.5">
                          💳 ID Card Front Photo *
                        </label>
                        <UnifiedPhotoUploadSlot
                          label="ID Card Front Photo"
                          aspectRatio="idcard"
                          value={aadhaarFrontUrl || aadhaarFrontDoc?.previewUrl}
                          onChange={(base64) => {
                            setAadhaarFrontUrl(base64);
                            setIsIdSaved(true);
                            triggerToast("✓ ID Card Front attached");
                          }}
                          onRemove={() => {
                            setAadhaarFrontUrl("");
                            setAadhaarFrontDoc(null);
                          }}
                        />
                      </div>

                      {/* Back ID Photo Slot */}
                      <div className="space-y-1.5">
                        <label className="block font-bold text-gray-900 text-xs flex items-center gap-1.5">
                          💳 ID Card Back Photo *
                        </label>
                        <UnifiedPhotoUploadSlot
                          label="ID Card Back Photo"
                          aspectRatio="idcard"
                          value={aadhaarBackUrl || aadhaarBackDoc?.previewUrl}
                          onChange={(base64) => {
                            setAadhaarBackUrl(base64);
                            setIsIdSaved(true);
                            triggerToast("✓ ID Card Back attached");
                          }}
                          onRemove={() => {
                            setAadhaarBackUrl("");
                            setAadhaarBackDoc(null);
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* MODE B: Single PDF Upload */
                    <div className="w-full">
                      <label className="cursor-pointer px-4 py-3 rounded-2xl bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 text-xs font-bold text-gray-800 flex items-center justify-center gap-2 shadow-2xs transition-all w-full">
                        <Upload className="w-4 h-4 text-blue-600" />
                        {aadhaarDoc ? `PDF: ${aadhaarDoc.fileName}` : "Upload Single PDF File"}
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload("aadhaar_pdf", file);
                              setIsIdSaved(true);
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}

                  {/* Section-level Indicator for Govt ID */}
                  {(aadhaarFrontUrl || aadhaarBackUrl || aadhaarFrontDoc || aadhaarBackDoc || aadhaarDoc) ? (
                    <div className="space-y-2 w-full pt-2 border-t border-gray-200/80">
                      <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs flex items-center justify-between animate-in fade-in">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Govt ID Attached 🟢
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1.5 animate-in fade-in">
                      <Info className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>💡 Optional: If left empty, completing onboarding automatically marks KYC as Pending 🟡</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-[#c2652a] shrink-0" />
                <span>
                  The system verifies individual upload steps above. Profiles reflect <strong>Verified 🟢</strong>, <strong>Partial KYC 🟡</strong>, or <strong>KYC Pending 🟡</strong> accordingly.
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

                <button
                  type="button"
                  onClick={handleStep3Next}
                  className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md min-h-[48px]"
                >
                  Proceed to Agreement Preview <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: RENTAL AGREEMENT PREVIEW & CONFIRMATION */}
          {currentStep === 4 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-8 shadow-xs space-y-6 animate-in fade-in text-xs">
              <h2 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText className="w-5 h-5 text-[#c2652a]" /> Rental Agreement Preview
              </h2>

              <div className="p-6 md:p-8 rounded-2xl border border-gray-300 bg-amber-50/30 space-y-4 font-mono text-[11px] leading-relaxed">
                <div className="text-center space-y-1 border-b border-gray-300 pb-4">
                  <h3 className="font-serif font-bold text-base text-gray-900">
                    RESIDENTIAL LEASE AGREEMENT
                  </h3>
                  <p className="text-[10px] text-gray-500 font-sans">
                    PROPERTY: SUNSHINE HEIGHTS PG • HYDERABAD
                  </p>
                </div>

                <div className="space-y-2">
                  <p>
                    <strong>TENANT NAME:</strong> {fullName || "Aarav Mehta"}
                  </p>
                  <p>
                    <strong>PHONE:</strong> {countryCode} {phone}
                  </p>
                  <p>
                    <strong>ALLOCATED ACCOMMODATION:</strong> {selectedBed?.floorName} — Room {selectedBed?.roomNumber} ({selectedBed?.bedCode})
                  </p>
                  <p>
                    <strong>MOVE-IN JOINING DATE:</strong> {joiningDate}
                  </p>
                  <p>
                    <strong>MONTHLY RENT:</strong> ₹{monthlyRent.toLocaleString("en-IN")} / month
                  </p>
                  <p>
                    <strong>SECURITY DEPOSIT:</strong> ₹{depositAmount.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="border-t border-gray-300 pt-3 text-[10px] text-gray-600 font-sans leading-normal">
                  By clicking <strong>Agree & Onboard Tenant</strong> below, the property owner confirms room allocation and generates the digital rental agreement record.
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 text-xs min-h-[48px]"
                >
                  ← Back to KYC
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all min-h-[48px]"
                >
                  <CheckCircle2 className="w-4 h-4" /> Agree & Onboard Tenant
                </button>
              </div>
            </div>
          )}
        </div>

        {/* STEP 5: CENTERED SUCCESS CONFETTI DIALOG */}
        {showSuccessModal && createdTenant && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-emerald-200 shadow-2xl max-w-md w-full p-8 text-center space-y-6 animate-in zoom-in-95">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner text-3xl">
                🎉
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-[10px] font-bold">
                  🟢 TENANT ONBOARDED
                </span>
                <h3 className="font-serif font-bold text-2xl text-gray-900 mt-2">
                  {createdTenant.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Successfully assigned to Room {createdTenant.roomNumber} ({createdTenant.bedCode})
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Monthly Rent</span>
                  <span className="font-mono font-bold text-[#c2652a]">
                    ₹{createdTenant.rentAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Joining Date</span>
                  <span className="font-semibold text-gray-900">
                    {createdTenant.joiningDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">KYC Status</span>
                  <span className="font-bold text-emerald-600">
                    {createdTenant.kycVerified ? "VERIFIED ✓" : "PENDING 🟡"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <Link
                  href={`/p/${propertyId}/tenants/${createdTenant.id}`}
                  className="w-full py-3.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
                >
                  View Tenant Profile <ArrowRight className="w-4 h-4" />
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
