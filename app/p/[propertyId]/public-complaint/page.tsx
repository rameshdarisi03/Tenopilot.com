"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { propertyStore, FloorConfig } from "@/constants/propertyLayoutStore";
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { createComplaintInFirestore, Complaint } from "@/lib/complaintStore";
import {
  Wrench,
  Zap,
  Wifi,
  Sparkles,
  Snowflake,
  ShieldCheck,
  Bug,
  HelpCircle,
  CheckCircle2,
  Phone,
  User,
  Home,
  Upload,
  ArrowRight,
  Shield,
  FileText,
  AlertTriangle,
  XCircle,
  Lock,
} from "lucide-react";

export default function PublicTenantComplaintPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  // Real-time Property Map Structure for Room Sync
  const [floors, setFloors] = useState<FloorConfig[]>([]);
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Form Input States
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [category, setCategory] = useState("Plumbing");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  // Mobile Verification State
  const [verifiedOccupant, setVerifiedOccupant] = useState<Occupant | null>(null);
  const [mobileError, setMobileError] = useState(false);

  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<Complaint | null>(null);

  const categoriesList = [
    { name: "Plumbing", icon: Wrench, color: "bg-blue-50 text-blue-700 border-blue-200" },
    { name: "Electrical", icon: Zap, color: "bg-amber-50 text-amber-700 border-amber-200" },
    { name: "Wi-Fi & Net", icon: Wifi, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    { name: "Housekeeping", icon: Sparkles, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { name: "Appliance / AC", icon: Snowflake, color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    { name: "Pest Control", icon: Bug, color: "bg-purple-50 text-purple-700 border-purple-200" },
    { name: "Security & Locks", icon: ShieldCheck, color: "bg-rose-50 text-rose-700 border-rose-200" },
    { name: "Other / Noise", icon: HelpCircle, color: "bg-gray-100 text-gray-700 border-gray-200" },
  ];

  useEffect(() => {
    setIsMounted(true);
    setFloors(propertyStore.getStructure());
    setOccupants(occupantStore.getOccupants());

    // Subscribe to real-time property map layout updates
    const unsubscribe = propertyStore.subscribe(() => {
      setFloors(propertyStore.getStructure());
      setOccupants(occupantStore.getOccupants());
    });

    return () => unsubscribe();
  }, []);

  // Extract all rooms across floors into flat list
  const allRoomsList = floors.flatMap((f) =>
    f.rooms.map((r) => ({
      floorName: f.floorName,
      roomNumber: `Room ${r.roomNumber}`,
    }))
  );

  // Real-time Database Mobile Verification Handler
  const handlePhoneChange = (inputPhone: string) => {
    setTenantPhone(inputPhone);
    const cleanDigits = inputPhone.replace(/\D/g, "");

    if (cleanDigits.length >= 10) {
      // Search active database for matching phone number
      const matched = occupants.find((o) => {
        const occPhoneClean = o.phone.replace(/\D/g, "");
        return (
          occPhoneClean.includes(cleanDigits) ||
          cleanDigits.includes(occPhoneClean)
        );
      });

      if (matched) {
        setVerifiedOccupant(matched);
        setTenantName(matched.name);
        setRoomNumber(matched.roomNumber);
        setMobileError(false);
      } else {
        // Fallback search mock demo check for default sample mobile (e.g. 9876543210)
        if (cleanDigits === "9876543210") {
          const sampleMatch: Occupant = {
            id: "occ-987",
            name: "Rohan Gupta",
            phone: "9876543210",
            email: "rohan@gmail.com",
            roomNumber: "Room 302",
            bedCode: "B",
            stayType: "Tenant",
            joiningDate: "01 Jan 2026",
            lastPaidDate: "01 Jul 2026",
            dueDate: "01 Aug 2026",
            dueDay: 1,
            daysRemainingText: "Paid",
            daysDiff: 10,
            rentAmount: 12000,
            paymentStatus: "Paid",
            lifecycleStatus: "Active",
            aadhaarNumber: "123456789012",
            avatar: "",
            emergencyContact: { name: "", phone: "", relation: "" },
          };
          setVerifiedOccupant(sampleMatch);
          setTenantName(sampleMatch.name);
          setRoomNumber(sampleMatch.roomNumber);
          setMobileError(false);
        } else {
          setVerifiedOccupant(null);
          setMobileError(true);
        }
      }
    } else {
      setVerifiedOccupant(null);
      setMobileError(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedOccupant || !tenantName || !tenantPhone || !roomNumber || !title || !description) return;

    setSubmitting(true);

    try {
      const created = await createComplaintInFirestore(propertyId, {
        tenantName,
        tenantPhone,
        roomNumber,
        category,
        title,
        description,
        photoUrl: photoUrl || undefined,
      });

      setSubmittedTicket(created);
    } catch (err) {
      console.error("Complaint creation error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedTicket(null);
    setTitle("");
    setDescription("");
    setPhotoUrl("");
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-gray-900 font-sans selection:bg-orange-100 selection:text-[#c2652a] pb-12">
      {/* Top Header Banner */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c2652a] text-white flex items-center justify-center font-serif font-bold text-xl shadow-xs">
              T
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg text-gray-900 tracking-tight flex items-center gap-1.5">
                Sahara PG Resident Portal
              </h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Protected Resident Maintenance Portal
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-700" /> Database Verified
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {submittedTicket ? (
          /* SUCCESS TICKET CONFIRMATION VIEW */
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="bg-orange-50 text-[#c2652a] border border-orange-200 px-3 py-1 rounded-full font-mono font-bold text-xs">
                Reference ID: {submittedTicket.complaintNumber}
              </span>
              <h2 className="font-serif font-bold text-2xl text-gray-900 mt-3">
                Complaint Logged Successfully!
              </h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Your maintenance request has been submitted directly to Sahara PG Caretaker & Management desk.
              </p>
            </div>

            {/* Ticket Summary Card */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 font-bold">Verified Resident:</span>
                <span className="font-bold text-gray-900">{submittedTicket.tenantName} ({submittedTicket.tenantPhone})</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 font-bold">Room Location:</span>
                <span className="font-bold text-[#c2652a]">{submittedTicket.roomNumber}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 font-bold">Category:</span>
                <span className="font-bold text-gray-900">{submittedTicket.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Issue Title:</span>
                <span className="font-bold text-gray-900">{submittedTicket.title}</span>
              </div>
            </div>

            {/* Status Progress Tracker */}
            <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200 text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                <span>Live Ticket Status</span>
                <span className="text-[#c2652a] uppercase text-[10px]">🔴 OPEN / PENDING REVIEW</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#c2652a] rounded-full w-1/4 animate-pulse"></div>
              </div>
              <p className="text-[10px] text-gray-500 italic">
                Caretaker will review this ticket and initiate servicing shortly.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-3 rounded-2xl bg-[#c2652a] text-white font-bold text-xs hover:bg-[#c2652a]/90 transition-all shadow-xs cursor-pointer"
              >
                Log Another Issue
              </button>
            </div>
          </div>
        ) : (
          /* FORM ENTRY VIEW WITH ANTI-SPAM DATABASE CHECK */
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="font-serif font-bold text-xl text-gray-900">
                Log a Maintenance Request
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Enter your registered mobile number to verify your residency and log issues.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {/* Resident Mobile Check Block */}
              <div className="space-y-3 p-4 bg-orange-50/30 rounded-2xl border border-orange-200/60">
                <h3 className="font-bold text-gray-900 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#c2652a]" /> Resident Mobile Verification
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">
                    Anti-Spam Security 🔒
                  </span>
                </h3>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Enter Registered Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={tenantPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="Enter 10-digit mobile number (e.g. 9876543210)"
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a] tabular-nums ${
                      verifiedOccupant
                        ? "border-emerald-500 ring-1 ring-emerald-500"
                        : mobileError
                        ? "border-red-500 ring-1 ring-red-500"
                        : "border-gray-300"
                    }`}
                  />
                </div>

                {/* VERIFICATION FEEDBACK BADGES */}
                {verifiedOccupant && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold">Verified Resident: {verifiedOccupant.name}</p>
                        <p className="text-[10px] text-emerald-700 font-medium">
                          Assigned Location: {verifiedOccupant.roomNumber} (Bed {verifiedOccupant.bedCode})
                        </p>
                      </div>
                    </div>
                    <span className="bg-emerald-200 text-emerald-900 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                      MATCHED 🟢
                    </span>
                  </div>
                )}

                {mobileError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs font-bold flex items-start gap-2 animate-in fade-in">
                    <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Mobile number not found in Sahara PG database.</p>
                      <p className="text-[10px] text-red-700 font-normal mt-0.5">
                        Only registered residents can log complaints to prevent unauthorized spam. Please verify your mobile number with management.
                      </p>
                    </div>
                  </div>
                )}

                {/* Room Location Display (Auto-synced or Selectable) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Resident Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={tenantName}
                      placeholder="Auto-filled upon mobile match"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-100 font-bold text-xs text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Room Location (Real-Time Synced)
                    </label>
                    <select
                      required
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    >
                      <option value="">-- Select Room --</option>
                      {allRoomsList.map((r, idx) => (
                        <option key={idx} value={r.roomNumber}>
                          {r.floorName} • {r.roomNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category Selector Grid */}
              <div className={!verifiedOccupant ? "opacity-50 pointer-events-none" : ""}>
                <label className="block font-bold text-gray-900 mb-2">
                  Select Issue Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {categoriesList.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.name;

                    return (
                      <div
                        key={cat.name}
                        onClick={() => setCategory(cat.name)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-1.5 ${
                          isSelected
                            ? "border-[#c2652a] bg-orange-50 shadow-xs font-bold text-[#c2652a]"
                            : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl border ${cat.color} ${
                            isSelected ? "scale-110" : ""
                          } transition-transform`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] leading-tight font-semibold">
                          {cat.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Title & Description */}
              <div className={!verifiedOccupant ? "opacity-50 pointer-events-none space-y-4" : "space-y-4"}>
                <div>
                  <label className="block font-bold text-gray-900 mb-1">
                    Short Issue Title *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!verifiedOccupant}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Water leaking from shower pipe / AC remote not working"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-900 mb-1">
                    Detailed Description *
                  </label>
                  <textarea
                    required
                    disabled={!verifiedOccupant}
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please describe what happened or location inside room..."
                    className="w-full p-3 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  ></textarea>
                </div>

                {/* Optional Photo Attachment */}
                <div>
                  <label className="block font-bold text-gray-900 mb-1">
                    Attach Photo (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center bg-gray-50 hover:border-[#c2652a] transition-colors cursor-pointer">
                    <Upload className="w-5 h-5 text-[#c2652a] mx-auto mb-1" />
                    <span className="font-bold text-gray-900 block text-xs">
                      Click to upload picture of damaged tap / socket
                    </span>
                    <span className="text-[10px] text-gray-500">
                      JPG or PNG (Max 5MB)
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !verifiedOccupant}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                    verifiedOccupant
                      ? "bg-[#c2652a] hover:bg-[#c2652a]/90 text-white cursor-pointer active:scale-98"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {submitting ? (
                    <span>Submitting Complaint...</span>
                  ) : !verifiedOccupant ? (
                    <span>Enter Verified Resident Mobile to Unlock</span>
                  ) : (
                    <>
                      <span>Submit Maintenance Request</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
