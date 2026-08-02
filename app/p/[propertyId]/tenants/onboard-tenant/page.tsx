"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { MOCK_OCCUPANTS_200, Occupant } from "@/constants/mockOccupants";
import {
  propertyStore,
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
} from "lucide-react";

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

  // Form State — Step 2: Bed Allocation
  const [selectedBed, setSelectedBed] = useState<{
    bedId: string;
    bedCode: string;
    roomNumber: string;
    floorName: string;
  } | null>(null);

  // Form State — Step 3: KYC Upload
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [aadhaarUploaded, setAadhaarUploaded] = useState(false);

  // Success Modal State (Step 5)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<Occupant | null>(null);

  // Read available property beds from propertyStore (Filtered to Available 🟢 & Vacating 🟧 ONLY)
  const propertyStructure = useMemo(() => propertyStore.getStructure(), []);

  const availableBedsList = useMemo(() => {
    const list: Array<{
      floorName: string;
      roomNumber: string;
      sharingType: number;
      bed: BedSlotConfig;
    }> = [];

    propertyStructure.forEach((fl) => {
      fl.rooms.forEach((rm) => {
        rm.beds.forEach((bd) => {
          if (bd.status === "Available" || bd.status === "Vacating") {
            list.push({
              floorName: fl.floorName,
              roomNumber: rm.roomNumber,
              sharingType: rm.sharingType,
              bed: bd,
            });
          }
        });
      });
    });

    return list;
  }, [propertyStructure]);

  // Validation per step
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (!selectedBed) return;
    setCurrentStep(3);
  };

  const handleStep3Next = () => {
    setCurrentStep(4);
  };

  // Final Action: Agree & Onboard Tenant
  const handleFinalSubmit = () => {
    const newId = `occ-${Date.now()}`;
    const formattedJoiningDate = new Date(joiningDate).toLocaleDateString(
      "en-GB",
      { day: "2-digit", month: "short", year: "numeric" }
    );

    const newTenant: Occupant = {
      id: newId,
      name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      stayType: "Tenant",
      lifecycleStatus: "Active",
      paymentStatus: "Paid",
      daysDiff: 30,
      daysRemainingText: "—",
      rentAmount: monthlyRent,
      dueDate: "01 Sep 2026",
      dueDay: 1,
      lastPaidDate: formattedJoiningDate,
      roomNumber: selectedBed ? selectedBed.roomNumber : "101",
      bedCode: selectedBed ? selectedBed.bedCode : "BED A",
      joiningDate: formattedJoiningDate,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        fullName
      )}`,
      kycVerified: photoUploaded || aadhaarUploaded,
      hasPdfAgreement: true,
      workplace: workplace.trim(),
      address: address.trim(),
      aadhaarNumber: "XXXX-XXXX-9012",
      emergencyContact: {
        name: "Parent / Guardian",
        phone: emergencyPhone || "+91 98000 11122",
        relation: "Family",
      },
    };

    // Prepend to MOCK_OCCUPANTS_200
    MOCK_OCCUPANTS_200.unshift(newTenant);

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

      propertyStore.updateStructure(updatedStructure);
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

          {/* Stepper Header (Desktop & Mobile Compact Progress) */}
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

              {/* Mobile Compact Progress Counter */}
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

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Mobile Phone Number *
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
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex-1 px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a]"
                    />
                  </div>
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

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Emergency Contact Number
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
                      placeholder="98123 45678 (Parent / Guardian)"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="flex-1 px-3.5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a]"
                    />
                  </div>
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
                    Monthly Rent (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full px-3.5 py-3 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 text-base md:text-xs focus:ring-1 focus:ring-[#c2652a]"
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

          {/* STEP 2: SMART ROOM & BED ALLOCATION */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-8 shadow-xs space-y-6 animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-gray-100 pb-3">
                <div>
                  <h2 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2">
                    <Bed className="w-5 h-5 text-[#c2652a]" /> Select Bed for {fullName || "Tenant"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Showing available 🟢 & vacating 🟧 beds only (Occupied beds hidden as per PDS rules)
                  </p>
                </div>

                {selectedBed && (
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1.5">
                    Selected: {selectedBed.floorName} Room {selectedBed.roomNumber} ({selectedBed.bedCode})
                  </span>
                )}
              </div>

              {/* Bed Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {availableBedsList.map((item) => {
                  const isSelected =
                    selectedBed?.bedId === item.bed.id;

                  return (
                    <button
                      type="button"
                      key={item.bed.id}
                      onClick={() =>
                        setSelectedBed({
                          bedId: item.bed.id,
                          bedCode: item.bed.bedCode,
                          roomNumber: item.roomNumber,
                          floorName: item.floorName,
                        })
                      }
                      className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer min-h-[70px] ${
                        isSelected
                          ? "bg-orange-50 border-[#c2652a] ring-2 ring-[#c2652a]/20 shadow-sm"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-sm text-gray-900">
                          {item.floorName} • Room {item.roomNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.bed.status === "Vacating"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {item.bed.status === "Vacating"
                            ? `Vacating ${item.bed.vacatingDate || "15 Aug"}`
                            : "Available"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold text-gray-800 text-xs">
                          🛏️ {item.bed.bedCode} ({item.sharingType} Sharing)
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "bg-[#c2652a] border-[#c2652a] text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

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

          {/* STEP 3: KYC & DOCUMENT UPLOAD */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-8 shadow-xs space-y-6 animate-in fade-in text-xs">
              <h2 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText className="w-5 h-5 text-[#c2652a]" /> Documents & Verification
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Photo Card */}
                <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-3 text-center flex flex-col items-center justify-center">
                  <div className="p-3 rounded-full bg-orange-100 text-[#c2652a]">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">
                      Tenant Profile Photo
                    </h3>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      Upload recent headshot or capture from camera
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPhotoUploaded(!photoUploaded)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      photoUploaded
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-100"
                    }`}
                  >
                    {photoUploaded ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Photo Uploaded ✓
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" /> Upload Photo
                      </>
                    )}
                  </button>
                </div>

                {/* Aadhaar Card */}
                <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-3 text-center flex flex-col items-center justify-center">
                  <div className="p-3 rounded-full bg-blue-100 text-blue-700">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">
                      Aadhaar Card / Govt ID
                    </h3>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      PDF Document or Front & Back Image
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAadhaarUploaded(!aadhaarUploaded)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      aadhaarUploaded
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-100"
                    }`}
                  >
                    {aadhaarUploaded ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Aadhaar Verified ✓
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" /> Upload Aadhaar
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-[#c2652a] shrink-0" />
                <span>
                  Uploading documents is optional. You can click <strong>Skip & Proceed</strong> to upload later.
                </span>
              </div>

              <div className="flex justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 text-xs min-h-[48px]"
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

              {/* Simulated Printable Legal Agreement Document */}
              <div className="p-6 md:p-8 rounded-2xl border border-gray-300 bg-amber-50/30 space-y-4 font-mono text-[11px] leading-relaxed">
                <div className="text-center space-y-1 border-b border-gray-300 pb-4">
                  <h3 className="font-serif font-bold text-base text-gray-900">
                    RESIDENTIAL LEASE AGREEMENT
                  </h3>
                  <p className="text-[10px] text-gray-500 font-sans">
                    PROPERTY: SUNSHINE HEIGHTS PG • WEST SAHARA
                  </p>
                </div>

                <div className="space-y-2">
                  <p>
                    <strong>TENANT NAME:</strong> {fullName || "Aarav Mehta"}
                  </p>
                  <p>
                    <strong>PHONE:</strong> {phone || "+91 98765 43210"}
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
