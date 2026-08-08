"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { propertyStore, FloorConfig } from "@/constants/propertyLayoutStore";
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
  Clock,
  Upload,
  ArrowRight,
  Shield,
  FileText,
  AlertTriangle,
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
  const [isMounted, setIsMounted] = useState(false);

  // Form Input States
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [category, setCategory] = useState("Plumbing");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preferredTime, setPreferredTime] = useState("Morning • 9:00 AM - 12:00 PM");
  const [photoUrl, setPhotoUrl] = useState("");

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
    const initialGrid = propertyStore.getStructure();
    setFloors(initialGrid);

    // Subscribe to real-time property map layout updates
    const unsubscribe = propertyStore.subscribe(() => {
      setFloors(propertyStore.getStructure());
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName || !tenantPhone || !roomNumber || !title || !description) return;

    setSubmitting(true);

    try {
      const created = await createComplaintInFirestore(propertyId, {
        tenantName,
        tenantPhone,
        roomNumber,
        category,
        title,
        description,
        preferredTime,
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
                24/7 Maintenance & Complaint Lodging
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span> Real-Time Sync
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
                Your maintenance request has been submitted directly to the Sahara PG Caretaker & Management desk.
              </p>
            </div>

            {/* Ticket Summary Card */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 font-bold">Resident Name:</span>
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
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 font-bold">Issue Title:</span>
                <span className="font-bold text-gray-900">{submittedTicket.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Preferred Time:</span>
                <span className="font-medium text-gray-700">{submittedTicket.preferredTime}</span>
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
          /* FORM ENTRY VIEW */
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="font-serif font-bold text-xl text-gray-900">
                Log a Maintenance Request
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Fill in your resident details below. Issues are synced instantly to the management portal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {/* Resident Identity Block */}
              <div className="space-y-3 p-4 bg-orange-50/30 rounded-2xl border border-orange-200/60">
                <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                  <User className="w-4 h-4 text-[#c2652a]" /> Resident Identity & Room Location
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="e.g. Rohan Gupta"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white font-medium text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a] tabular-nums"
                    />
                  </div>
                </div>

                {/* Real-time Synced Room Dropdown */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Select Your Room (Synced Real-Time from Property Map) *
                  </label>
                  <select
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a] max-h-48"
                  >
                    <option value="">-- Choose Configured Room --</option>
                    {allRoomsList.length === 0 ? (
                      <>
                        <option value="Room 101">Ground Floor • Room 101</option>
                        <option value="Room 102">Ground Floor • Room 102</option>
                        <option value="Room 201">Floor 01 • Room 201</option>
                        <option value="Room 302">Floor 02 • Room 302</option>
                      </>
                    ) : (
                      allRoomsList.map((r, idx) => (
                        <option key={idx} value={r.roomNumber}>
                          {r.floorName} • {r.roomNumber}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Category Selector Grid */}
              <div>
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
              <div>
                <label className="block font-bold text-gray-900 mb-1">
                  Short Issue Title *
                </label>
                <input
                  type="text"
                  required
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
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe what happened, location inside room, or specific instructions for caretaker..."
                  className="w-full p-3 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                ></textarea>
              </div>

              {/* Preferred Time Slot */}
              <div>
                <label className="block font-bold text-gray-900 mb-1">
                  Preferred Time Slot for Caretaker Visit
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-xs font-medium text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                >
                  <option value="Morning • 9:00 AM - 12:00 PM">Morning • 9:00 AM - 12:00 PM</option>
                  <option value="Afternoon • 12:00 PM - 3:00 PM">Afternoon • 12:00 PM - 3:00 PM</option>
                  <option value="Evening • 4:00 PM - 7:00 PM">Evening • 4:00 PM - 7:00 PM</option>
                  <option value="Urgent / Immediate Visit Needed">Urgent / Immediate Visit Needed</option>
                </select>
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
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>Submitting Complaint...</span>
                ) : (
                  <>
                    <span>Submit Maintenance Request</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
