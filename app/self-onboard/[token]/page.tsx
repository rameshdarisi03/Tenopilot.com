"use client";

import { use, useState, useEffect, useRef } from "react";
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
  FileCheck,
  Building2,
  Bed,
  Clock,
  KeyRound,
} from "lucide-react";
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { selfKycStore, SelfKycInvite, SelfKycSubmission } from "@/lib/selfKycStore";
import { propertySettingsStore } from "@/constants/propertySettings";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";
import {
  sanitizePlainText,
  sanitizeDigitsOnly,
  sanitizeEmailAddress,
  sanitizeVehicleNumber,
  validateBase64Attachment,
} from "@/utils/security";

export default function TenantSelfOnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams?.token || "";

  // Check if token corresponds to a SelfKycInvite
  const [invite, setInvite] = useState<SelfKycInvite | null>(null);
  const [invitePropertyId, setInvitePropertyId] = useState<string>("");
  const [loadingInvite, setLoadingInvite] = useState(true);

  // Fallback propertyId for backward compatible search mode
  const propertyId = invitePropertyId || token || "sunshine-pg";

  // Step state: for Invite: "INVITE_FORM" -> "SUCCESS"
  // For Search fallback: "SEARCH" -> "VERIFY" -> "DOCS" -> "SUCCESS"
  const [step, setStep] = useState<
    "LOADING" | "INVITE_FORM" | "SEARCH" | "VERIFY" | "DOCS" | "SUCCESS"
  >("LOADING");
  const [occupants, setOccupants] = useState<Occupant[]>(() => occupantStore.getOccupants(propertyId));

  // Search state (backward-compatible fallback)
  const [searchPhone, setSearchPhone] = useState("");
  const [matchedOccupant, setMatchedOccupant] = useState<Occupant | null>(null);

  // Form Fields
  const [candidateName, setCandidateName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [workplace, setWorkplace] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [vehicleNumbers, setVehicleNumbers] = useState<string[]>([""]);

  // Guest specific fields
  const [guestCheckoutDate, setGuestCheckoutDate] = useState("");
  const [purposeOfVisit, setPurposeOfVisit] = useState("");

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

  // 1. Resolve token on mount (asynchronously from local cache or Firestore)
  useEffect(() => {
    async function resolveToken() {
      setLoadingInvite(true);
      try {
        const result = await selfKycStore.fetchInviteAsync(token);
        if (result?.invite) {
          setInvite(result.invite);
          setInvitePropertyId(result.propertyId || result.invite.propertyId);
          setCandidateName(result.invite.candidateName);
          setPhone(result.invite.candidatePhone);
          setEmail(result.invite.candidateEmail || "");
          setSignatureName(result.invite.candidateName);
          setStep("INVITE_FORM");
        } else {
          setStep("SEARCH");
        }
      } catch (e) {
        console.warn("Token resolution error:", e);
        setStep("SEARCH");
      } finally {
        setLoadingInvite(false);
      }
    }
    resolveToken();
  }, [token]);

  // Sync occupants for fallback search mode
  useEffect(() => {
    if (step === "SEARCH" || step === "VERIFY" || step === "DOCS") {
      setOccupants(occupantStore.getOccupants(propertyId));
      const unsubscribe = occupantStore.subscribe(() => {
        setOccupants(occupantStore.getOccupants(propertyId));
      });
      return unsubscribe;
    }
  }, [propertyId, step]);

  const propertySettings = propertySettingsStore.getSettings(invitePropertyId || propertyId);
  const propertyName = propertySettings?.propertyName || "Ramesh Residencies";



  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = searchPhone.replace(/\D/g, "").slice(-10);
    const found = occupants.find(
      (o) =>
        o.phone.replace(/\D/g, "").includes(cleanQuery) ||
        o.name.toLowerCase().includes(searchPhone.toLowerCase().trim())
    );

    if (found) {
      setMatchedOccupant(found);
      setEmail(found.email || "");
      setWorkplace(found.workplace || "");
      setEmergencyPhone(found.emergencyContact?.phone || "");
      setAadhaarNumber(found.aadhaarNumber || "");
      setSignatureName(found.name);
      setStep("VERIFY");
    } else {
      alert("No resident found matching this phone number. Please check the digits or contact your PG manager.");
    }
  };

  // Strictly validated and sanitized file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please upload a smaller image or compressed PDF.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Unsupported file format. Please upload JPG, PNG, WebP or PDF documents only.");
      return;
    }

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
  };

  // Submit from Owner Invite
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
      setErrorMessage("Emergency contact phone number cannot be the same as your own mobile number.");
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
        propertyId: invitePropertyId || invite.propertyId,
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

  // Fallback KYC submit for existing occupant search
  const handleSubmitKYC = async () => {
    if (!matchedOccupant) return;

    if (!residentAgreedToTerms) {
      setHighlightResidentTerms(true);
      return;
    }
    setHighlightResidentTerms(false);

    const updated: Occupant = {
      ...matchedOccupant,
      email: email || matchedOccupant.email,
      workplace: workplace || "Private Sector",
      aadhaarNumber: aadhaarNumber || "XXXX-XXXX-8921",
      emergencyContact: {
        ...matchedOccupant.emergencyContact,
        phone: emergencyPhone || matchedOccupant.phone,
      },
      kycVerified: true,
      kycDocs: {
        idMode: "IMAGES",
        photoUrl: selfiePhoto || matchedOccupant.avatar,
        aadhaarFrontUrl: aadhaarFront || undefined,
        aadhaarBackUrl: aadhaarBack || undefined,
      },
    };

    await occupantStore.updateOccupant(updated, propertyId);
    setStep("SUCCESS");
    fireCelebrationConfetti();
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

            {/* Pre-Locked Room & Tariff Card (ZERO BANK DETAILS EXPOSED) */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <Home className="w-4 h-4 text-[#c2652a]" />
                  <span>Reserved Accommodation Details</span>
                </div>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Status: ON HOLD 🔒
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Room & Bed</span>
                  <span className="font-serif font-bold text-base sm:text-lg text-gray-900 block">
                    Room {invite.roomNumber} ({invite.bedCode})
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    {invite.stayType === "Tenant" ? "Monthly Tariff" : "Daily Rate"}
                  </span>
                  <span className="font-mono font-bold text-base sm:text-lg text-emerald-700 block">
                    ₹{invite.rentAmount.toLocaleString("en-IN")}
                  </span>
                </div>

                {invite.stayType === "Tenant" && (
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block">Security Deposit</span>
                    <span className="font-mono font-bold text-base sm:text-lg text-purple-700 block">
                      ₹{(invite.securityDeposit ?? invite.rentAmount * 2).toLocaleString("en-IN")}
                    </span>
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
                    value={`+91 ${invite.candidatePhone}`}
                    className="w-full px-3.5 py-2.5 bg-gray-100 rounded-xl border border-gray-200 font-mono font-bold text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="For monthly rent invoices & notices"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-900 focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a]"
                  />
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

                {/* Emergency Contact Number (No relation required per rule) */}
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
                      placeholder="10-digit phone number *"
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
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-base transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Verification to Reception Desk...</span>
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
        {/* CASE 2: SUCCESS STATE                                                     */}
        {/* ========================================================================= */}
        {step === "SUCCESS" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-10 shadow-sm text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-11 h-11" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Self-KYC Submitted Successfully
              </span>
              <h2 className="font-serif font-bold text-2xl sm:text-3xl text-gray-900">
                Verification in Review!
              </h2>
              <p className="text-xs text-gray-600 max-w-md mx-auto">
                Thank you, <span className="font-bold text-gray-900">{candidateName || matchedOccupant?.name}</span>! Your digital KYC documents and resident profile have been sent to the reception desk of <span className="font-bold">{propertyName}</span>.
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
                  Room {invite?.roomNumber || matchedOccupant?.roomNumber} ({invite?.bedCode || matchedOccupant?.bedCode})
                </span>
              </p>
              <p className="text-gray-700 flex items-center justify-between">
                <span>💰 Monthly Rent:</span>
                <span className="font-mono font-bold text-emerald-700">
                  ₹{(invite?.rentAmount || matchedOccupant?.rentAmount || 0).toLocaleString("en-IN")}
                </span>
              </p>
              <p className="text-gray-700 flex items-center justify-between">
                <span>📅 Check-in Date:</span>
                <span className="font-mono font-bold text-gray-900">
                  {joiningDate || matchedOccupant?.joiningDate}
                </span>
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600 text-left space-y-1">
              <p className="font-bold text-gray-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#c2652a]" /> What happens next?
              </p>
              <p className="text-[11px] text-gray-500">
                The property manager will verify your Aadhaar document and photo. Once approved, your bed status will transition to active and you will receive your rent receipt on WhatsApp.
              </p>
            </div>

            <p className="text-[11px] text-gray-400">
              You can now safely close this browser window. Welcome to TenoPilot!
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 3: BACKWARD COMPATIBLE SEARCH / DIRECT LOOKUP FALLBACK               */}
        {/* ========================================================================= */}
        {!loadingInvite && step === "SEARCH" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-orange-100 text-[#c2652a] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <User className="w-7 h-7" />
              </div>
              <h1 className="font-serif font-bold text-2xl text-gray-900">Resident Self-Verification</h1>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Welcome to {propertyName}! Enter your 10-digit mobile number to access your room details and submit verification.
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Your 10-Digit Mobile Number *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-gray-400 font-mono text-sm font-bold">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    placeholder="98765 43210"
                    className="w-full pl-14 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 text-sm focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold text-sm transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Find My Room & Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: VERIFY DETAILS (FALLBACK) */}
        {!loadingInvite && step === "VERIFY" && matchedOccupant && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-[#c2652a] tracking-wider">Step 1 of 2</span>
              <h2 className="font-serif font-bold text-xl text-gray-900">Verify Your Information</h2>
              <p className="text-xs text-gray-500">Confirm your room allocation and contact details</p>
            </div>

            <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-[#c2652a]">Allocated Room & Bed</p>
                <p className="font-serif font-bold text-lg text-gray-900">
                  Room {matchedOccupant.roomNumber} ({matchedOccupant.bedCode})
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-gray-500">Monthly Rent</p>
                <p className="font-mono font-bold text-lg text-emerald-700">₹{matchedOccupant.rentAmount.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={matchedOccupant.name}
                  className="w-full px-3.5 py-2.5 bg-gray-100 rounded-xl border border-gray-200 font-semibold text-gray-700"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Workplace / College</label>
                <input
                  type="text"
                  value={workplace}
                  onChange={(e) => setWorkplace(e.target.value)}
                  placeholder="e.g. TCS / Infosys / University"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Emergency Contact Phone Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="Parents / Guardian Phone"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                />
              </div>
            </div>

            <button
              onClick={() => setStep("DOCS")}
              className="w-full py-3.5 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold text-sm transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue to Aadhaar Upload</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 3: DOCUMENT UPLOAD & SELFIE (FALLBACK) */}
        {!loadingInvite && step === "DOCS" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-[#c2652a] tracking-wider">Step 2 of 2</span>
              <h2 className="font-serif font-bold text-xl text-gray-900">Upload ID & Selfie</h2>
              <p className="text-xs text-gray-500">Government compliant digital verification</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Aadhaar Number (Last 4 digits)</label>
                <input
                  type="text"
                  maxLength={14}
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  placeholder="XXXX-XXXX-1234"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-gray-900 text-sm focus:ring-1 focus:ring-[#c2652a]"
                />
              </div>

              {/* Selfie Camera Capture */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-purple-600" /> Selfie Photo
                  </span>
                  {selfiePhoto && <span className="text-[10px] font-bold text-emerald-600">✓ Uploaded</span>}
                </div>
                <input
                  type="file"
                  ref={selfieInputRef}
                  accept="image/*"
                  capture="user"
                  onChange={(e) => handleFileUpload(e, setSelfiePhoto)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => selfieInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  {selfiePhoto ? "Retake Selfie" : "Take Live Selfie with Camera"}
                </button>
              </div>

              {/* Aadhaar Front & Back */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <span className="text-xs font-bold text-gray-800 block">Aadhaar Front Photo</span>
                  <input
                    type="file"
                    ref={frontInputRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setAadhaarFront)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => frontInputRef.current?.click()}
                    className="w-full py-2 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {aadhaarFront ? "✓ Uploaded" : "Upload Front"}
                  </button>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <span className="text-xs font-bold text-gray-800 block">Aadhaar Back Photo</span>
                  <input
                    type="file"
                    ref={backInputRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setAadhaarBack)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => backInputRef.current?.click()}
                    className="w-full py-2 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {aadhaarBack ? "✓ Uploaded" : "Upload Back"}
                  </button>
                </div>
              </div>

              {/* Digital Signature Confirmation */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Electronic Signature (Type Full Name)</label>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-serif font-bold text-gray-900 text-sm focus:ring-1 focus:ring-[#c2652a]"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  By submitting, I confirm that all provided details and identity documents are authentic.
                </p>
              </div>

              {/* Terms of Service & Privacy Policy Consent Checkbox */}
              <div
                className={`pt-2 p-3.5 rounded-xl border transition-all ${
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
                      highlightResidentTerms ? "border-rose-400 ring-2 ring-rose-300" : "border-gray-300 text-emerald-600 focus:ring-emerald-600"
                    }`}
                  />
                  <span>
                    I confirm my residency details, agree to the{" "}
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("VERIFY")}
                className="px-4 py-3 rounded-xl border border-gray-200 font-bold text-xs text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmitKYC}
                className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Verification & Complete</span>
              </button>
            </div>
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
