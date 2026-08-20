"use client";

import { use, useState, useEffect, useMemo } from "react";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
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
} from "lucide-react";

import { propertySettingsStore } from "@/constants/propertySettings";
import { occupantStore, Occupant } from "@/constants/mockOccupants";
import { propertyStore, FloorConfig } from "@/constants/propertyLayoutStore";
import { subscribeToComplaints, Complaint } from "@/lib/complaintStore";
import { useAuth } from "@/providers/AuthProvider";
import { calculateOccupantFinancialStatement } from "@/utils/domainSSOT";

function getTimeAwareGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

export default function PropertyOverviewPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams?.propertyId || "sunshine-pg";
  const [portalUrl, setPortalUrl] = useState(`http://localhost:3000/p/${propertyId}/public-complaint`);
  const [copiedLink, setCopiedLink] = useState(false);

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
      setPortalUrl(`${window.location.origin}/p/${propertyId}/public-complaint`);
    }
  }, [propertyId]);

  useEffect(() => {
    setOccupants(occupantStore.getOccupants(propertyId));
    setStructure(propertyStore.getStructure(propertyId));

    const unsubOcc = occupantStore.subscribe(() => setOccupants(occupantStore.getOccupants(propertyId)));
    const unsubProp = propertyStore.subscribe(() => setStructure(propertyStore.getStructure(propertyId)));
    const unsubComp = subscribeToComplaints(propertyId, (list) => setComplaints(list));

    return () => {
      unsubOcc();
      unsubProp();
      unsubComp();
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

  // Financial Metrics Calculation
  let totalCollectedThisMonth = 0;
  let totalPendingDue = 0;
  let overdueCount = 0;
  let pendingCount = 0;

  occupants.forEach((occ) => {
    if (occ.lifecycleStatus === "Active" || occ.lifecycleStatus === "Notice") {
      const stmt = calculateOccupantFinancialStatement(occ);
      totalCollectedThisMonth += stmt.totalRentPaid;
      totalPendingDue += stmt.netOutstandingBalance;
      if (stmt.netOutstandingBalance > 0) {
        pendingCount++;
        if (occ.paymentStatus === "Overdue" || occ.daysDiff < 0) overdueCount++;
      }
    }
  });

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
    complaints.forEach((c) => {
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

  const handleSendWhatsAppReminders = () => {
    const overdueOccupants = occupants.filter((o) => o.paymentStatus === "Overdue" || o.daysDiff < 0);
    if (overdueOccupants.length === 0) {
      alert("🟢 All residents are up-to-date! No pending overdue rent reminders needed.");
      return;
    }
    const target = overdueOccupants[0];
    const text = encodeURIComponent(`Hello ${target.name}, this is a gentle reminder regarding your monthly rent payment of ₹${target.rentAmount} for ${propertySettings.propertyName}. Please clear your dues at your earliest convenience. Thank you!`);
    window.open(`https://wa.me/91${target.phone}?text=${text}`, "_blank");
  };

  return (
    <div className="flex min-h-screen bg-[#fff8f6] text-[#201a17]">
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
        <div className="p-4 md:p-8 space-y-6 flex-1 max-w-[1240px] mx-auto w-full pb-24">
          {/* Greeting Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#f8ede3] text-[#964407] px-3 py-1 rounded-full border border-[#d7c2b9]">
                  10-DAY FREE TRIAL ACTIVE
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  OPERATIONAL HEALTHY 🟢
                </span>
              </div>
              <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#201a17] mt-2 tracking-tight">
                {greetingText}
              </h1>
              <p className="text-xs sm:text-sm text-[#554339] mt-1 font-medium">
                {propertySettings.propertyName} • {propertySettings.propertyAddress} • {totalBeds} Total Beds • {occRatePct}% Occupancy
              </p>
            </div>

            <Link
              href={`/p/${propertyId}/financial-hub`}
              className="px-5 py-2.5 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 active:scale-95 cursor-pointer shrink-0"
            >
              <span>Go to Financial Hub</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Urgent Attention Alert Banner */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-900 shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 block">
                  URGENT ATTENTION NEEDED
                </span>
                <p className="text-xs sm:text-sm font-bold text-[#201a17]">
                  {overdueCount > 0 ? `${overdueCount} Overdue Rent Payments Pending` : "No Overdue Rent Payments"} • {occupants.filter(o => o.lifecycleStatus === "Notice").length} Rooms Vacating Soon
                </p>
              </div>
            </div>

            <button
              onClick={handleSendWhatsAppReminders}
              className="px-4 py-2 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send WhatsApp Reminders</span>
            </button>
          </div>

          {/* 4 Core Real-Time KPI Bento Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Occupancy */}
            <MagneticGlowCard glowColor="rgba(150, 68, 7, 0.12)" className="p-5 rounded-3xl bg-white border border-[#d7c2b9] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                  OCCUPANCY
                </span>
                <div className="p-2 rounded-xl bg-[#f8ede3] text-[#964407]">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-serif font-bold text-3xl text-[#964407] tracking-tight">
                  {occRatePct}%
                </p>
                <p className="text-xs font-bold text-[#554339] mt-0.5">
                  {occupiedBeds} / {totalBeds} Beds Occupied
                </p>
              </div>
            </MagneticGlowCard>

            {/* Card 2: Rent Collected */}
            <MagneticGlowCard glowColor="rgba(16, 185, 129, 0.12)" className="p-5 rounded-3xl bg-white border border-[#d7c2b9] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                  RENT COLLECTED
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-serif font-bold text-3xl text-emerald-600 tracking-tight">
                  {formatCompactCurrency(totalCollectedThisMonth)}
                </p>
                <p className="text-xs font-bold text-emerald-700 mt-0.5">
                  Collected this month
                </p>
              </div>
            </MagneticGlowCard>

            {/* Card 3: Pending Due */}
            <MagneticGlowCard glowColor="rgba(217, 119, 6, 0.12)" className="p-5 rounded-3xl bg-white border border-[#d7c2b9] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                  PENDING DUE
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="font-serif font-bold text-3xl text-amber-600 tracking-tight">
                  {formatCompactCurrency(totalPendingDue)}
                </p>
                <p className="text-xs font-bold text-[#554339] mt-0.5">
                  Across {pendingCount} residents
                </p>
              </div>
            </MagneticGlowCard>

            {/* Card 4: Maintenance */}
            <MagneticGlowCard glowColor="rgba(190, 18, 60, 0.12)" className="p-5 rounded-3xl bg-white border border-[#d7c2b9] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#554339]">
                  MAINTENANCE
                </span>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Wrench className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <p className="font-serif font-bold text-3xl text-rose-600 tracking-tight">
                    {openComplaintsCount}
                  </p>
                  <p className="text-xs font-bold text-rose-700 mt-0.5">
                    Open Complaints
                  </p>
                </div>
                <Link
                  href={`/p/${propertyId}/complaints`}
                  className="text-xs font-extrabold text-[#964407] hover:underline flex items-center gap-0.5"
                >
                  <span>View Tickets</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </MagneticGlowCard>
          </div>

          {/* Main 2-Column Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (60%): Recent Activity Audit Timeline Feed */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#d7c2b9] p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#f8ede3] pb-4">
                <h3 className="font-serif font-bold text-2xl text-[#201a17]">
                  Recent Activity
                </h3>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#964407] bg-[#f8ede3] px-2.5 py-1 rounded-full border border-[#d7c2b9]">
                  REAL-TIME FEED
                </span>
              </div>

              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#554339] space-y-2">
                    <p className="font-bold text-sm text-[#201a17]">No Activity Logged Yet</p>
                    <p>Onboard your first resident or configure property setup to get started.</p>
                  </div>
                ) : (
                  recentActivities.map((act) => (
                    <div key={act.id} className="flex items-start gap-4 p-3.5 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9]/40 hover:border-[#964407]/40 transition-all">
                      <div className={`p-2.5 rounded-xl border ${act.color} shrink-0 mt-0.5`}>
                        {act.type === "PAYMENT" && <Wallet className="w-4 h-4" />}
                        {act.type === "ONBOARDING" && <UserPlus className="w-4 h-4" />}
                        {act.type === "COMPLAINT" && <Wrench className="w-4 h-4" />}
                        {act.type === "NOTICE" && <Clock className="w-4 h-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs text-[#201a17]">{act.title}</p>
                          <span className="text-[10px] text-[#554339] font-medium">{act.time}</span>
                        </div>
                        <p className="text-xs text-[#554339] mt-0.5 leading-snug">{act.subtitle}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-[#f8ede3]">
                <Link
                  href={`/p/${propertyId}/tenants`}
                  className="text-xs font-bold text-[#964407] hover:underline flex items-center gap-1"
                >
                  <span>View Full Directory & Log</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Column (40%): Quick Actions & Resident Portal */}
            <div className="lg:col-span-5 space-y-6">
              {/* Quick Actions Card */}
              <div className="bg-white rounded-3xl border border-[#d7c2b9] p-6 shadow-xs space-y-4">
                <h3 className="font-serif font-bold text-2xl text-[#201a17]">
                  Quick Actions
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href={`/p/${propertyId}/tenants/onboard-tenant`}
                    className="p-4 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] hover:border-[#964407] hover:bg-[#f8ede3] text-center transition-all flex flex-col items-center justify-center gap-2 group shadow-2xs"
                  >
                    <div className="p-2.5 rounded-xl bg-white border border-[#d7c2b9] text-[#964407] group-hover:scale-110 transition-transform">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[#201a17]">Onboard</span>
                  </Link>

                  <button
                    onClick={handleSendWhatsAppReminders}
                    className="p-4 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] hover:border-[#964407] hover:bg-[#f8ede3] text-center transition-all flex flex-col items-center justify-center gap-2 group shadow-2xs cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-white border border-[#d7c2b9] text-[#964407] group-hover:scale-110 transition-transform">
                      <Bell className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[#201a17]">Reminders</span>
                  </button>

                  <Link
                    href={`/p/${propertyId}/complaints`}
                    className="p-4 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] hover:border-[#964407] hover:bg-[#f8ede3] text-center transition-all flex flex-col items-center justify-center gap-2 group shadow-2xs"
                  >
                    <div className="p-2.5 rounded-xl bg-white border border-[#d7c2b9] text-[#964407] group-hover:scale-110 transition-transform">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[#201a17]">Log Ticket</span>
                  </Link>

                  <Link
                    href={`/p/${propertyId}/property-setup`}
                    className="p-4 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] hover:border-[#964407] hover:bg-[#f8ede3] text-center transition-all flex flex-col items-center justify-center gap-2 group shadow-2xs"
                  >
                    <div className="p-2.5 rounded-xl bg-white border border-[#d7c2b9] text-[#964407] group-hover:scale-110 transition-transform">
                      <Settings className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[#201a17]">Setup</span>
                  </Link>
                </div>
              </div>

              {/* Resident Complaint Portal QR Code Card */}
              <div className="bg-white rounded-3xl border border-[#d7c2b9] p-6 shadow-xs space-y-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-50 text-[#964407]">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-2xl text-[#201a17]">
                    Complaints Portal
                  </h3>
                </div>
                <p className="text-xs text-[#554339] max-w-xs mx-auto font-medium">
                  Print or share this QR code for residents to report maintenance issues and lodge 24/7 complaints directly.
                </p>

                <div className="w-40 h-40 bg-white p-3 rounded-2xl border border-[#d7c2b9] shadow-sm mx-auto flex items-center justify-center">
                  <QRCodeSVG
                    value={portalUrl || (typeof window !== "undefined" ? `${window.location.origin}/p/${propertyId}/public-complaint` : `/p/${propertyId}/public-complaint`)}
                    size={140}
                    fgColor="#201a17"
                    bgColor="#ffffff"
                    level="H"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <a
                    href={`/p/${propertyId}/public-complaint`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#964407] hover:bg-[#803804] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                  >
                    <ExternalLink className="w-4 h-4 text-white" />
                    <span>Open Complaints Portal</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#d7c2b9] hover:border-[#964407] hover:bg-[#fff8f6] text-[#554339] hover:text-[#964407] font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Link Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                        <span>Copy Direct Link</span>
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
  );
}
