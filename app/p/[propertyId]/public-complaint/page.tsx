"use client";

export const dynamic = "force-dynamic";

import { use, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { propertyStore, FloorConfig } from "@/constants/propertyLayoutStore";
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { propertySettingsStore } from "@/constants/propertySettings";
import { verifyResidentForComplaint } from "@/utils/domainSSOT";
import {
  createComplaintInFirestore,
  subscribeToComplaints,
  Complaint,
} from "@/lib/complaintStore";
import { subscribeOccupantsFromFirestore } from "@/lib/firestoreService";
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
  Search,
  Clock,
  Check,
  MessageSquare,
  ChevronRight,
  Package,
  Layers,
  PhoneCall,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  Trash2,
  X,
  Eye,
} from "lucide-react";

function formatTimelineDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

/**
 * Fast client-side image compressor (scales to max 900px, 0.75 JPEG)
 */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          resolve(compressedDataUrl);
        } else {
          resolve(img.src);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function PublicTenantComplaintPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  // Active Tab: "LOG" | "TRACK"
  const [activeTab, setActiveTab] = useState<"LOG" | "TRACK">("LOG");

  // Property Settings & Name
  const [propertySettings, setPropertySettings] = useState(() =>
    propertySettingsStore.getSettings(propertyId)
  );

  // Real-time Occupants & Complaints
  const [occupants, setOccupants] = useState<Occupant[]>(() =>
    occupantStore.getOccupants(propertyId)
  );
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);

  // Phone input & Verification State
  const [tenantPhone, setTenantPhone] = useState("");
  const [verifiedOccupant, setVerifiedOccupant] = useState<Occupant | null>(null);
  const [verificationError, setVerificationError] = useState<{
    status: "BOOKED" | "PAST" | "NOT_FOUND";
    message: string;
  } | null>(null);

  // Form Input States
  const [tenantName, setTenantName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [category, setCategory] = useState("Plumbing");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);

  // File Input Ref for native file/camera dialog
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen Photo Modal State
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<Complaint | null>(null);
  const [trackFilter, setTrackFilter] = useState<"ALL" | "ACTIVE" | "RESOLVED">("ALL");

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
    // Property Settings sync
    propertySettingsStore.initFirebaseListener(propertyId);
    setPropertySettings(propertySettingsStore.getSettings(propertyId));
    const unsubscribeSettings = propertySettingsStore.subscribe(() => {
      setPropertySettings(propertySettingsStore.getSettings(propertyId));
    });

    // Occupants sync
    setOccupants(occupantStore.getOccupants(propertyId));
    const unsubscribeLocal = propertyStore.subscribe(() => {
      setOccupants(occupantStore.getOccupants(propertyId));
    });

    const unsubscribeFirestore = subscribeOccupantsFromFirestore(propertyId, (fsOccupants) => {
      if (fsOccupants) {
        const cleanList = fsOccupants.filter(
          (o) => /^(occ|guest)-\d{12,16}$/.test(o.id) || (!o.id.startsWith("tera") && !o.id.includes("test-"))
        );
        occupantStore.setOccupantsFromFirestore(cleanList);
        setOccupants(cleanList);
      }
    });

    // Real-time complaints listener for tracking
    const unsubscribeComplaints = subscribeToComplaints(propertyId, (list) => {
      setAllComplaints(list);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeLocal();
      unsubscribeFirestore();
      unsubscribeComplaints();
    };
  }, [propertyId]);

  // Strict As-of-Today Active Resident Verification Handler
  const handlePhoneChange = (inputPhone: string) => {
    const cleanDigits = inputPhone.replace(/\D/g, "").slice(0, 10);
    setTenantPhone(cleanDigits);

    if (cleanDigits.length === 10) {
      const res = verifyResidentForComplaint(cleanDigits, occupants);

      if (res.isValid && res.occupant) {
        setVerifiedOccupant(res.occupant);
        setTenantName(res.occupant.name);
        setRoomNumber(`${res.occupant.roomNumber} (Bed ${res.occupant.bedCode})`);
        setVerificationError(null);
      } else {
        setVerifiedOccupant(null);
        setTenantName("");
        setRoomNumber("");
        setVerificationError({
          status: res.status !== "VALID" ? res.status : "NOT_FOUND",
          message:
            res.errorMessage ||
            "Mobile number not found in this property's active resident directory.",
        });
      }
    } else {
      setVerifiedOccupant(null);
      setVerificationError(null);
    }
  };

  // Photo Upload Handler (Max 2 photos with auto-compression)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const remainingSlots = 2 - photos.length;
    if (remainingSlots <= 0) return;

    setCompressing(true);
    const filesToProcess = Array.from(e.target.files).slice(0, remainingSlots);
    const newPhotos: string[] = [];

    for (const file of filesToProcess) {
      if (file.type.startsWith("image/")) {
        try {
          const compressed = await compressImage(file);
          newPhotos.push(compressed);
        } catch (err) {
          console.warn("Image compression error:", err);
        }
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 2));
    setCompressing(false);
    if (e.target) e.target.value = "";
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Filter complaints for tracking (only belonging to entered verified mobile)
  const tenantComplaints = useMemo(() => {
    if (!tenantPhone || tenantPhone.length < 10) return [];
    const filtered = allComplaints.filter(
      (c) => c.tenantPhone.replace(/\D/g, "") === tenantPhone
    );
    const seen = new Set<string>();
    return filtered.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [allComplaints, tenantPhone]);

  const activeComplaintsCount = useMemo(() => {
    return tenantComplaints.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS").length;
  }, [tenantComplaints]);

  const filteredTrackComplaints = useMemo(() => {
    if (trackFilter === "ACTIVE") {
      return tenantComplaints.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS");
    }
    if (trackFilter === "RESOLVED") {
      return tenantComplaints.filter((c) => c.status === "RESOLVED" || c.status === "REJECTED");
    }
    return tenantComplaints;
  }, [tenantComplaints, trackFilter]);

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
        photoUrl: photos.length > 0 ? photos[0] : undefined,
        photoUrls: photos.length > 0 ? photos : undefined,
      });

      setSubmittedTicket(created);
    } catch (err) {
      console.error("Complaint creation error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setTitle("");
    setDescription("");
    setPhotos([]);
  };

  const displayName =
    propertySettings.propertyName ||
    propertyId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-[#fff8f6] text-[#201a17] font-sans selection:bg-orange-100 selection:text-[#964407] pb-16">
      {/* TOP PROPERTY BRANDING HEADER */}
      <header className="bg-white border-b border-[#d7c2b9] sticky top-0 z-30 shadow-xs">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#964407] text-white flex items-center justify-center font-serif font-bold text-xl shadow-xs">
              T
            </div>
            <div>
              <h1 className="font-serif font-bold text-base sm:text-lg text-gray-900 tracking-tight flex items-center gap-1.5 uppercase">
                {displayName}
              </h1>
              <p className="text-[10px] font-bold text-[#964407] tracking-wider uppercase">
                24/7 Resident Care Desk
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-700" /> Verified Resident Access
          </span>
        </div>
      </header>

      {/* WELCOME BANNER & TAB NAVIGATION */}
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-4">
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-[#887569]">
            Welcome to {displayName} Care Desk
          </p>
          <h2 className="font-serif font-bold text-xl sm:text-2xl text-gray-900">
            How can we help you today?
          </h2>
        </div>

        {/* 2 MAIN TABS */}
        <div className="grid grid-cols-2 p-1.5 bg-white rounded-2xl border border-[#d7c2b9] shadow-xs gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("LOG")}
            className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "LOG"
                ? "bg-[#964407] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-orange-50/50"
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Log New Issue</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TRACK")}
            className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
              activeTab === "TRACK"
                ? "bg-[#964407] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-orange-50/50"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Track Complaints</span>
            {activeComplaintsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 font-extrabold text-[10px] flex items-center justify-center">
                {activeComplaintsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-xl mx-auto px-4 pt-4 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: ✍️ LOG NEW ISSUE FORM */}
        {/* ========================================================================= */}
        {activeTab === "LOG" && (
          <>
            {submittedTicket ? (
              /* SUCCESS TICKET CONFIRMATION VIEW */
              <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Ticket Logged: {submittedTicket.complaintNumber}
                  </span>
                  <h2 className="font-serif font-bold text-2xl text-gray-900">
                    Maintenance Request Dispatched!
                  </h2>
                  <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                    Your request has been routed directly to the property caretaker and management dashboard.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] text-left text-xs space-y-2">
                  <div className="flex justify-between py-1 border-b border-orange-100">
                    <span className="text-gray-500 font-medium">Issue Category</span>
                    <span className="font-bold text-gray-900">{submittedTicket.category}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-orange-100">
                    <span className="text-gray-500 font-medium">Reported For</span>
                    <span className="font-bold text-gray-900">{submittedTicket.roomNumber}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 font-medium">Status</span>
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[10px]">
                      RECEIVED / QUEUED
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("TRACK")}
                    className="w-full py-3.5 rounded-2xl bg-[#964407] hover:bg-[#803804] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <Package className="w-4 h-4" />
                    <span>Track Live Progress in Timeline</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full py-3 rounded-2xl bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs border border-gray-300 transition-all cursor-pointer"
                  >
                    Log Another Maintenance Issue
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE COMPLAINT REGISTRATION FORM */
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-3xl border border-[#d7c2b9] p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in"
              >
                {/* STEP 1: MOBILE VERIFICATION */}
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-gray-900 text-xs sm:text-sm mb-1">
                      Step 1: Enter Your Registered Mobile Number *
                    </label>
                    <p className="text-[11px] text-gray-500 mb-2">
                      Auto-verifies your room & resident details from {displayName} records.
                    </p>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={tenantPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="Enter 10-digit mobile number (e.g. 9876543210)"
                        className={`w-full pl-10 pr-3.5 py-3 rounded-xl border bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#964407] tabular-nums ${
                          verifiedOccupant
                            ? "border-emerald-500 ring-1 ring-emerald-500"
                            : verificationError
                            ? verificationError.status === "BOOKED"
                              ? "border-amber-500 ring-1 ring-amber-500"
                              : "border-red-500 ring-1 ring-red-500"
                            : "border-gray-300"
                        }`}
                      />
                    </div>
                  </div>

                  {/* VERIFICATION FEEDBACK BADGES */}
                  {verifiedOccupant && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-sm text-emerald-950">
                            {verifiedOccupant.name} ({verifiedOccupant.stayType})
                          </p>
                          <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                            Assigned Location: {verifiedOccupant.roomNumber} (Bed {verifiedOccupant.bedCode})
                          </p>
                        </div>
                      </div>
                      <span className="bg-emerald-200 text-emerald-900 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase shrink-0">
                        ACTIVE RESIDENT 🟢
                      </span>
                    </div>
                  )}

                  {verificationError && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs font-bold flex items-start gap-2.5 animate-in fade-in ${
                        verificationError.status === "BOOKED"
                          ? "bg-amber-50 border-amber-300 text-amber-900"
                          : "bg-red-50 border-red-300 text-red-900"
                      }`}
                    >
                      {verificationError.status === "BOOKED" ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold text-sm">
                          {verificationError.status === "BOOKED"
                            ? "Booking Reserved (Not Onboarded Yet)"
                            : verificationError.status === "PAST"
                            ? "Access Expired (Vacated Resident)"
                            : "Mobile Number Not Registered"}
                        </p>
                        <p className="text-xs font-normal mt-0.5 leading-relaxed">
                          {verificationError.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* STEP 2: CATEGORY SELECTOR */}
                <div className={!verifiedOccupant ? "opacity-40 pointer-events-none" : ""}>
                  <label className="block font-bold text-gray-900 text-xs sm:text-sm mb-2">
                    Step 2: Select Issue Category *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {categoriesList.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.name;

                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => setCategory(cat.name)}
                          className={`p-3 rounded-2xl border text-left flex flex-col items-start gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#fff8f6] border-[#964407] ring-1 ring-[#964407] text-[#964407]"
                              : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
                          }`}
                        >
                          <div className={`p-2 rounded-xl border ${cat.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-xs">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 3: TITLE, DESCRIPTION & PHOTO UPLOAD */}
                <div className={`space-y-4 ${!verifiedOccupant ? "opacity-40 pointer-events-none" : ""}`}>
                  <div>
                    <label className="block font-bold text-gray-900 text-xs mb-1">
                      Issue Summary / Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Bathroom geyser not turning on, Wi-Fi router slow"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-900 text-xs mb-1">
                      Detailed Problem Description *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please provide specific details to help the maintenance technician prepare tools..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-xs text-gray-900 focus:ring-1 focus:ring-[#964407]"
                    />
                  </div>

                  {/* 📷 NATIVE CAMERA & PHOTO UPLOADER (MAX 2 IMAGES) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-gray-900 text-xs">
                        Attach Photo Evidence (Max 2 Photos)
                      </label>
                      <span className="text-[11px] font-bold text-gray-500">
                        {photos.length} of 2 added
                      </span>
                    </div>

                    {/* Hidden Native File Input (Triggers Camera / Gallery sheet) */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple={photos.length === 0}
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />

                    {/* Uploader Trigger Button (Visible when under 2 photos) */}
                    {photos.length < 2 && (
                      <button
                        type="button"
                        disabled={compressing}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-[#d7c2b9] bg-white hover:bg-orange-50/50 hover:border-[#964407] transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
                      >
                        <div className="w-10 h-10 rounded-full bg-orange-100/80 text-[#964407] flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Camera className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-gray-900">
                            {compressing ? "Compressing Image..." : "📸 Take Photo / Upload from Gallery"}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            Tap to snap photo with camera or pick from photo library (JPEG, PNG)
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Attached Photos Grid */}
                    {photos.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {photos.map((photoData, idx) => (
                          <div
                            key={idx}
                            className="relative rounded-2xl overflow-hidden border border-[#d7c2b9] bg-gray-100 aspect-video group shadow-2xs"
                          >
                            <img
                              src={photoData}
                              alt={`Evidence photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {/* Overlay Controls */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviewModalImg(photoData)}
                                className="w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-xs cursor-pointer hover:scale-110 transition-transform"
                                title="View Fullscreen"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs cursor-pointer hover:scale-110 transition-transform"
                                title="Remove Photo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                              Photo #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center sm:hidden"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={!verifiedOccupant || submitting || compressing}
                  className={`w-full py-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    !verifiedOccupant || submitting || compressing
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#964407] hover:bg-[#803804] text-white shadow-md cursor-pointer active:scale-98"
                  }`}
                >
                  {submitting ? (
                    <span>Submitting Ticket to Caretaker...</span>
                  ) : (
                    <>
                      <span>Dispatch Maintenance Request</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 📦 E-COMMERCE LOGISTICS TIMELINE TRACKING */}
        {/* ========================================================================= */}
        {activeTab === "TRACK" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Phone Entry for Tracking */}
            <div className="bg-white rounded-3xl border border-[#d7c2b9] p-5 shadow-xs space-y-3">
              <label className="block font-bold text-gray-900 text-xs">
                Enter Your Registered Mobile Number to Track Status:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  maxLength={10}
                  value={tenantPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#964407] tabular-nums"
                />
              </div>

              {/* Resident Verification Banner */}
              {verifiedOccupant && (
                <div className="p-3 rounded-xl bg-orange-50/80 border border-[#d7c2b9] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#964407]" />
                    <span className="font-bold text-gray-900">
                      {verifiedOccupant.name} — Room {verifiedOccupant.roomNumber} ({verifiedOccupant.bedCode})
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Active Resident 🟢
                  </span>
                </div>
              )}
            </div>

            {/* Filter Pills */}
            {tenantPhone.length === 10 && tenantComplaints.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTrackFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    trackFilter === "ALL"
                      ? "bg-[#964407] text-white"
                      : "bg-white text-gray-600 border border-gray-200"
                  }`}
                >
                  All ({tenantComplaints.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTrackFilter("ACTIVE")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    trackFilter === "ACTIVE"
                      ? "bg-amber-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200"
                  }`}
                >
                  Active ({tenantComplaints.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS").length})
                </button>
                <button
                  type="button"
                  onClick={() => setTrackFilter("RESOLVED")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    trackFilter === "RESOLVED"
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200"
                  }`}
                >
                  Resolved ({tenantComplaints.filter((c) => c.status === "RESOLVED" || c.status === "REJECTED").length})
                </button>
              </div>
            )}

            {/* Tracking Cards List */}
            {tenantPhone.length < 10 ? (
              <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center space-y-3">
                <Phone className="w-10 h-10 text-gray-300 mx-auto" />
                <h3 className="font-serif font-bold text-base text-gray-900">
                  Enter Mobile Number Above
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Type in your 10-digit registered number to view real-time tracking for your room maintenance tickets.
                </p>
              </div>
            ) : filteredTrackComplaints.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="font-serif font-bold text-base text-gray-900">
                  No Complaints Found
                </h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  There are no active or past maintenance tickets logged for this mobile number.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("LOG")}
                  className="px-4 py-2 rounded-xl bg-[#964407] text-white font-bold text-xs inline-flex items-center gap-1.5 mt-2 cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Log an Issue Now</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTrackComplaints.map((ticket) => {
                  const isResolved = ticket.status === "RESOLVED";
                  const isInProgress = ticket.status === "IN_PROGRESS";
                  const isOpen = ticket.status === "OPEN";

                  // Extract photo attachments
                  const ticketPhotos = ticket.photoUrls || (ticket.photoUrl ? [ticket.photoUrl] : []);

                  return (
                    <div
                      key={ticket.id}
                      className="bg-white rounded-3xl border border-[#d7c2b9] p-5 sm:p-6 shadow-xs space-y-5"
                    >
                      {/* Ticket Card Header */}
                      <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#964407] bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-200">
                              {ticket.complaintNumber || `#TKT-${ticket.id.slice(-4)}`}
                            </span>
                            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                              {ticket.category}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-gray-900">
                            {ticket.title}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                            isResolved
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : isInProgress
                              ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                              : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {ticket.status === "RESOLVED"
                            ? "RESOLVED"
                            : ticket.status === "IN_PROGRESS"
                            ? "IN PROGRESS"
                            : "RECEIVED"}
                        </span>
                      </div>

                      {/* Problem Description Snippet */}
                      <p className="text-xs text-gray-700 bg-gray-50/80 p-3 rounded-xl border border-gray-100 leading-relaxed font-medium">
                        {ticket.description}
                      </p>

                      {/* Photo Attachments Preview in Timeline Card */}
                      {ticketPhotos.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                            Attached Photo Evidence ({ticketPhotos.length}):
                          </span>
                          <div className="flex items-center gap-2.5">
                            {ticketPhotos.map((pUrl, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => setPreviewModalImg(pUrl)}
                                className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shadow-2xs hover:scale-105 transition-transform cursor-pointer relative group"
                              >
                                <img
                                  src={pUrl}
                                  alt={`Evidence ${pIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="w-4 h-4 text-white" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* E-COMMERCE LOGISTICS 3-STEP TIMELINE TRACKER */}
                      <div className="pt-2">
                        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#964407]" /> Live Resolution Tracker
                        </h4>

                        <div className="relative pl-6 space-y-6 border-l-2 border-dashed border-gray-200 ml-3">
                          {/* STEP 1: TICKET RECEIVED */}
                          <div className="relative">
                            <div className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-4 ring-white shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            <div>
                              <p className="font-bold text-xs text-gray-900">
                                Step 1: Ticket Received & Queued
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                Logged on {formatTimelineDate(ticket.createdAt)} • Assigned to {ticket.roomNumber}
                              </p>
                            </div>
                          </div>

                          {/* STEP 2: CARETAKER ASSIGNED / IN PROGRESS */}
                          <div className="relative">
                            <div
                              className={`absolute -left-[31px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-xs ${
                                isResolved || isInProgress
                                  ? "bg-amber-500 text-white"
                                  : "bg-gray-200 text-gray-500"
                              }`}
                            >
                              {isResolved ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : isInProgress ? (
                                <Wrench className="w-3 h-3 text-white" />
                              ) : (
                                <span className="text-[10px] font-bold">2</span>
                              )}
                            </div>
                            <div>
                              <p
                                className={`font-bold text-xs ${
                                  isInProgress
                                    ? "text-amber-900 font-extrabold"
                                    : isResolved
                                    ? "text-gray-900"
                                    : "text-gray-400"
                                }`}
                              >
                                Step 2: Caretaker Assigned / In Progress
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {isInProgress || isResolved
                                  ? "Under active inspection by property maintenance technician"
                                  : "Awaiting caretaker allocation"}
                              </p>
                            </div>
                          </div>

                          {/* STEP 3: ISSUE RESOLVED */}
                          <div className="relative">
                            <div
                              className={`absolute -left-[31px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-xs ${
                                isResolved
                                  ? "bg-emerald-500 text-white"
                                  : "bg-gray-200 text-gray-500"
                              }`}
                            >
                              {isResolved ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : (
                                <span className="text-[10px] font-bold">3</span>
                              )}
                            </div>
                            <div>
                              <p
                                className={`font-bold text-xs ${
                                  isResolved ? "text-emerald-950 font-extrabold" : "text-gray-400"
                                }`}
                              >
                                Step 3: Issue Resolved & Verified
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {isResolved
                                  ? "Repair completed & ticket closed by management"
                                  : "Pending final repair & confirmation"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CARETAKER RESOLUTION NOTE BOX */}
                      {ticket.resolutionNotes && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 text-xs space-y-1">
                          <span className="font-bold text-[11px] flex items-center gap-1.5 text-amber-900">
                            <MessageSquare className="w-3.5 h-3.5" /> Note from Caretaker:
                          </span>
                          <p className="text-xs text-amber-900/90 font-medium pl-5">
                            &quot;{ticket.resolutionNotes}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FULLSCREEN PHOTO ZOOM MODAL */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl max-h-[85vh] bg-white rounded-3xl p-2 shadow-2xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setPreviewModalImg(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center shadow-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewModalImg}
              alt="Photo Evidence Fullscreen"
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="max-w-xl mx-auto px-4 mt-10 text-center space-y-1">
        <p className="text-[11px] text-gray-400 font-medium">
          Powered by <strong className="text-gray-600">TenoPilot.com</strong> • Precision Property Operating System
        </p>
      </footer>
    </div>
  );
}
