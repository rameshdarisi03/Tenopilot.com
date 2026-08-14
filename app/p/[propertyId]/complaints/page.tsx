"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import {
  Complaint,
  subscribeToComplaints,
  createComplaintInFirestore,
  updateComplaintStatusInFirestore,
  markComplaintAsReadInFirestore,
  deleteComplaintInFirestore,
  exportComplaintsCSV,
  buildComplaintWhatsAppUrl,
} from "@/lib/complaintStore";
import { propertyStore, FloorConfig } from "@/constants/propertyLayoutStore";
import { QRCodeSVG } from "qrcode.react";
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
  Plus,
  Search,
  Filter,
  Download,
  X,
  FileText,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Eye,
  Trash2,
  QrCode,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

export default function AdminComplaintsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";

  // Navigation & Layout State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Complaints State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [floors, setFloors] = useState<FloorConfig[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Modals & Drawers State
  const [showLogModal, setShowLogModal] = useState(false);
  const [statusModalTicket, setStatusModalTicket] = useState<Complaint | null>(null);
  const [resolveModalTicket, setResolveModalTicket] = useState<Complaint | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Log Walk-in Ticket Form Inputs
  const [logTenantName, setLogTenantName] = useState("");
  const [logTenantPhone, setLogTenantPhone] = useState("");
  const [logRoomNumber, setLogRoomNumber] = useState("");
  const [logCategory, setLogCategory] = useState("Plumbing");
  const [logTitle, setLogTitle] = useState("");
  const [logDescription, setLogDescription] = useState("");
  const [logPreferredTime, setLogPreferredTime] = useState("Morning • 9:00 AM - 12:00 PM");

  // Resolution Note State for Modal
  const [resolutionInput, setResolutionInput] = useState("");

  // Public Resident Portal Link (Dynamic for local & Vercel)
  const [publicPortalUrl, setPublicPortalUrl] = useState(`http://localhost:3000/p/${propertyId}/public-complaint`);

  useEffect(() => {
    setIsMounted(true);
    setFloors(propertyStore.getStructure(propertyId));

    if (typeof window !== "undefined") {
      setPublicPortalUrl(`${window.location.origin}/p/${propertyId}/public-complaint`);
    }

    // Subscribe to Firebase real-time complaints listener
    const unsubscribe = subscribeToComplaints(propertyId, (list) => {
      setComplaints(list);
    });

    return () => unsubscribe();
  }, [propertyId]);

  // Extract rooms for walk-in ticket modal
  const allRoomsList = floors.flatMap((f) =>
    f.rooms.map((r) => `Room ${r.roomNumber}`)
  );

  // Filtered Complaints List
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.complaintNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "ALL" || c.status === statusFilter;

      const matchCategory =
        categoryFilter === "ALL" || c.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [complaints, searchQuery, statusFilter, categoryFilter]);

  // Calculated Metrics
  const openCount = complaints.filter((c) => c.status === "OPEN").length;
  const inProgressCount = complaints.filter((c) => c.status === "IN_PROGRESS").length;
  const resolvedCount = complaints.filter((c) => c.status === "RESOLVED").length;
  const totalCount = complaints.length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const handleUpdateStatus = async (
    newStatus: Complaint["status"],
    notes?: string
  ) => {
    if (!statusModalTicket) return;
    await updateComplaintStatusInFirestore(
      propertyId,
      statusModalTicket.id,
      newStatus,
      notes
    );

    // Auto-open WhatsApp wa.me pre-filled redirect link for resident
    const waUrl = buildComplaintWhatsAppUrl(statusModalTicket, newStatus, notes);
    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank");
    }

    triggerToast(`Ticket ${statusModalTicket.complaintNumber} updated to ${newStatus} & WhatsApp alert prepared!`);
    setStatusModalTicket(null);
  };

  const handleConfirmResolve = async () => {
    if (!resolveModalTicket) return;
    const finalNotes = resolutionInput || "Resolved by property manager.";
    await updateComplaintStatusInFirestore(
      propertyId,
      resolveModalTicket.id,
      "RESOLVED",
      finalNotes
    );

    // Auto-open WhatsApp wa.me pre-filled redirect link for resident
    const waUrl = buildComplaintWhatsAppUrl(resolveModalTicket, "RESOLVED", finalNotes);
    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank");
    }

    triggerToast(`Ticket ${resolveModalTicket.complaintNumber} marked as RESOLVED & WhatsApp alert prepared!`);
    setResolveModalTicket(null);
    setResolutionInput("");
  };

  const handleToggleRead = async (c: Complaint) => {
    await markComplaintAsReadInFirestore(propertyId, c.id, !c.isRead);
  };

  const handleDelete = async (cId: string) => {
    if (confirm("Are you sure you want to delete this complaint record?")) {
      await deleteComplaintInFirestore(propertyId, cId);
      triggerToast("Complaint record deleted.");
    }
  };

  const handleSaveWalkInTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTenantName || !logTenantPhone || !logRoomNumber || !logTitle || !logDescription) return;

    const created = await createComplaintInFirestore(propertyId, {
      tenantName: logTenantName,
      tenantPhone: logTenantPhone,
      roomNumber: logRoomNumber,
      category: logCategory,
      title: logTitle,
      description: logDescription,
      preferredTime: logPreferredTime,
    });

    triggerToast(`Walk-in ticket ${created.complaintNumber} logged successfully!`);
    setShowLogModal(false);
    setLogTenantName("");
    setLogTenantPhone("");
    setLogTitle("");
    setLogDescription("");
  };

  const renderCategoryIcon = (catName: string) => {
    switch (catName) {
      case "Plumbing":
        return <Wrench className="w-4 h-4 text-blue-600" />;
      case "Electrical":
        return <Zap className="w-4 h-4 text-amber-600" />;
      case "Wi-Fi & Net":
      case "Wi-Fi":
        return <Wifi className="w-4 h-4 text-indigo-600" />;
      case "Housekeeping":
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      case "Appliance / AC":
        return <Snowflake className="w-4 h-4 text-cyan-600" />;
      case "Pest Control":
        return <Bug className="w-4 h-4 text-purple-600" />;
      case "Security & Locks":
        return <ShieldCheck className="w-4 h-4 text-rose-600" />;
      default:
        return <HelpCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: Complaint["status"]) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="bg-red-100 text-red-800 border border-red-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span> OPEN / NEW
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> IN PROGRESS
          </span>
        );
      case "RESOLVED":
        return (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-700" /> RESOLVED
          </span>
        );
      case "REJECTED":
        return (
          <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            REJECTED / CLOSED
          </span>
        );
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex h-screen bg-[#fcf9f8] text-gray-900 font-sans selection:bg-orange-100 selection:text-[#c2652a] overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="hidden lg:block w-64 shrink-0 h-full">
        <PropertySidebar propertyId={propertyId} />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 w-64 bg-white z-50">
            <PropertySidebar
              propertyId={propertyId}
              mobileOpen={mobileMenuOpen}
              onMobileClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <PropertyHeader
          title="Complaints"
          showSearch={false}
          propertyId={propertyId}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-16">
          {/* Header Title Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#c2652a] bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                  REAL-TIME FIREBASE MAINTENANCE HUB 🟢
                </span>
              </div>
              <h1 className="font-serif font-bold text-2xl md:text-3xl text-gray-900 mt-1">
                Complaints & Maintenance Operations
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Action before analytics. Resolve resident infrastructure complaints across TenoPilot.com properties.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-white border border-gray-200 hover:border-[#c2652a] text-gray-800 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <QrCode className="w-4 h-4 text-[#c2652a]" /> Resident QR Portal
              </button>

              <button
                type="button"
                onClick={() => exportComplaintsCSV(complaints)}
                className="px-3.5 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4 text-emerald-700" /> Export CSV
              </button>

              <button
                type="button"
                onClick={() => setShowLogModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" /> Log Walk-in Ticket
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {showToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>{toastMessage}</span>
              </div>
              <button onClick={() => setShowToast(false)} className="text-emerald-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Top Bento Summary Cards (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Urgent / New Queue */}
            <div
              onClick={() => setStatusFilter("OPEN")}
              className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                statusFilter === "OPEN"
                  ? "bg-red-50/50 border-red-300 shadow-sm"
                  : "bg-white border-gray-200 shadow-2xs hover:border-red-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span> New / Unresolved
                </span>
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="font-sans font-bold text-3xl text-red-700 tracking-tight tabular-nums">
                {openCount < 10 ? `0${openCount}` : openCount}
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">
                Open tickets awaiting review & action
              </p>
            </div>

            {/* Card 2: In Progress */}
            <div
              onClick={() => setStatusFilter("IN_PROGRESS")}
              className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                statusFilter === "IN_PROGRESS"
                  ? "bg-amber-50/50 border-amber-300 shadow-sm"
                  : "bg-white border-gray-200 shadow-2xs hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span> In Progress
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
              </div>
              <p className="font-sans font-bold text-3xl text-gray-900 tracking-tight tabular-nums">
                {inProgressCount < 10 ? `0${inProgressCount}` : inProgressCount}
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">
                Active worklogs currently being serviced
              </p>
            </div>

            {/* Card 3: Resolved */}
            <div
              onClick={() => setStatusFilter("RESOLVED")}
              className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                statusFilter === "RESOLVED"
                  ? "bg-emerald-50/50 border-emerald-300 shadow-sm"
                  : "bg-white border-gray-200 shadow-2xs hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-700" /> Resolved Tickets
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="font-sans font-bold text-3xl text-gray-900 tracking-tight tabular-nums">
                {resolvedCount < 10 ? `0${resolvedCount}` : resolvedCount}
              </p>
              <p className="text-[11px] text-emerald-700 font-bold mt-1">
                {resolutionRate}% Resolution Efficiency Rate
              </p>
            </div>

            {/* Card 4: SLA Turnaround */}
            <div className="p-5 rounded-3xl bg-white border border-gray-200 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  AVG TURNAROUND SLA
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="font-sans font-bold text-3xl text-gray-900 tracking-tight tabular-nums">
                {resolvedCount > 0 ? "1.8" : "0.0"} <span className="text-sm font-semibold text-gray-500">Hours</span>
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">
                Fast resolution turnaround target
              </p>
            </div>
          </div>

          {/* Search, Filter Tabs & Category Bar */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by resident name, room, ticket code..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#c2652a] focus:ring-1 focus:ring-[#c2652a] transition-all"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 rounded-2xl text-xs font-bold">
                {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      statusFilter === st
                        ? "bg-[#c2652a] text-white shadow-2xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {st === "ALL"
                      ? `ALL (${complaints.length})`
                      : st === "OPEN"
                      ? `OPEN (${openCount})`
                      : st === "IN_PROGRESS"
                      ? `IN PROGRESS (${inProgressCount})`
                      : `RESOLVED (${resolvedCount})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 text-xs">
              <span className="text-gray-500 font-bold text-[11px] uppercase tracking-wider mr-1">
                Category:
              </span>
              <button
                onClick={() => setCategoryFilter("ALL")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === "ALL"
                    ? "bg-[#c2652a] text-white shadow-2xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                ALL
              </button>
              {[
                "Plumbing",
                "Electrical",
                "Wi-Fi & Net",
                "Housekeeping",
                "Appliance / AC",
                "Pest Control",
                "Security & Locks",
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-[#c2652a] text-white shadow-2xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Complaint Cards Work List */}
          <div className="space-y-4">
            {filteredComplaints.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="font-serif font-bold text-lg text-gray-900">
                  No Complaints Found
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  There are no active resident complaint records matching your current filter criteria.
                </p>
              </div>
            ) : (
              filteredComplaints.map((c) => {
                return (
                  <div
                    key={c.id}
                    className={`bg-white rounded-3xl border p-5 sm:p-6 transition-all shadow-2xs hover:shadow-xs space-y-4 ${
                      !c.isRead ? "border-l-4 border-l-[#c2652a] border-gray-200" : "border-gray-200"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-orange-50 border border-orange-200">
                          {renderCategoryIcon(c.category)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#c2652a]">
                              {c.complaintNumber}
                            </span>
                            {getStatusBadge(c.status)}
                          </div>
                          <h3 className="font-serif font-bold text-base text-gray-900 mt-0.5">
                            {c.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <a
                          href={buildComplaintWhatsAppUrl(c)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Send status notification via WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => setStatusModalTicket(c)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                        >
                          Update Status
                        </button>

                        {c.status !== "RESOLVED" && (
                          <button
                            type="button"
                            onClick={() => {
                              setResolveModalTicket(c);
                              setResolutionInput("");
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-xl hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100">
                      <div>
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] block">
                          Resident & Contact
                        </span>
                        <span className="font-bold text-gray-900 block mt-0.5 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-[#c2652a]" /> {c.tenantName}
                        </span>
                        <span className="text-gray-500 text-[11px] font-mono block">
                          📞 {c.tenantPhone}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] block">
                          Synced Room Location
                        </span>
                        <span className="font-bold text-[#c2652a] block mt-0.5 flex items-center gap-1">
                          <Home className="w-3.5 h-3.5" /> {c.roomNumber}
                        </span>
                        <span className="text-gray-500 text-[11px] block">
                          Category: {c.category}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] block">
                          Logged Time & Date
                        </span>
                        <span className="font-bold text-gray-900 block mt-0.5">
                          {new Date(c.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          • {new Date(c.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* Description Text */}
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-gray-900 block">Issue Description:</span>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                        {c.description}
                      </p>
                    </div>

                    {/* Resolution Notes if resolved */}
                    {c.resolutionNotes && (
                      <div className="text-xs bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 space-y-1 text-emerald-900">
                        <span className="font-bold block flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Resolution Action Notes:
                        </span>
                        <p className="text-emerald-800 italic">{c.resolutionNotes}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* UPDATE STATUS MODAL */}
      {statusModalTicket && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setStatusModalTicket(null)}
        >
          <div
            className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-gray-900">
                  Update Ticket Status
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Reference: {statusModalTicket.complaintNumber} ({statusModalTicket.roomNumber})
                </p>
              </div>
              <button
                onClick={() => setStatusModalTicket(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block font-bold text-gray-900">
                Select New Status:
              </label>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("OPEN")}
                  className={`p-3 rounded-2xl border text-left font-bold transition-all cursor-pointer ${
                    statusModalTicket.status === "OPEN"
                      ? "border-red-500 bg-red-50 text-red-900"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  🔴 OPEN / NEW (Awaiting Action)
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus("IN_PROGRESS")}
                  className={`p-3 rounded-2xl border text-left font-bold transition-all cursor-pointer ${
                    statusModalTicket.status === "IN_PROGRESS"
                      ? "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  🟡 IN PROGRESS (Under Servicing / Caretaker Dispatched)
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus("RESOLVED")}
                  className={`p-3 rounded-2xl border text-left font-bold transition-all cursor-pointer ${
                    statusModalTicket.status === "RESOLVED"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  🟢 RESOLVED (Issue Fixed & Closed)
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus("REJECTED")}
                  className={`p-3 rounded-2xl border text-left font-bold transition-all cursor-pointer ${
                    statusModalTicket.status === "REJECTED"
                      ? "border-gray-400 bg-gray-100 text-gray-900"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  ⚪ REJECTED / DUPLICATE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MARK RESOLVED WITH NOTES MODAL */}
      {resolveModalTicket && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setResolveModalTicket(null)}
        >
          <div
            className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Confirm Resolution
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Ticket {resolveModalTicket.complaintNumber} • {resolveModalTicket.roomNumber}
                </p>
              </div>
              <button
                onClick={() => setResolveModalTicket(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block font-bold text-gray-900 mb-1">
                Resolution Action Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={resolutionInput}
                onChange={(e) => setResolutionInput(e.target.value)}
                placeholder="e.g. Replaced leaking tap washer; tested water flow normal."
                className="w-full p-3 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
              ></textarea>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResolveModalTicket(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Confirm & Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG WALK-IN TICKET MODAL */}
      {showLogModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowLogModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 animate-in zoom-in-95 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-xl text-gray-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#c2652a]" /> Log Walk-In / Phone Complaint
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Record verbal or phone maintenance complaints directly into the management ledger
                </p>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWalkInTicket} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-900 mb-1">
                    Resident Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={logTenantName}
                    onChange={(e) => setLogTenantName(e.target.value)}
                    placeholder="e.g. Vikram Malhotra"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-900 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={logTenantPhone}
                    onChange={(e) => setLogTenantPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a] tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-900 mb-1">
                    Room Location *
                  </label>
                  <select
                    required
                    value={logRoomNumber}
                    onChange={(e) => setLogRoomNumber(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  >
                    <option value="">-- Choose Room --</option>
                    {allRoomsList.map((r, idx) => (
                      <option key={idx} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-900 mb-1">
                    Category *
                  </label>
                  <select
                    value={logCategory}
                    onChange={(e) => setLogCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                  >
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Wi-Fi & Net">Wi-Fi & Net</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Appliance / AC">Appliance / AC</option>
                    <option value="Pest Control">Pest Control</option>
                    <option value="Security & Locks">Security & Locks</option>
                    <option value="Other / Noise">Other / Noise</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-900 mb-1">
                  Issue Title *
                </label>
                <input
                  type="text"
                  required
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                  placeholder="e.g. Geyser trip switch melting"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-900 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={logDescription}
                  onChange={(e) => setLogDescription(e.target.value)}
                  placeholder="Describe the complaint in detail..."
                  className="w-full p-3 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Log Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESIDENT QR PORTAL PREVIEW MODAL */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 text-center animate-in zoom-in-95 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="text-left">
                <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#c2652a]" /> Resident QR Portal Code
                </h3>
                <p className="text-[11px] text-gray-500">
                  Scan or display in PG corridors & reception desk
                </p>
              </div>
              <button
                onClick={() => setQrModalOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated QR Code Canvas Frame */}
            <div className="p-6 bg-orange-50/40 rounded-3xl border-2 border-dashed border-[#c2652a]/40 flex flex-col items-center justify-center space-y-3">
              <div className="w-48 h-48 bg-white p-3 rounded-2xl shadow-md border border-gray-200 flex flex-col items-center justify-center relative">
                <QRCodeSVG
                  value={publicPortalUrl}
                  size={160}
                  fgColor="#201a17"
                  bgColor="#ffffff"
                  level="H"
                />
              </div>

              <div>
                <span className="font-bold text-gray-900 block text-xs">
                  Scan to Log Complaint Directly
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {publicPortalUrl}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={publicPortalUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 rounded-2xl bg-[#c2652a] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#c2652a]/90 transition-all cursor-pointer"
              >
                <span>Preview Tenant Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
