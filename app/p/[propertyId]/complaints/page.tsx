"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useAuth } from "@/providers/AuthProvider";
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
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { verifyResidentForComplaint } from "@/utils/domainSSOT";
import { subscribeOccupantsFromFirestore } from "@/lib/firestoreService";
import { propertyStore, FloorConfig } from "@/constants/propertyLayoutStore";
import { PublicComplaintQrModal } from "@/components/PublicComplaintQrModal";
import { propertySettingsStore } from "@/constants/propertySettings";
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
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";
import { normalizePhoneNumber } from "@/utils/security";


const STATUS_OPTIONS: Array<{
  key: "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  label: string;
  emoji: string;
  selectedStyle: string;
  radioBorder: string;
  radioDot: string;
}> = [
  {
    key: "IN_PROGRESS",
    label: "IN PROGRESS (Under Servicing / Caretaker Dispatched)",
    emoji: "🟡",
    selectedStyle: "border-amber-500 bg-amber-50 text-amber-900",
    radioBorder: "border-amber-500 bg-amber-50",
    radioDot: "bg-amber-500",
  },
  {
    key: "RESOLVED",
    label: "RESOLVED (Issue Fixed & Closed)",
    emoji: "🟢",
    selectedStyle: "border-emerald-500 bg-emerald-50 text-emerald-900",
    radioBorder: "border-emerald-500 bg-emerald-50",
    radioDot: "bg-emerald-600",
  },
  {
    key: "REJECTED",
    label: "REJECTED / DUPLICATE",
    emoji: "⚪",
    selectedStyle: "border-gray-500 bg-gray-100 text-gray-900",
    radioBorder: "border-gray-500 bg-gray-100",
    radioDot: "bg-gray-600",
  },
];

const formatRoomDisplay = (roomStr: string) => {
  if (!roomStr) return "";
  return roomStr.replace(/Bed\s+Bed/gi, "Bed");
};

