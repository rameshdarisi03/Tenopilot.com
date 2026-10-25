"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { PublicComplaintQrModal } from "@/components/PublicComplaintQrModal";
import { AnimatedNumberCounter } from "@/components/motion/AnimatedNumberCounter";
import { MagneticGlowCard } from "@/components/motion/MagneticGlowCard";
import {
  Building2,
  Users,
  Wallet,
  Wrench,
  ArrowUpRight,
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Clock,
  Send,
  UserPlus,
  Bell,
  Settings,
  ExternalLink,
  Receipt,
  FileText,
  ShieldCheck,
  Copy,
  Check,
  QrCode,
  Download,
  Printer,
  Sparkles,
  HelpCircle,
  MapPin,
} from "lucide-react";

import { GuidedSpotlightTour, TourStep } from "@/components/onboarding/GuidedSpotlightTour";

import { propertySettingsStore } from "@/constants/propertySettings";
import { usePlatformConfig } from "@/lib/usePlatformConfig";
import { evaluateSubscription } from "@/lib/subscriptionEngine";
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { propertyStore, FloorConfig } from "@/constants/propertyLayoutStore";
import { subscribeToComplaints, Complaint } from "@/lib/complaintStore";
import { subscribeOccupantsFromFirestore } from "@/lib/firestoreService";
import { buildWhatsAppUrl } from "@/utils/security";
import { useAuth } from "@/providers/AuthProvider";
import { calculateOccupantFinancialStatement, calculatePropertyRentComplianceSummary } from "@/utils/domainSSOT";

function getTimeAwareGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "overview-header",
    targetSelector: '[data-tour="property-header"]',
    title: "Your Command Center",
    description:
      "Welcome to your property flight deck! Manage front desk operations, track daily activity, access the financial hub, and monitor real-time property health.",
    icon: Building2,
    placement: "bottom",
  },
  {
    id: "property-setup",
    targetSelector: '[data-tour="property-setup"]',
    title: "Layout & FastTrack AI Setup",
    description:
      "Easily configure your floors, rooms, and bed types, or use FastTrack AI to ingest paper registers and spreadsheets automatically.",
    icon: Sparkles,
    placement: "bottom",
  },
  {
    id: "kpi-bento",
    targetSelector: '[data-tour="kpi-grid"]',
    title: "Real-Time Operational KPIs",
    description:
      "Instant visibility into vacant beds, total rent collected this month, overdue compliance counts, and pending maintenance tickets.",
    icon: Wallet,
    placement: "bottom",
  },
  {
    id: "financial-hub",
    targetSelector: '[data-tour="financial-hub-btn"]',
    title: "Dual-Ledger Financial Hub",
    description:
      "Deep financial ledger tracking: separate Rent and Security Deposit ledgers, automated pro-rata billing, and GST invoices.",
    icon: Receipt,
    placement: "bottom",
  },
  {
    id: "resident-qr-portal",
    targetSelector: '[data-tour="complaint-portal"]',
    title: "Resident Complaint QR Code",
    description:
      "Print this QR code and paste it on room doors or reception. Residents can scan to lodge maintenance tickets directly.",
    icon: QrCode,
    placement: "top",
  },
];

