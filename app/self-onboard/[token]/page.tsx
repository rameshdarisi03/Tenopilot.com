"use client";

import { use, useState, useEffect, useRef } from "react";
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
  FileCheck,
  Sparkles,
  Lock,
  ArrowRight,
} from "lucide-react";
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";
import { fireCelebrationConfetti } from "@/components/motion/ConfettiBurst";

export default function TenantSelfOnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.token || "sunshine-pg";

  const [step, setStep] = useState<"SEARCH" | "VERIFY" | "DOCS" | "SUCCESS">("SEARCH");
  const [occupants, setOccupants] = useState<Occupant[]>(() => occupantStore.getOccupants(propertyId));

  const [searchPhone, setSearchPhone] = useState("");
  const [matchedOccupant, setMatchedOccupant] = useState<Occupant | null>(null);

  // Tenant editable form
  const [email, setEmail] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");

  // Document uploads
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState("");

  const selfieInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOccupants(occupantStore.getOccupants(propertyId));
    const unsubscribe = occupantStore.subscribe(() => {
      setOccupants(occupantStore.getOccupants(propertyId));
    });
    return unsubscribe;
  }, [propertyId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = searchPhone.replace(/\D/g, "").slice(-10);
    const found = occupants.find((o) => o.phone.replace(/\D/g, "").includes(cleanQuery) || o.name.toLowerCase().includes(searchPhone.toLowerCase().trim()));

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setter(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitKYC = async () => {
    if (!matchedOccupant) return;

    // Update occupant in store
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
      <header className="max-w-xl w-full mx-auto flex items-center justify-between pb-6 border-b border-gray-200">
        <TenoPilotLogo size="sm" />
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-2xs">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>256-Bit Encrypted KYC</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl w-full mx-auto my-6 flex-1">
        {/* STEP 1: RESIDENT LOOKUP */}
        {step === "SEARCH" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-orange-100 text-[#c2652a] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <User className="w-7 h-7" />
              </div>
              <h1 className="font-serif font-bold text-2xl text-gray-900">Resident Self-Verification</h1>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Welcome to your new digital PG experience! Enter your 10-digit mobile number to access your room details.
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

        {/* STEP 2: VERIFY DETAILS */}
        {step === "VERIFY" && matchedOccupant && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-[#c2652a] tracking-wider">Step 1 of 2</span>
              <h2 className="font-serif font-bold text-xl text-gray-900">Verify Your Information</h2>
              <p className="text-xs text-gray-500">Confirm your room allocation and contact details</p>
            </div>

            {/* Room Card Summary */}
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

        {/* STEP 3: DOCUMENT UPLOAD & SELFIE */}
        {step === "DOCS" && (
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
                className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Verification & Complete</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === "SUCCESS" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm text-center space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="font-serif font-bold text-2xl text-gray-900">Verification Submitted!</h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Thank you, {matchedOccupant?.name}! Your Aadhaar KYC and profile details have been verified and linked to your room.
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-left text-xs space-y-1.5">
              <p className="font-bold text-gray-800">Your Stay Summary:</p>
              <p className="text-gray-600">🏢 Room: {matchedOccupant?.roomNumber} ({matchedOccupant?.bedCode})</p>
              <p className="text-gray-600">💰 Monthly Rent: ₹{matchedOccupant?.rentAmount.toLocaleString("en-IN")}</p>
              <p className="text-emerald-700 font-bold">🛡️ Status: Verified Resident</p>
            </div>

            <p className="text-[11px] text-gray-400">You can now close this tab. Welcome to the TenoPilot community!</p>
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