export default function AdminComplaintsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "";
  const { user, profile } = useAuth();

  // Navigation & Layout State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Property Settings (Dynamic Brand Name)
  const [propertySettings, setPropertySettings] = useState(() =>
    propertySettingsStore.getSettings(propertyId)
  );

  useEffect(() => {
    propertySettingsStore.initFirebaseListener(propertyId);
    setPropertySettings(propertySettingsStore.getSettings(propertyId));
    return propertySettingsStore.subscribe(() => {
      setPropertySettings(propertySettingsStore.getSettings(propertyId));
    });
  }, [propertyId]);

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
  const [selectedStatus, setSelectedStatus] = useState<Complaint["status"]>("OPEN");
  const [statusNotes, setStatusNotes] = useState("");
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(true);
  const [sendViaEmail, setSendViaEmail] = useState(true);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const handleOpenStatusModal = (c: Complaint, forceStatus?: Complaint["status"]) => {
    setStatusModalTicket(c);
    const defaultStatus = forceStatus || (c.status === "OPEN" ? "IN_PROGRESS" : c.status);
    setSelectedStatus(defaultStatus);
    setStatusNotes(c.resolutionNotes || "");
    setSendViaWhatsApp(true);
    setSendViaEmail(true);
    setIsSubmittingStatus(false);
  };

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Log Walk-in Ticket Form Inputs
  const [occupants, setOccupants] = useState<Occupant[]>(() =>
    typeof window !== "undefined" ? occupantStore.getOccupants(propertyId) : []
  );
  const [logTenantName, setLogTenantName] = useState("");
  const [logTenantPhone, setLogTenantPhone] = useState("");
  const [logRoomNumber, setLogRoomNumber] = useState("");
  const [logVerifiedOccupant, setLogVerifiedOccupant] = useState<Occupant | null>(null);
  const [logPhoneError, setLogPhoneError] = useState<string | null>(null);
  const [logCategory, setLogCategory] = useState("Plumbing");
  const [logTitle, setLogTitle] = useState("");
  const [logDescription, setLogDescription] = useState("");
  const [logPreferredTime, setLogPreferredTime] = useState("Morning • 9:00 AM - 12:00 PM");



  // Fullscreen Photo Modal State
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  // Public Complaints Portal Link (Dynamic for production custom domain & local)
  const [publicPortalUrl, setPublicPortalUrl] = useState(`https://www.tenopilot.com/p/${propertyId}/public-complaint`);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = async () => {
    const urlToCopy = publicPortalUrl || (typeof window !== "undefined" ? `${window.location.origin}/p/${propertyId}/public-complaint` : `/p/${propertyId}/public-complaint`);
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  useEffect(() => {
    setIsMounted(true);
    setFloors(propertyStore.getStructure(propertyId));

    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const baseDomain = isLocal ? window.location.origin : "https://www.tenopilot.com";
      setPublicPortalUrl(`${baseDomain}/p/${propertyId}/public-complaint`);
    }

    if (!propertyId) {
      setComplaints([]);
      return;
    }

    // Subscribe to Firebase real-time complaints listener
    const unsubscribe = subscribeToComplaints(propertyId, (list) => {
      setComplaints(list || []);
    });

    // Real-time occupants sync for phone auto-detection
    setOccupants(occupantStore.getOccupants(propertyId));
    const unsubLocalOccupants = propertyStore.subscribe(() => {
      setOccupants(occupantStore.getOccupants(propertyId));
    });
    const unsubFSOccupants = subscribeOccupantsFromFirestore(propertyId, (fsOccupants) => {
      if (fsOccupants) {
        occupantStore.setOccupantsFromFirestore(fsOccupants);
        setOccupants(fsOccupants);
      }
    });

    return () => {
      unsubscribe();
      unsubLocalOccupants();
      unsubFSOccupants();
    };
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

  const handleConfirmStatusUpdate = async () => {
    if (!statusModalTicket || isSubmittingStatus) return;
    setIsSubmittingStatus(true);

    try {
      const finalNotes = statusNotes.trim();
      // 1. Update in Firestore
      await updateComplaintStatusInFirestore(
        propertyId,
        statusModalTicket.id,
        selectedStatus,
        finalNotes
      );

      const deliveryChannels: string[] = [];

      // 2. Background WhatsApp dispatch if checked
      if (sendViaWhatsApp && statusModalTicket.tenantPhone) {
        try {
          const waRes = await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              propertyId,
              messages: [
                {
                  toPhone: statusModalTicket.tenantPhone,
                  recipientName: statusModalTicket.tenantName,
                  propertyId,
                  propertyName: propertySettings?.propertyName || "TenoPilot PG",
                  type: "COMPLAINT_UPDATE",
                  params: {
                    roomNumber: statusModalTicket.roomNumber,
                    complaintId: statusModalTicket.complaintNumber,
                    complaintTitle: statusModalTicket.title,
                    complaintStatus: selectedStatus,
                    customMessage: finalNotes || undefined,
                    category: statusModalTicket.category,
                  },
                },
              ],
              userId: user?.uid,
              userEmail: user?.email || profile?.email,
            }),
          });
          const waData = await waRes.json().catch(() => ({}));
          if (waRes.ok && waData.successfulCount > 0) {
            deliveryChannels.push("WhatsApp");
          } else {
            console.warn("WhatsApp background dispatch notice:", waData);
          }
        } catch (waErr) {
          console.warn("WhatsApp background dispatch error:", waErr);
        }
      }

      // 3. Background Email dispatch if checked
      if (sendViaEmail) {
        const cleanPhone = statusModalTicket.tenantPhone.replace(/\D/g, "");
        const targetPhoneLast10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : "";
        const targetOccupant = occupants.find(
          (o) =>
            (targetPhoneLast10 && o.phone && o.phone.replace(/\D/g, "").slice(-10) === targetPhoneLast10) ||
            (o.name && o.name.toLowerCase().trim() === statusModalTicket.tenantName.toLowerCase().trim())
        );
        const recipientEmail = (statusModalTicket as any).tenantEmail || targetOccupant?.email;

        if (recipientEmail && recipientEmail.includes("@")) {
          try {
            const emailRes = await fetch("/api/email/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                propertyId,
                messages: [
                  {
                    toEmail: recipientEmail,
                    recipientName: statusModalTicket.tenantName,
                    propertyId,
                    propertyName: propertySettings?.propertyName || "TenoPilot PG",
                    type: "COMPLAINT_UPDATE",
                    params: {
                      roomNumber: statusModalTicket.roomNumber,
                      complaintId: statusModalTicket.complaintNumber,
                      complaintTitle: statusModalTicket.title,
                      complaintStatus: selectedStatus,
                      customMessage: finalNotes || undefined,
                      category: statusModalTicket.category,
                    },
                  },
                ],
                userId: user?.uid,
                userEmail: user?.email || profile?.email,
              }),
            });
            if (emailRes.ok) {
              deliveryChannels.push("Email");
            } else {
              console.warn("Email background dispatch notice:", await emailRes.text());
            }
          } catch (emailErr) {
            console.warn("Email background dispatch error:", emailErr);
          }
        }
      }

      const deliveryMsg = deliveryChannels.length > 0 ? ` • ${deliveryChannels.join(" & ")} delivered!` : "";
      triggerToast(`Ticket ${statusModalTicket.complaintNumber} updated to ${selectedStatus.replace("_", " ")}${deliveryMsg}`);
      setStatusModalTicket(null);
    } catch (err: any) {
      console.error("Error updating complaint status:", err);
      triggerToast(err?.message || "Failed to update complaint status");
    } finally {
      setIsSubmittingStatus(false);
    }
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

  const handleWalkInPhoneChange = (inputPhone: string) => {
    const digits = inputPhone.replace(/\D/g, "");
    const cleanDigits = digits.length > 10 ? normalizePhoneNumber(digits) : digits.slice(0, 10);
    setLogTenantPhone(cleanDigits);

    if (cleanDigits.length === 10) {
      const res = verifyResidentForComplaint(cleanDigits, occupants);
      if (res.isValid && res.occupant) {
        setLogVerifiedOccupant(res.occupant);
        setLogTenantName(res.occupant.name);
        const matchRoom = allRoomsList.find((r) =>
          r.toLowerCase().includes(res.occupant!.roomNumber.toLowerCase())
        );
        if (matchRoom) {
          setLogRoomNumber(matchRoom);
        } else {
          setLogRoomNumber(`Room ${res.occupant.roomNumber}`);
        }
        setLogPhoneError(null);
      } else {
        setLogVerifiedOccupant(null);
        setLogPhoneError(
          res.errorMessage || "Mobile number not found in active resident directory. You can enter the name manually below."
        );
      }
    } else {
      setLogVerifiedOccupant(null);
      setLogPhoneError(null);
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
    setLogRoomNumber("");
    setLogVerifiedOccupant(null);
    setLogPhoneError(null);
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

        <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8 max-w-7xl mx-auto w-full pb-20">
          {/* Mobile Header Bar (< md) */}
          <div className="flex md:hidden flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#c2652a] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                  Live Maintenance 🟢
                </span>
                <h1 className="font-serif font-bold text-xl text-gray-900 mt-0.5">
                  Complaints Desk
                </h1>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:border-[#c2652a] shadow-2xs cursor-pointer active:scale-95"
                  title="Complaints QR Portal"
                >
                  <QrCode className="w-4 h-4 text-[#c2652a]" />
                </button>
                <button
                  type="button"
                  onClick={() => exportComplaintsCSV(complaints)}
                  className="p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-2xs cursor-pointer active:scale-95"
                  title="Export CSV"
                >
                  <Download className="w-4 h-4 text-emerald-700" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogModal(true)}
                  className="px-3 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Walk-in</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Header Title Section (>= md) */}
          <div className="hidden md:flex flex-row items-center justify-between gap-4">
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
                <QrCode className="w-4 h-4 text-[#c2652a]" /> Complaints QR Portal
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

          {/* Top Bento Summary Cards (Compact 2x2 on Mobile, 4 Cols on Desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Card 1: Urgent / New Queue */}
            <div
              onClick={() => setStatusFilter("OPEN")}
              className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                statusFilter === "OPEN"
                  ? "bg-red-50/50 border-red-300 shadow-sm"
                  : "bg-white border-gray-200 shadow-2xs hover:border-red-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-600 animate-ping shrink-0"></span> New / Open
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <p className="font-sans font-bold text-xl sm:text-3xl text-red-700 tracking-tight tabular-nums leading-tight">
                {openCount < 10 ? `0${openCount}` : openCount}
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-0.5 truncate">
                Awaiting review & action
              </p>
            </div>

            {/* Card 2: In Progress */}
            <div
              onClick={() => setStatusFilter("IN_PROGRESS")}
              className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                statusFilter === "IN_PROGRESS"
                  ? "bg-amber-50/50 border-amber-300 shadow-sm"
                  : "bg-white border-gray-200 shadow-2xs hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-600 shrink-0"></span> In Progress
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <p className="font-sans font-bold text-xl sm:text-3xl text-gray-900 tracking-tight tabular-nums leading-tight">
                {inProgressCount < 10 ? `0${inProgressCount}` : inProgressCount}
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-0.5 truncate">
                Currently being serviced
              </p>
            </div>

            {/* Card 3: Resolved */}
            <div
              onClick={() => setStatusFilter("RESOLVED")}
              className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                statusFilter === "RESOLVED"
                  ? "bg-emerald-50/50 border-emerald-300 shadow-sm"
                  : "bg-white border-gray-200 shadow-2xs hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 truncate">
                  <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-700 shrink-0" /> Resolved
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <p className="font-sans font-bold text-xl sm:text-3xl text-gray-900 tracking-tight tabular-nums leading-tight">
                {resolvedCount < 10 ? `0${resolvedCount}` : resolvedCount}
              </p>
              <p className="text-[10px] sm:text-[11px] text-emerald-700 font-bold mt-0.5 truncate">
                {resolutionRate}% Efficiency Rate
              </p>
            </div>

            {/* Card 4: SLA Turnaround */}
            <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-gray-200 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 truncate">
                  AVG SLA
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <p className="font-sans font-bold text-xl sm:text-3xl text-gray-900 tracking-tight tabular-nums leading-tight">
                {resolvedCount > 0 ? "1.8" : "0.0"} <span className="text-xs sm:text-sm font-semibold text-gray-500">Hours</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-0.5 truncate">
                Fast turnaround target
              </p>
            </div>
          </div>

          {/* Search, Status Tabs & Category Bar (Tenants-Page Style) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-3.5 sm:p-5 md:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by resident, room, ticket code..."
                  className="w-full pl-10 pr-9 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-gray-200 bg-gray-50 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#c2652a] focus:ring-1 focus:ring-[#c2652a] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Segment Tabs & Category Dropdown (Beside Resolved tab) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {/* Status Segment Pills */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl sm:rounded-2xl text-xs font-bold shrink-0">
                  {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg sm:rounded-xl transition-all cursor-pointer whitespace-nowrap text-xs ${
                        statusFilter === st
                          ? "bg-[#c2652a] text-white shadow-2xs font-bold"
                          : "text-gray-600 hover:text-gray-900 font-semibold"
                      }`}
                    >
                      {st === "ALL"
                        ? `All (${complaints.length})`
                        : st === "OPEN"
                        ? `Open (${openCount})`
                        : st === "IN_PROGRESS"
                        ? `In Progress (${inProgressCount})`
                        : `Resolved (${resolvedCount})`}
                    </button>
                  ))}
                </div>

                {/* Category Dropdown sitting right beside Resolved tab */}
                <div className="relative shrink-0">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className={`appearance-none pl-3 pr-8 py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                      categoryFilter !== "ALL"
                        ? "bg-orange-50 border-orange-300 text-[#c2652a] ring-1 ring-[#c2652a]/20"
                        : "bg-gray-100 border-transparent text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <option value="ALL">📂 All Categories</option>
                    <option value="Plumbing">🔧 Plumbing</option>
                    <option value="Electrical">⚡ Electrical</option>
                    <option value="Wi-Fi & Net">📶 Wi-Fi & Net</option>
                    <option value="Housekeeping">🧹 Housekeeping</option>
                    <option value="Appliance / AC">❄️ Appliance / AC</option>
                    <option value="Pest Control">🐛 Pest Control</option>
                    <option value="Security & Locks">🛡️ Security & Locks</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Active Filters Pill Bar (If Category or Search is Active) */}
            {(categoryFilter !== "ALL" || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
                <span className="text-gray-400 font-medium text-[11px]">Active Filters:</span>
                {categoryFilter !== "ALL" && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-[#c2652a] border border-orange-200 font-bold text-xs">
                    <span>Category: {categoryFilter}</span>
                    <X
                      className="w-3.5 h-3.5 cursor-pointer hover:text-red-600"
                      onClick={() => setCategoryFilter("ALL")}
                    />
                  </div>
                )}
                {searchQuery && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 border border-gray-200 font-bold text-xs">
                    <span>Search: "{searchQuery}"</span>
                    <X
                      className="w-3.5 h-3.5 cursor-pointer hover:text-red-600"
                      onClick={() => setSearchQuery("")}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 font-medium underline cursor-pointer ml-1"
                >
                  Reset all
                </button>
              </div>
            )}
          </div>

          {/* Complaint Cards Work List */}
          <div className="space-y-3 sm:space-y-4">
            {filteredComplaints.length === 0 ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-8 sm:p-12 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500 mx-auto" />
                <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900">
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
                    className={`bg-white rounded-2xl sm:rounded-3xl border p-4 sm:p-6 transition-all shadow-2xs hover:shadow-xs space-y-3.5 sm:space-y-4 ${
                      !c.isRead ? "border-l-4 border-l-[#c2652a] border-gray-200" : "border-gray-200"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-orange-50 border border-orange-200 shrink-0 mt-0.5">
                          {renderCategoryIcon(c.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="font-mono font-bold text-xs text-[#c2652a]">
                              {c.complaintNumber}
                            </span>
                            <span className="text-[10px] sm:text-xs text-gray-300">•</span>
                            <span className="text-[11px] sm:text-xs font-semibold text-gray-600 truncate">
                              {c.category}
                            </span>
                            {getStatusBadge(c.status)}
                          </div>
                          <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 mt-1 leading-snug">
                            {c.title}
                          </h3>
                        </div>
                      </div>

                      {/* Desktop Action Buttons (Right-aligned in header) */}
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(c)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                        >
                          Update Status
                        </button>

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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs bg-gray-50/70 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-gray-100">
                      <div className="flex items-center justify-between sm:block">
                        <div>
                          <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] block">
                            Resident & Contact
                          </span>
                          <span className="font-bold text-gray-900 block mt-0.5 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-[#c2652a]" /> {c.tenantName}
                          </span>
                        </div>
                        <div className="mt-1">
                          <a
                            href={`tel:${c.tenantPhone}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 hover:text-emerald-700 hover:border-emerald-300 text-[11px] font-bold shadow-2xs transition-colors"
                            title="Call Resident"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{c.tenantPhone}</span>
                          </a>
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] block">
                          Location
                        </span>
                        <span className="font-bold text-[#c2652a] block mt-0.5 flex items-center gap-1">
                          <Home className="w-3.5 h-3.5" /> {formatRoomDisplay(c.roomNumber)}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] block">
                          Logged Time & Date
                        </span>
                        <span className="font-bold text-gray-700 block mt-0.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
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
                      <span className="font-bold text-gray-900 block text-[11px]">Issue Description:</span>
                      <p className="text-gray-700 bg-gray-50 p-2.5 sm:p-3 rounded-xl border border-gray-100 leading-relaxed text-xs">
                        {c.description}
                      </p>
                    </div>

                    {/* Attached Photo Evidence Preview */}
                    {((c.photoUrls && c.photoUrls.length > 0) || c.photoUrl) && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                          Attached Photo Evidence:
                        </span>
                        <div className="flex items-center gap-2.5">
                          {(c.photoUrls || (c.photoUrl ? [c.photoUrl] : [])).map((pUrl, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => setPreviewModalImg(pUrl)}
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-gray-200 shadow-2xs hover:scale-105 transition-transform cursor-pointer relative group"
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

                    {/* Resolution Notes if resolved */}
                    {c.resolutionNotes && (
                      <div className="text-xs bg-emerald-50/60 p-2.5 sm:p-3 rounded-xl border border-emerald-200 space-y-1 text-emerald-900">
                        <span className="font-bold block flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Resolution Action Notes:
                        </span>
                        <p className="text-emerald-800 italic">{c.resolutionNotes}</p>
                      </div>
                    )}

                    {/* Mobile Action Footer (Bottom Bar on Phone screens) */}
                    <div className="pt-2 sm:hidden flex items-center gap-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => handleOpenStatusModal(c)}
                        className="flex-1 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] active:scale-98 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Update Status</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
                        title="Delete Ticket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
          onClick={() => !isSubmittingStatus && setStatusModalTicket(null)}
        >
          <div
            className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
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
                type="button"
                disabled={isSubmittingStatus}
                onClick={() => setStatusModalTicket(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Status Selection with Radio Tickers */}
            <div className="space-y-2">
              <label className="block font-bold text-gray-900 text-xs">
                Select Status:
              </label>

              <div className="grid grid-cols-1 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = selectedStatus === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedStatus(opt.key)}
                      className={`p-3 rounded-2xl border text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? opt.selectedStyle
                          : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm">{opt.emoji}</span>
                        <span className="text-xs">{opt.label}</span>
                      </div>
                      {/* Radio Ticker */}
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? opt.radioBorder : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <div className={`w-2 h-2 rounded-full ${opt.radioDot}`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Management / Resolution Note (Optional) */}
            <div className="space-y-1.5">
              <label className="block font-bold text-gray-800 text-xs">
                Management / Resolution Note <span className="text-gray-400 font-normal">(Optional)</span>:
              </label>
              <textarea
                rows={2}
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="e.g., Plumber fixed mixer tap and verified water flow."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#c2652a] focus:ring-1 focus:ring-[#c2652a] outline-none text-xs text-gray-800 placeholder:text-gray-400 resize-none transition-all"
              />
            </div>

            {/* 3. Deliverability Options (Side by side in single line as requested) */}
            <div className="pt-1 border-t border-gray-100">
              <div className="flex items-center gap-6 py-1">
                <label className="flex items-center gap-2 font-bold text-gray-800 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendViaWhatsApp}
                    onChange={(e) => setSendViaWhatsApp(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>💬 Deliver via WhatsApp</span>
                </label>

                <label className="flex items-center gap-2 font-bold text-gray-800 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendViaEmail}
                    onChange={(e) => setSendViaEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-[#c2652a] accent-[#c2652a] focus:ring-[#c2652a] cursor-pointer"
                  />
                  <span>✉️ Deliver via Email</span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isSubmittingStatus}
                onClick={() => setStatusModalTicket(null)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingStatus}
                onClick={handleConfirmStatusUpdate}
                className="px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingStatus ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Confirm & Update Status</span>
                )}
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
              <div>
                <label className="block font-bold text-gray-900 mb-1">
                  Resident Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    maxLength={16}
                    value={logTenantPhone}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text");
                      const clean = normalizePhoneNumber(pasted);
                      handleWalkInPhoneChange(clean);
                    }}
                    onChange={(e) => handleWalkInPhoneChange(e.target.value)}
                    placeholder="Enter 10-digit mobile number..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a] tabular-nums"
                  />
                </div>
              </div>

              {/* Auto-detected Resident Card */}
              {logVerifiedOccupant && (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                        <span>{logVerifiedOccupant.name}</span>
                        <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          Active Resident
                        </span>
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Room {logVerifiedOccupant.roomNumber} ({logVerifiedOccupant.bedCode || "Bed A"}) • {logVerifiedOccupant.stayType || "Resident"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fallback if mobile number is not in resident directory */}
              {logPhoneError && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-amber-800 text-[11px] font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{logPhoneError}</span>
                  </div>
                  <div>
                    <label className="block font-bold text-amber-950 text-[11px] mb-1">
                      Enter Resident Name Manually *
                    </label>
                    <input
                      type="text"
                      required
                      value={logTenantName}
                      onChange={(e) => setLogTenantName(e.target.value)}
                      placeholder="e.g. Vikram Malhotra"
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a]"
                    />
                  </div>
                </div>
              )}

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
      <PublicComplaintQrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        propertyId={propertyId}
        propertyName={propertySettings.propertyName || propertyId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
      />

      {/* FULLSCREEN PHOTO ZOOM MODAL */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[85vh] bg-white rounded-3xl p-2 shadow-2xl overflow-hidden"
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
    </div>
  );
}
