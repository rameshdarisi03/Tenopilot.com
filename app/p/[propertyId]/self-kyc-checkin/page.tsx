"use client";

import { use, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
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
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";

export default function WalkInSelfKycCheckinPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

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
  const [signatureName, setSignatureName] = useState("");
  const [residentAgreedToTerms, setResidentAgreedToTerms] = useState(false);
  const [highlightResidentTerms, setHighlightResidentTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selfieInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Real-time synchronization of property layout
  useEffect(() => {
    propertyStore.initFirebaseListener(propertyId);
    setStructure(propertyStore.getStructure(propertyId));
    const unsubscribe = propertyStore.subscribe(() => {
      setStructure(propertyStore.getStructure(propertyId));
    });
    return unsubscribe;
  }, [propertyId]);

  const propertySettings = propertySettingsStore.getSettings(propertyId);
  const propertyName = propertySettings?.propertyName || "Ramesh Residencies";

  // Filter all Available beds across floors and rooms
  const availableBeds = useMemo(() => {
    const list: {
      floorName: string;
      roomNumber: string;
      roomType: string;
      bed: BedSlotConfig;
      monthlyRent: number;
      dailyRate: number;
    }[] = [];

    structure.forEach((floor) => {
      floor.rooms.forEach((room) => {
        room.beds.forEach((b) => {
          if (b.status === "Available") {
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
            list.push({
              floorName: floor.floorName,
              roomNumber: room.roomNumber,
              roomType,
              bed: b,
              monthlyRent,
              dailyRate,
            });
          }
        });
      });
    });

    return list;
  }, [structure]);

  // Handle Bed selection
  const handleSelectBed = (roomNumber: string, bedCode: string, tariff: number) => {
    setSelectedRoomNumber(roomNumber);
    setSelectedBedCode(bedCode);
    setSelectedBedTariff(tariff);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setter(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitWalkInKYC = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!residentAgreedToTerms) {
      setHighlightResidentTerms(true);
      setErrorMessage("Please review and agree to the house rules and terms to proceed.");
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full legal name.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    const cleanEmergency = emergencyPhone.replace(/\D/g, "");
    if (cleanEmergency.length < 10) {
      setErrorMessage("Please enter a valid 10-digit emergency contact phone number.");
      return;
    }

    if (stayType === "Guest" && !guestCheckoutDate) {
      setErrorMessage("Please specify your expected checkout date.");
      return;
    }

    setSubmitting(true);
    try {
      const cleanVehicles = vehicleNumbers.map((v) => v.trim().toUpperCase()).filter(Boolean);
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
        name: fullName.trim(),
        phone: cleanPhone,
        countryCode: "+91",
        email: email.trim() || undefined,
        emergencyContact: {
          name: emergencyName.trim() || "Emergency Contact",
          phone: cleanEmergency,
        },
        workplace: workplace.trim() || undefined,
        purposeOfVisit: stayType === "Guest" ? purposeOfVisit.trim() : undefined,
        vehicleNumbers: cleanVehicles.length > 0 ? cleanVehicles : undefined,
        photoUrl: selfiePhoto || undefined,
        aadhaarNumber: aadhaarNumber.trim() || undefined,
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
      {/* Brand Header */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between pb-6 border-b border-gray-200">
        <TenoPilotLogo size="sm" />
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-2xs">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Reception Desk Check-In</span>
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
        {/* STEP 2: AVAILABLE BEDS SELECTION                                          */}
        {/* ========================================================================= */}
        {step === "BED_SELECT" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
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
                  Showing beds ready for immediate check-in today for {propertyName}
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                {availableBeds.length} Beds Available
              </span>
            </div>

            {availableBeds.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-gray-800">No Beds Available Right Now</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  All rooms are currently occupied or on hold. Please contact the front desk manager for waitlist or upcoming checkouts.
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
                      key={idx}
                      onClick={() => handleSelectBed(item.roomNumber, item.bed.bedCode, item.monthlyRent)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "border-[#c2652a] bg-orange-50/50 shadow-md ring-2 ring-[#c2652a]/20"
                          : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isSelected
                              ? "bg-[#c2652a] text-white"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          <BedIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-base text-gray-900">
                              Room {item.roomNumber} ({item.bed.bedCode})
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

                      <div className="text-right">
                        <span className="font-mono font-bold text-base sm:text-lg text-emerald-700 block">
                          ₹{price.toLocaleString("en-IN")}{" "}
                          <span className="text-xs text-gray-500 font-sans font-normal">{unitText}</span>
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-[#c2652a] flex items-center justify-end gap-1">
                            <Check className="w-3 h-3" /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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

                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    {stayType === "Tenant" ? "Monthly Rent" : "Daily Rate"}
                  </span>
                  <span className="font-mono font-bold text-base sm:text-lg text-emerald-700 block">
                    ₹{selectedBedTariff.toLocaleString("en-IN")}
                  </span>
                </div>

                {stayType === "Tenant" && (
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Security Deposit</span>
                    <span className="font-mono font-bold text-base sm:text-lg text-purple-700 block">
                      ₹{(selectedBedTariff * 2).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
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
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (!signatureName) setSignatureName(e.target.value);
                    }}
                    placeholder="As shown on Aadhaar card"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mobile Phone Number *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-mono font-bold text-xs">+91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="For receipts and notifications"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                  />
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
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="10-digit emergency phone number *"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 text-xs focus:ring-1 focus:ring-[#c2652a] bg-white"
                    />
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Contact Name (optional)"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 font-medium text-gray-900 text-xs focus:ring-1 focus:ring-[#c2652a] bg-white"
                    />
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
                  <label className="block font-bold text-gray-700 mb-1">
                    Electronic Signature (Type Your Full Legal Name) *
                  </label>
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
              disabled={submitting}
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
                <span className="font-mono font-bold text-emerald-700">
                  ₹{selectedBedTariff.toLocaleString("en-IN")}{" "}
                  {stayType === "Tenant" ? "/ month" : "/ day"}
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
              You can now show this screen to the reception desk manager. Welcome to TenoPilot!
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