export default function PropertyOverviewPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "";
  const [portalUrl, setPortalUrl] = useState(`https://www.tenopilot.com/p/${propertyId}/public-complaint`);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !propertyId) return;

    const urlParams = new URLSearchParams(window.location.search);
    const hasTourParam = urlParams.get("tour") === "true";
    const hasSeenTour = localStorage.getItem(`tenopilot_tour_seen_${propertyId}`);

    if (hasTourParam || !hasSeenTour) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [propertyId]);

  const handleCloseTour = () => {
    setShowTour(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(`tenopilot_tour_seen_${propertyId}`, "true");
      const url = new URL(window.location.href);
      if (url.searchParams.has("tour")) {
        url.searchParams.delete("tour");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }
  };

  const handleCopyLink = async () => {
    const urlToCopy = portalUrl || (typeof window !== "undefined" ? `${window.location.origin}/p/${propertyId}/public-complaint` : `/p/${propertyId}/public-complaint`);
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const [propertySettings, setPropertySettings] = useState(() =>
    propertySettingsStore.getSettings(propertyId)
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { profile } = useAuth();
  const sub = evaluateSubscription(profile);
  const { config: platformConfig } = usePlatformConfig();
  const userName =
    profile?.displayName ||
    (typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("tenopilot_saved_session") || "{}")?.name
      : "") ||
    "Admin";
  const greetingText = `${getTimeAwareGreeting()}, ${userName}!`;

  const [occupants, setOccupants] = useState<Occupant[]>(() => occupantStore.getOccupants(propertyId));
  const [structure, setStructure] = useState<FloorConfig[]>(() => propertyStore.getStructure(propertyId));
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    propertySettingsStore.initFirebaseListener(propertyId);
    setPropertySettings(propertySettingsStore.getSettings(propertyId));
    const unsubscribeSettings = propertySettingsStore.subscribe(() => {
      setPropertySettings(propertySettingsStore.getSettings(propertyId));
    });
    return unsubscribeSettings;
  }, [propertyId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const baseDomain = isLocal ? window.location.origin : "https://www.tenopilot.com";
      setPortalUrl(`${baseDomain}/p/${propertyId}/public-complaint`);
    }
  }, [propertyId]);

  useEffect(() => {
    setOccupants(occupantStore.getOccupants(propertyId));
    setStructure(propertyStore.getStructure(propertyId));

    if (!propertyId) {
      setOccupants([]);
      setStructure([]);
      setComplaints([]);
      return;
    }
    const unsubOcc = occupantStore.subscribe(() => setOccupants(occupantStore.getOccupants(propertyId)));
    const unsubProp = propertyStore.subscribe(() => setStructure(propertyStore.getStructure(propertyId)));
    const unsubComp = subscribeToComplaints(propertyId, (list) => setComplaints(list || []));

    const unsubFirestore = subscribeOccupantsFromFirestore(propertyId, (fsOccupants) => {
      if (fsOccupants && fsOccupants.length > 0) {
        occupantStore.setOccupantsFromFirestore(fsOccupants, propertyId);
      } else {
        occupantStore.setOccupantsFromFirestore([], propertyId);
      }
      setOccupants(occupantStore.getOccupants(propertyId));
    });

    return () => {
      unsubOcc();
      unsubProp();
      unsubComp();
      unsubFirestore();
    };
  }, [propertyId]);

  // Dynamic Property Layout & Occupancy Metrics
  let totalBeds = 0;
  let occupiedBeds = 0;
  structure.forEach((fl) => {
    fl.rooms.forEach((rm) => {
      rm.beds.forEach((bd) => {
        totalBeds++;
        if (bd.status === "Occupied" || bd.status === "Vacating" || bd.status === "Guest" || bd.occupant) {
          occupiedBeds++;
        }
      });
    });
  });

  const occRatePct = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : "0.0";

  // SSOT Property-Wide Rent Compliance Summary
  const rentCompliance = useMemo(() => {
    return calculatePropertyRentComplianceSummary(occupants, propertySettings);
  }, [occupants, propertySettings]);

  // Financial Metrics Calculation
  let totalCollectedThisMonth = rentCompliance.totalCollectedThisCycle;
  let totalPendingDue = rentCompliance.totalPendingDueAmount;
  let overdueCount = rentCompliance.overdueTenantsCount;
  let pendingCount = rentCompliance.totalPendingDueCount;

  const openComplaintsCount = complaints.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS").length;

  // Format Large Currency (e.g. ₹4.25L or ₹75K)
  const formatCompactCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  // Recent Activity Feed Generation (Real-Time Property Events)
  const recentActivities = useMemo(() => {
    const list: { id: string; type: "PAYMENT" | "ONBOARDING" | "COMPLAINT" | "NOTICE"; title: string; subtitle: string; time: string; color: string }[] = [];

    // Recent payments
    occupants.forEach((occ) => {
      (occ.paymentHistory || []).forEach((pm, idx) => {
        list.push({
          id: `pm-${occ.id}-${idx}`,
          type: "PAYMENT",
          title: "Payment Received",
          subtitle: `${occ.name} (Room ${occ.roomNumber || "N/A"}) paid ₹${pm.amount.toLocaleString("en-IN")} via ${pm.mode || "UPI"}.`,
          time: pm.date || "Recently",
          color: "bg-emerald-50 text-emerald-600 border-emerald-200",
        });
      });

      if (occ.lifecycleStatus === "Active" && occ.joiningDate) {
        list.push({
          id: `onb-${occ.id}`,
          type: "ONBOARDING",
          title: "Resident Onboarded",
          subtitle: `${occ.name} completed digital onboarding for Room ${occ.roomNumber || "N/A"}.`,
          time: occ.joiningDate,
          color: "bg-blue-50 text-blue-600 border-blue-200",
        });
      }

      if (occ.lifecycleStatus === "Notice") {
        list.push({
          id: `not-${occ.id}`,
          type: "NOTICE",
          title: "Notice Period Marked",
          subtitle: `${occ.name} marked vacating for Room ${occ.roomNumber || "N/A"}.`,
          time: "Active Notice",
          color: "bg-amber-50 text-amber-600 border-amber-200",
        });
      }
    });

    // Recent complaints
    (Array.isArray(complaints) ? complaints : []).forEach((c) => {
      list.push({
        id: `cmp-${c.id}`,
        type: "COMPLAINT",
        title: "New Ticket Logged",
        subtitle: `${c.title} reported by ${c.tenantName} (${c.roomNumber}).`,
        time: c.createdAt || "Recently",
        color: "bg-rose-50 text-rose-600 border-rose-200",
      });
    });

    return list.slice(0, 5);
  }, [occupants, complaints]);

  // Calculate KYC & Police verification metrics
  const activeOccupants = occupants.filter((o) => o.lifecycleStatus === "Active" || o.lifecycleStatus === "Notice");
  const kycVerifiedCount = activeOccupants.filter((o) => o.kycVerified).length;
  const noticeOccupants = occupants.filter((o) => o.lifecycleStatus === "Notice");

  const handleSendWhatsAppReminders = () => {
    router.push(`/p/${propertyId}/tenants?filter=due&sendReminders=true`);
  };

  const quickActionsCard = (
    <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
      <div>
        <h3 className="font-serif font-bold text-xl text-gray-900">
          Quick Actions
        </h3>
        <p className="text-xs text-gray-500 font-medium">1-Tap shortcuts for daily front desk operations</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/p/${propertyId}/tenants/onboard-tenant`}
          className="p-4 rounded-2xl bg-gray-50 border border-gray-200 hover:border-[#c2652a] hover:bg-orange-50/40 text-center transition-all flex flex-col items-center justify-center gap-2 group shadow-2xs"
        >
          <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-[#c2652a] group-hover:scale-110 transition-transform">
            <UserPlus className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-900">Onboard Tenant</span>
        </Link>

        <button
          onClick={handleSendWhatsAppReminders}
          className="p-4 rounded-2xl bg-gray-50 border border-gray-200 hover:border-[#c2652a] hover:bg-orange-50/40 text-center transition-all flex flex-col items-center justify-center gap-2 group shadow-2xs cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-[#c2652a] group-hover:scale-110 transition-transform">
            <Bell className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-900">Reminders</span>
        </button>

        <Link
          href={`/p/${propertyId}/financial-hub`}
          className="p-4 rounded-2xl bg-gray-50 border border-gray-200 hover:border-[#c2652a] hover:bg-orange-50/40 text-center transition-all flex flex-col items-center justify-center gap-2 group shadow-2xs"
        >
          <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-[#c2652a] group-hover:scale-110 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-900">Financial Hub</span>
        </Link>

        <Link
          data-tour={totalBeds > 0 ? "property-setup" : undefined}
          href={`/p/${propertyId}/property-setup`}
          className="p-4 rounded-2xl bg-gray-50 border border-gray-200 hover:border-[#c2652a] hover:bg-orange-50/40 text-center transition-all flex flex-col items-center justify-center gap-2 group shadow-2xs"
        >
          <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-[#c2652a] group-hover:scale-110 transition-transform">
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-900">Property Setup</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-gray-900 font-sans selection:bg-[#c2652a]/20 selection:text-[#c2652a]">
      {/* 256px Left Sidebar */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <PropertyHeader
          title="Overview"
          showSearch={false}
          propertyId={propertyId}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Workspace Body */}
        <div className="p-4 md:p-8 space-y-6 flex-1 max-w-[1280px] mx-auto w-full pb-24">
          {/* Greeting Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div data-tour="property-header">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold tracking-wide bg-orange-50 text-[#c2652a] px-3 py-1 rounded-full border border-orange-200 flex items-center gap-1.5 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-[#c2652a] shrink-0" />
                  <span>{propertySettings.propertyName}</span>
                </span>
                {propertySettings.propertyAddress && (
                  <span className="text-xs font-medium text-gray-600 bg-gray-100/90 px-3 py-1 rounded-full border border-gray-200 truncate max-w-[260px] sm:max-w-md flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{propertySettings.propertyAddress}</span>
                  </span>
                )}
              </div>
              <h1 className="font-serif font-bold text-3xl sm:text-4xl text-gray-900 mt-2 tracking-tight">
                {greetingText}
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowTour(true)}
                title="Start Guided Product Tour"
                className="px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-[#c2652a]/40 hover:bg-orange-50/40 text-gray-700 hover:text-[#964407] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#c2652a]" />
                <span className="hidden sm:inline">Product Tour</span>
              </button>

              <Link
                data-tour="financial-hub-btn"
                href={`/p/${propertyId}/financial-hub`}
                className="px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer shrink-0"
              >
                <span>Go to Financial Hub</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* If Property is Brand New (0 Beds Configured), show Setup Banner */}
          {totalBeds === 0 && (
            <div data-tour="property-setup" className="p-6 rounded-3xl bg-gradient-to-r from-[#fff8f6] to-[#faefe8] border-2 border-dashed border-[#c2652a]/40 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#c2652a]/15 text-[#964407] flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-gray-900">
                    Welcome to {propertySettings.propertyName}! 🏢
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Your property layout has 0 rooms/beds. Set up your floors & beds or use FastTrack AI to import your ledger.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                <Link
                  href={`/p/${propertyId}/property-setup`}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white text-xs font-bold transition-all shadow-sm text-center flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Configure Property Layout</span>
                </Link>
              </div>
            </div>
          )}

          {/* 4 High-Impact Operational KPI Bento Cards */}
          <div data-tour="kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Vacant Inventory & Occupancy */}
            <Link
              href={`/p/${propertyId}/property-map?filter=available`}
              className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs hover:border-[#c2652a] hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer active:scale-[0.98]"
              title="Click to view all vacant and available beds on Floor Map"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  VACANT INVENTORY
                </span>
                <div className="p-2.5 rounded-xl bg-orange-50 text-[#c2652a] group-hover:scale-110 group-hover:bg-[#c2652a] group-hover:text-white transition-all">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-sans font-bold text-3xl text-gray-900 tracking-tight">
                  {totalBeds - occupiedBeds} <span className="text-lg font-semibold text-gray-500">Vacant Beds</span>
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs font-bold text-[#c2652a]">
                    {occupiedBeds} / {totalBeds} Beds Occupied ({occRatePct}%)
                  </p>
                  <span className="text-[10px] font-extrabold text-[#c2652a] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    View Floor Map ➔
                  </span>
                </div>
              </div>
            </Link>

            {/* Card 2: Rent Collected */}
            <div className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs hover:border-emerald-500/60 transition-all flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  RENT COLLECTED
                </span>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-sans font-bold text-3xl text-emerald-600 tracking-tight">
                  {formatCompactCurrency(totalCollectedThisMonth)}
                </p>
                <p className="text-xs font-bold text-emerald-700 mt-1">
                  Collected this month
                </p>
              </div>
            </div>

            {/* Card 3: Rent Pending (Overdue Compliance SSOT) */}
            <Link
              href={`/p/${propertyId}/tenants?filter=due&sendReminders=true`}
              className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs hover:border-[#c2652a] hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer active:scale-[0.98]"
              title="Click to view all overdue residents and send reminders"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  RENT PENDING
                </span>
                <div className="p-2.5 rounded-xl bg-orange-50 text-[#c2652a] group-hover:scale-110 group-hover:bg-[#c2652a] group-hover:text-white transition-all">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-sans font-bold text-3xl text-gray-900 tracking-tight">
                  {rentCompliance.totalPendingDueCount}{" "}
                  <span className="text-lg font-semibold text-gray-500">
                    {rentCompliance.totalPendingDueCount === 1 ? "Tenant Rent Pending" : "Tenants Rent Pending"}
                  </span>
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs font-bold text-[#c2652a]">
                    {rentCompliance.paidTenantsCount} / {rentCompliance.totalActiveTenants} Tenants have paid rent ({rentCompliance.paidRatePct}%)
                    {rentCompliance.overdueTenantsCount > 0 && (
                      <span className="text-amber-800 font-extrabold ml-1">
                        • {rentCompliance.overdueTenantsCount} Overdue
                      </span>
                    )}
                  </p>
                  <span className="text-[10px] font-extrabold text-[#c2652a] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Send Reminders ➔
                  </span>
                </div>
              </div>
            </Link>

            {/* Card 4: Maintenance */}
            <div className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs hover:border-rose-500/60 transition-all flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  MAINTENANCE TICKETS
                </span>
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-105 transition-transform">
                  <Wrench className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <p className="font-serif font-bold text-3xl text-rose-600 tracking-tight">
                    {openComplaintsCount}
                  </p>
                  <p className="text-xs font-bold text-rose-700 mt-1">
                    Open Complaints
                  </p>
                </div>
                <Link
                  href={`/p/${propertyId}/complaints`}
                  className="text-xs font-extrabold text-[#c2652a] hover:underline flex items-center gap-0.5"
                >
                  <span>View Tickets</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Main 2-Column Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (60%): Move-out Notice Radar & Recent Activity Feed */}
            <div className="lg:col-span-7 space-y-6">
              {/* Notice & Vacancy Radar */}
              {noticeOccupants.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-700 font-bold">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-lg text-gray-900">
                          Notice Period Radar ({noticeOccupants.length} Vacating Soon)
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                          Market and assign these beds to upcoming leads in advance
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      ACTION REQUIRED
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {noticeOccupants.slice(0, 3).map((occ) => (
                      <div key={occ.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs">
                            {occ.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{occ.name}</p>
                            <p className="text-[11px] text-gray-500">Room {occ.roomNumber} ({occ.bedCode}) • Vacating Soon</p>
                          </div>
                        </div>

                        <Link
                          href={`/p/${propertyId}/tenants/${occ.id}`}
                          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all"
                        >
                          View Tenant ➔
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile-Only: Quick Actions displayed directly above Recent Activity */}
              <div className="block lg:hidden">
                {quickActionsCard}
              </div>

              {/* Recent Activity Audit Timeline Feed */}
              <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 sm:pb-4">
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-gray-900">
                    Recent Property Activity
                  </h3>
                  {recentActivities.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setIsActivityExpanded(!isActivityExpanded)}
                      className="lg:hidden p-1.5 rounded-xl hover:bg-orange-50 text-gray-500 hover:text-[#c2652a] transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                      title={isActivityExpanded ? "Collapse" : "Expand"}
                    >
                      <span>{isActivityExpanded ? "Collapse" : "Expand"}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isActivityExpanded ? "rotate-180 text-[#c2652a]" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {recentActivities.length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-500 space-y-2">
                      <p className="font-bold text-sm text-gray-900">No Activity Logged Yet</p>
                      <p>Onboard your first resident or configure property setup to get started.</p>
                    </div>
                  ) : (
                    recentActivities.map((act, idx) => {
                      const isHiddenOnMobile = idx >= 2 && !isActivityExpanded;
                      return (
                        <div
                          key={act.id}
                          className={`items-start gap-3.5 sm:gap-4 p-3 sm:p-3.5 rounded-2xl bg-gray-50 border border-gray-200/70 hover:border-[#c2652a]/40 hover:bg-white transition-all ${
                            isHiddenOnMobile ? "hidden lg:flex" : "flex"
                          }`}
                        >
                          <div className={`p-2 sm:p-2.5 rounded-xl border ${act.color} shrink-0 mt-0.5`}>
                            {act.type === "PAYMENT" && <Wallet className="w-4 h-4" />}
                            {act.type === "ONBOARDING" && <UserPlus className="w-4 h-4" />}
                            {act.type === "COMPLAINT" && <Wrench className="w-4 h-4" />}
                            {act.type === "NOTICE" && <Clock className="w-4 h-4" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-xs text-gray-900">{act.title}</p>
                              <span className="text-[10px] text-gray-400 font-mono">{act.time}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5 leading-snug">{act.subtitle}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Mobile Expand / Collapse View Button */}
                {recentActivities.length > 2 && (
                  <div className="pt-1 lg:hidden">
                    <button
                      type="button"
                      onClick={() => setIsActivityExpanded(!isActivityExpanded)}
                      className="w-full py-2 px-3 rounded-xl bg-orange-50/80 hover:bg-orange-100/80 text-[#c2652a] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
                    >
                      <span>
                        {isActivityExpanded
                          ? "Show Less"
                          : `View More (${recentActivities.length - 2} more)`}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isActivityExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (40%): Quick Actions, KYC Pulse & Resident Portal */}
            <div className="lg:col-span-5 space-y-6">
              {/* Desktop-Only: Quick Actions Card */}
              <div className="hidden lg:block">
                {quickActionsCard}
              </div>

              {/* KYC & Police Compliance Pulse */}
              <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-base text-gray-900">
                        KYC & Police Compliance
                      </h4>
                      <p className="text-xs text-gray-500 font-medium">
                        Aadhaar & Police verification status
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    {kycVerifiedCount} / {activeOccupants.length} Verified
                  </span>
                </div>

                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${activeOccupants.length > 0 ? (kycVerifiedCount / activeOccupants.length) * 100 : 100}%`,
                    }}
                  ></div>
                </div>

                <p className="text-[11px] text-gray-500 leading-snug">
                  🛡️ Keeps your PG safe and verified for local police records.
                </p>
              </div>

              {/* Resident Complaint Portal QR Code Card */}
              <div data-tour="complaint-portal" className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-50 text-[#c2652a]">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-xl text-gray-900">
                    Complaints Portal QR
                  </h3>
                </div>
                <p className="text-xs text-gray-500 max-w-xs mx-auto font-medium">
                  Print or share this QR code for residents to report maintenance issues directly.
                </p>

                <div className="w-40 h-40 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs mx-auto flex items-center justify-center">
                  <QRCodeSVG
                    value={portalUrl || (typeof window !== "undefined" ? `${window.location.origin}/p/${propertyId}/public-complaint` : `/p/${propertyId}/public-complaint`)}
                    size={140}
                    fgColor="#111827"
                    bgColor="#ffffff"
                    level="H"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#c2652a] hover:bg-[#a3521e] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>Download / Print QR Poster</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`/p/${propertyId}/public-complaint`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-2.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Test Link</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full py-2.5 px-2.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-emerald-700 font-bold truncate">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span className="truncate">Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REUSABLE PRINTABLE QR MODAL */}
      <PublicComplaintQrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        propertyId={propertyId}
        propertyName={propertySettings.propertyName || propertyId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
      />

      {/* GUIDED SPOTLIGHT ONBOARDING TOUR */}
      <GuidedSpotlightTour
        steps={TOUR_STEPS}
        isOpen={showTour}
        onClose={handleCloseTour}
        onComplete={handleCloseTour}
      />
    </div>
  );
}
