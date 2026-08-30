"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FounderSidebar } from "@/components/founder/FounderSidebar";
import { FounderHeader } from "@/components/founder/FounderHeader";
import {
  Building2,
  Search,
  Eye,
  Clock,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Phone,
  Mail,
  Layers,
  Sparkles,
  TrendingUp,
  CreditCard,
  Ban,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  Plus,
  Trash2,
  RefreshCw,
  Zap,
  HardDrive,
  UserX,
  FileSpreadsheet,
  AlertOctagon,
} from "lucide-react";
import { ScannedAccountRecord } from "@/app/api/apex/scan-accounts/route";

export default function ApexCommandClientsPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accounts, setAccounts] = useState<ScannedAccountRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "TRIAL" | "ACTIVE_PRO" | "GRACE_PERIOD" | "EXPIRED" | "SUSPENDED">("ALL");

  // Selected account for Deep Purge modal
  const [accountToPurge, setAccountToPurge] = useState<ScannedAccountRecord | null>(null);
  const [purgeConfirmationInput, setPurgeConfirmationInput] = useState("");
  const [isPurging, setIsPurging] = useState(false);

  // Selected account for Customer 360° Profile & Activation modal
  const [selectedCustomer360, setSelectedCustomer360] = useState<ScannedAccountRecord | null>(null);
  const [modalTab, setModalTab] = useState<"OVERVIEW" | "ACTIVATE" | "ACTIONS">("OVERVIEW");

  // Plan Activation Form State
  const [planSelection, setPlanSelection] = useState<"PRO_MONTHLY" | "PRO_ANNUAL" | "VIP_PASS" | "TRIAL_EXTENSION">("PRO_MONTHLY");
  const [planDurationDays, setPlanDurationDays] = useState<number>(30);
  const [paymentModeSelection, setPaymentModeSelection] = useState<"UPI" | "Cash" | "Bank Transfer" | "VIP Pass">("UPI");
  const [planAmount, setPlanAmount] = useState<number>(999);
  const [receiptTag, setReceiptTag] = useState<string>("");
  const [receiptProofUrl, setReceiptProofUrl] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [isActivating, setIsActivating] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchScannedAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/apex/scan-accounts");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          setAccounts(data.accounts);
        }
      }
    } catch (err) {
      console.warn("Failed to scan Firestore accounts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScannedAccounts();
  }, []);

  // Handle Deep Purge Execution
  const handleExecuteDeepPurge = async () => {
    if (!accountToPurge) return;
    setIsPurging(true);

    try {
      const res = await fetch("/api/apex/purge-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: accountToPurge.email,
          userId: accountToPurge.userId,
          propertyIds: accountToPurge.propertyIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(`✓ Zero-Footprint Deep Purge complete for ${accountToPurge.email}!`);
        setAccounts((prev) => prev.filter((a) => a.email !== accountToPurge.email));
        setAccountToPurge(null);
        setPurgeConfirmationInput("");
      } else {
        triggerToast(`⚠️ Purge error: ${data.message}`);
      }
    } catch (err: any) {
      triggerToast(`⚠️ Purge failed: ${err.message}`);
    } finally {
      setIsPurging(false);
    }
  };

  // Handle Suspend / Resume
  const handleToggleSuspend = async (account: ScannedAccountRecord) => {
    const isCurrentlySuspended = account.subscriptionStatus === "SUSPENDED";
    const targetStatus = isCurrentlySuspended ? "ACTIVE" : "SUSPENDED";

    try {
      const res = await fetch("/api/apex/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: account.userId,
          email: account.email,
          newStatus: targetStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(`✓ Account ${account.email} status changed to ${targetStatus}`);
        setAccounts((prev) =>
          prev.map((a) =>
            a.email === account.email
              ? {
                  ...a,
                  subscriptionStatus: targetStatus === "SUSPENDED" ? "SUSPENDED" : "TRIAL",
                  classification: targetStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE_PRO",
                }
              : a
          )
        );
      }
    } catch (err: any) {
      triggerToast(`⚠️ Status update failed: ${err.message}`);
    }
  };

  // Handle Plan Activation Submission
  const handleActivatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer360) return;
    setIsActivating(true);

    try {
      const res = await fetch("/api/apex/activate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedCustomer360.userId,
          email: selectedCustomer360.email,
          plan: planSelection,
          durationDays: Number(planDurationDays),
          paymentMode: paymentModeSelection,
          amountPaid: paymentModeSelection === "VIP Pass" ? 0 : Number(planAmount),
          receiptNumber: receiptTag || `REC-${Date.now().toString().slice(-6)}`,
          receiptUrl: receiptProofUrl,
          notes: internalNotes,
          activatedBy: "Founder Console (Ramesh)",
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast(`✓ Plan ${planSelection} (${paymentModeSelection}) successfully activated!`);
        await fetchScannedAccounts();
        setSelectedCustomer360(null);
      } else {
        triggerToast(`⚠️ Activation error: ${data.message}`);
      }
    } catch (err: any) {
      triggerToast(`⚠️ Plan activation failed: ${err.message}`);
    } finally {
      setIsActivating(false);
    }
  };

  // Handle 1-Click Quick Extension
  const handleQuickExtendTrial = async (account: ScannedAccountRecord, days: number = 14) => {
    try {
      const res = await fetch("/api/apex/activate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: account.userId,
          email: account.email,
          plan: "TRIAL_EXTENSION",
          durationDays: days,
          paymentMode: "VIP Pass",
          amountPaid: 0,
          notes: `Founder 1-Click +${days} Days Trial Extension`,
          activatedBy: "Founder Console",
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`✓ Added +${days} days free trial to ${account.email}`);
        await fetchScannedAccounts();
      }
    } catch (err: any) {
      triggerToast(`⚠️ Extension failed: ${err.message}`);
    }
  };

  // Instant Multi-Field Real-Time Search Filtering
  const filteredAccounts = accounts.filter((acc) => {
    const q = searchQuery.toLowerCase().trim();
    const cleanPhone = (acc.phone || "").replace(/\D/g, "");
    const searchClean = q.replace(/\D/g, "");

    const matchesSearch =
      !q ||
      acc.email.toLowerCase().includes(q) ||
      acc.displayName.toLowerCase().includes(q) ||
      (acc.phone && acc.phone.includes(q)) ||
      (searchClean && cleanPhone.includes(searchClean)) ||
      (acc.primaryPropertyName || "").toLowerCase().includes(q) ||
      (acc.city || "").toLowerCase().includes(q) ||
      (acc.organizationId || "").toLowerCase().includes(q);

    const matchesTab =
      activeTab === "ALL"
        ? true
        : activeTab === "ACTIVE_PRO"
        ? acc.subscriptionStatus === "ACTIVE_PRO" || acc.subscriptionStatus === "PRO_PRE_EXPIRY"
        : acc.subscriptionStatus === activeTab;

    return matchesSearch && matchesTab;
  });

  const totalCount = accounts.length;
  const trialCount = accounts.filter((a) => a.subscriptionStatus === "TRIAL").length;
  const proCount = accounts.filter((a) => a.subscriptionStatus === "ACTIVE_PRO" || a.subscriptionStatus === "PRO_PRE_EXPIRY").length;
  const graceCount = accounts.filter((a) => a.subscriptionStatus === "GRACE_PERIOD").length;
  const expiredCount = accounts.filter((a) => a.subscriptionStatus === "EXPIRED").length;
  const suspendedCount = accounts.filter((a) => a.subscriptionStatus === "SUSPENDED").length;

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-emerald-500 text-black font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-black" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <FounderSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#0d1117]">
        <FounderHeader
          title="Customer Registry & Search"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        <div className="p-4 sm:p-8 space-y-8 max-w-[1440px] mx-auto w-full pb-28">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest bg-[#ff3366]/20 text-[#ff3366] px-2.5 py-0.5 rounded-full border border-[#ff3366]/30">
                  APEX LIVE DATABASE SCANNER ⚡
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Cloud Firestore Real-Time
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <span>Customer Registry & Real-Time Search</span>
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Real-time multi-field tracking across Owner Name, Mobile Number, Email, and Property Name.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchScannedAccounts}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#ff3366]" : ""}`} />
                <span>{isLoading ? "Scanning Firestore..." : "Scan Database"}</span>
              </button>
              <Link
                href="/apex-command/invites"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff3366] to-[#ff8400] text-white font-bold text-xs shadow-lg shadow-[#ff3366]/20 hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue New VIP Pass</span>
              </Link>
            </div>
          </div>

          {/* 5 Metric Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-3xl bg-[#161b22] border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">TOTAL</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-white mt-3">{totalCount}</p>
              <p className="text-[11px] text-gray-500 mt-1">All owners</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#161b22] border border-amber-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">⚡ 14D TRIALS</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-amber-400 mt-3">{trialCount}</p>
              <p className="text-[11px] text-gray-500 mt-1">Free trials</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#161b22] border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">💎 ACTIVE PRO</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-emerald-400 mt-3">{proCount}</p>
              <p className="text-[11px] text-gray-500 mt-1">Paid subscribers</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#161b22] border border-amber-500/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">⏳ PRO GRACE</span>
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 animate-pulse">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-amber-300 mt-3">{graceCount}</p>
              <p className="text-[11px] text-gray-500 mt-1">7-Day grace active</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#161b22] border border-rose-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">⚠️ EXPIRED</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-rose-400 mt-3">{expiredCount}</p>
              <p className="text-[11px] text-gray-500 mt-1">Needs renewal</p>
            </div>
          </div>

          {/* Search & Filter Nav */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Name, Mobile Number, Email, PG Name..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#161b22] border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#ff3366]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Subscription Status Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-[#161b22] rounded-2xl border border-white/10 text-xs font-bold">
                <button
                  onClick={() => setActiveTab("ALL")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    activeTab === "ALL" ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-white"
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => setActiveTab("TRIAL")}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    activeTab === "TRIAL" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>⚡ 14-Day Trials</span>
                  <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded-full">{trialCount}</span>
                </button>
                <button
                  onClick={() => setActiveTab("ACTIVE_PRO")}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    activeTab === "ACTIVE_PRO" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>💎 Pro Active</span>
                  <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.2 rounded-full">{proCount}</span>
                </button>
                <button
                  onClick={() => setActiveTab("GRACE_PERIOD")}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    activeTab === "GRACE_PERIOD" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>⏳ Grace Period</span>
                  <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded-full">{graceCount}</span>
                </button>
                <button
                  onClick={() => setActiveTab("EXPIRED")}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    activeTab === "EXPIRED" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>⚠️ Expired</span>
                  <span className="text-[10px] bg-rose-500/20 px-1.5 py-0.2 rounded-full">{expiredCount}</span>
                </button>
                <button
                  onClick={() => setActiveTab("SUSPENDED")}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    activeTab === "SUSPENDED" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>🔴 Suspended</span>
                  <span className="text-[10px] bg-rose-500/20 px-1.5 py-0.2 rounded-full">{suspendedCount}</span>
                </button>
              </div>
            </div>

            {/* Accounts Card List */}
            {isLoading ? (
              <div className="py-20 text-center space-y-3 bg-[#161b22]/50 rounded-3xl border border-white/10">
                <RefreshCw className="w-8 h-8 text-[#ff3366] animate-spin mx-auto" />
                <p className="font-bold text-sm text-gray-300">Scanning Cloud Firestore Collections...</p>
                <p className="text-xs text-gray-500">Aggregating user profiles, properties, and subscription lifecycles.</p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="py-16 text-center bg-[#161b22]/30 rounded-3xl border border-dashed border-white/10 p-8">
                <UserX className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <h3 className="font-bold text-sm text-gray-300">No matching accounts found</h3>
                <p className="text-xs text-gray-500 mt-1">Try adjusting your search query or switching tabs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredAccounts.map((acc) => {
                  const cleanPhone = (acc.phone || "").replace(/\D/g, "");
                  const initials = (acc.displayName || acc.email || "TP")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const waUrl = cleanPhone
                    ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(
                        `Hi ${acc.displayName}, this is Ramesh from the TenoPilot team reaching out regarding your PG workspace (${acc.primaryPropertyName}). How can we support your property today?`
                      )}`
                    : null;

                  return (
                    <div
                      key={acc.id}
                      className={`p-5 rounded-3xl border transition-all ${
                        acc.subscriptionStatus === "ACTIVE_PRO"
                          ? "bg-[#161b22] border-emerald-500/30 hover:border-emerald-400/60"
                          : acc.subscriptionStatus === "SUSPENDED"
                          ? "bg-[#1c1214] border-rose-500/30"
                          : acc.subscriptionStatus === "EXPIRED"
                          ? "bg-[#161b22] border-rose-500/20 hover:border-rose-400/40"
                          : "bg-[#161b22] border-amber-500/20 hover:border-amber-400/40"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        {/* Left: Info */}
                        <div className="flex items-start gap-3.5 max-w-2xl">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                            {initials}
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-base text-white">{acc.displayName}</span>
                              <span className="text-xs font-mono text-gray-400">{acc.email}</span>

                              {/* Subscription Badge */}
                              {acc.subscriptionStatus === "ACTIVE_PRO" && (
                                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>💎 PRO ACTIVE (₹999/mo)</span>
                                </span>
                              )}
                              {acc.subscriptionStatus === "PRO_PRE_EXPIRY" && (
                                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-blue-400" />
                                  <span>💎 PRO (RENEWS IN {acc.trialDaysLeft}D)</span>
                                </span>
                              )}
                              {acc.subscriptionStatus === "GRACE_PERIOD" && (
                                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 animate-pulse">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>⏳ PRO GRACE ({acc.graceDaysRemaining || 7}D LEFT)</span>
                                </span>
                              )}
                              {acc.subscriptionStatus === "TRIAL" && (
                                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>⚡ 14-DAY TRIAL ({acc.trialDaysLeft}D LEFT)</span>
                                </span>
                              )}
                              {acc.subscriptionStatus === "EXPIRED" && (
                                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>⚠️ TRIAL EXPIRED</span>
                                </span>
                              )}
                              {acc.subscriptionStatus === "SUSPENDED" && (
                                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  🔴 SUSPENDED
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                              {/* WhatsApp Direct Chat Bridge */}
                              {waUrl ? (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all font-mono font-bold text-xs"
                                  title="Open WhatsApp Chat"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{acc.phone}</span>
                                  <span className="text-[10px] text-emerald-400 ml-0.5">💬 WhatsApp</span>
                                </a>
                              ) : acc.phone ? (
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3 text-gray-500" />
                                  {acc.phone}
                                </span>
                              ) : null}

                              <span className="flex items-center gap-1 text-gray-300 font-medium">
                                <Building2 className="w-3 h-3 text-gray-500" />
                                {acc.primaryPropertyName}
                              </span>

                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-gray-500" />
                                {acc.totalBeds || 40} Beds
                              </span>

                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-500" />
                                {acc.city}
                              </span>

                              {acc.organizationId && (
                                <span className="text-[11px] text-gray-500 font-mono">
                                  Org: {acc.organizationId}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-gray-500 italic">
                              Status Note: {acc.detectionReason}
                            </p>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
                          {/* 👑 Customer 360° Profile & Plan Activation */}
                          <button
                            onClick={() => {
                              setSelectedCustomer360(acc);
                              setModalTab("OVERVIEW");
                              setPlanSelection("PRO_MONTHLY");
                              setPlanDurationDays(30);
                              setPaymentModeSelection("UPI");
                              setPlanAmount(999);
                              setReceiptTag(`REC-${Date.now().toString().slice(-6)}`);
                              setReceiptProofUrl("");
                              setInternalNotes("");
                            }}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-black font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-black" />
                            <span>360° Profile & Activate</span>
                          </button>

                          {/* Impersonate / Preview */}
                          {acc.propertyIds.length > 0 && (
                            <Link
                              href={`/p/${acc.propertyIds[0]}/overview?impersonate=true`}
                              target="_blank"
                              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-400" />
                              <span>Preview</span>
                            </Link>
                          )}

                          {/* Suspend / Resume Button */}
                          <button
                            onClick={() => handleToggleSuspend(acc)}
                            className={`px-3 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                              acc.subscriptionStatus === "SUSPENDED"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{acc.subscriptionStatus === "SUSPENDED" ? "Resume Access" : "Suspend"}</span>
                          </button>

                          {/* Deep Purge / Wipe Button */}
                          <button
                            onClick={() => setAccountToPurge(acc)}
                            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Wipe & Purge 🗑️</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 👑 CUSTOMER 360° PROFILE & MANUAL PLAN ACTIVATION MODAL */}
      {selectedCustomer360 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in-50">
          <div className="w-full max-w-2xl bg-[#161b22] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 text-orange-400 border border-orange-500/40 flex items-center justify-center font-black text-base shrink-0">
                  {(selectedCustomer360.displayName || selectedCustomer360.email || "TP")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-white">{selectedCustomer360.displayName}</h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      360° Profile
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedCustomer360.email}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer360(null)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-xs font-bold">
              <button
                onClick={() => setModalTab("OVERVIEW")}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  modalTab === "OVERVIEW"
                    ? "bg-white/10 text-white shadow-xs border border-white/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Overview & Property</span>
              </button>
              <button
                onClick={() => setModalTab("ACTIVATE")}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  modalTab === "ACTIVATE"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>⚡ Activate Plan / VIP Pass</span>
              </button>
              <button
                onClick={() => setModalTab("ACTIONS")}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  modalTab === "ACTIONS"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Power Controls</span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW & PROPERTIES */}
            {modalTab === "OVERVIEW" && (
              <div className="space-y-5 animate-in fade-in text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-[#0d1117] border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">WHATSAPP CONTACT</span>
                    <div className="pt-1 flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">
                        {selectedCustomer360.phone || "No phone registered"}
                      </span>
                      {selectedCustomer360.phone && (
                        <a
                          href={`https://wa.me/91${selectedCustomer360.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
                            `Hi ${selectedCustomer360.displayName}, this is Ramesh from TenoPilot.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold"
                        >
                          💬 WhatsApp
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0d1117] border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SUBSCRIPTION LIFECYCLE</span>
                    <div className="pt-1 flex items-center gap-2">
                      <span className="font-bold text-white">
                        {selectedCustomer360.subscriptionStatus === "ACTIVE_PRO"
                          ? "💎 Active Pro (₹999/mo)"
                          : selectedCustomer360.subscriptionStatus === "TRIAL"
                          ? `⚡ 14-Day Free Trial (${selectedCustomer360.trialDaysLeft} Days Left)`
                          : selectedCustomer360.subscriptionStatus === "EXPIRED"
                          ? "⚠️ Free Trial Expired"
                          : "🔴 Suspended"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0d1117] border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ORGANIZATION ID</span>
                    <p className="font-mono font-bold text-gray-300 pt-1">
                      {selectedCustomer360.organizationId || "org_estate_01"}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0d1117] border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SIGNUP DATE</span>
                    <p className="font-mono font-bold text-gray-300 pt-1">
                      {new Date(selectedCustomer360.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Property Footprint Banner */}
                <div className="p-4 rounded-2xl bg-[#0d1117] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#ff3366]" />
                      <span className="font-bold text-sm text-white">
                        {selectedCustomer360.primaryPropertyName}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-[10px]">
                      {selectedCustomer360.totalBeds || 40} Total Beds
                    </span>
                  </div>

                  <p className="text-gray-400 text-xs">
                    Location: <strong>{selectedCustomer360.city}</strong> • Active Workspace IDs:{" "}
                    <span className="font-mono text-gray-300">
                      {selectedCustomer360.propertyIds.join(", ") || "None"}
                    </span>
                  </p>

                  {selectedCustomer360.propertyIds.length > 0 && (
                    <div className="pt-2">
                      <Link
                        href={`/p/${selectedCustomer360.propertyIds[0]}/overview?impersonate=true`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Impersonate & Open Client Dashboard ➔</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: PLAN ACTIVATION & VIP PASS FORM */}
            {modalTab === "ACTIVATE" && (
              <form onSubmit={handleActivatePlanSubmit} className="space-y-4 animate-in fade-in text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Manually activate or renew plans for offline/online payments with receipt tagging.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Plan Selector */}
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-300">Select Plan *</label>
                    <select
                      value={planSelection}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setPlanSelection(val);
                        if (val === "PRO_MONTHLY") {
                          setPlanDurationDays(30);
                          setPlanAmount(999);
                        } else if (val === "PRO_ANNUAL") {
                          setPlanDurationDays(365);
                          setPlanAmount(9990);
                        } else if (val === "VIP_PASS") {
                          setPlanDurationDays(365);
                          setPaymentModeSelection("VIP Pass");
                          setPlanAmount(0);
                        } else if (val === "TRIAL_EXTENSION") {
                          setPlanDurationDays(14);
                          setPlanAmount(0);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1117] border border-white/10 text-white text-xs focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="PRO_MONTHLY">💎 Pro Monthly Plan (₹999 / 30 Days)</option>
                      <option value="PRO_ANNUAL">🏆 Pro Annual Plan (₹9,990 / 365 Days)</option>
                      <option value="VIP_PASS">🎟️ VIP Pass (1-Year Pass)</option>
                      <option value="TRIAL_EXTENSION">⏳ Extend Trial (+14 / +30 Days)</option>
                    </select>
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-300">Payment Mode *</label>
                    <select
                      value={paymentModeSelection}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setPaymentModeSelection(val);
                        if (val === "VIP Pass") setPlanAmount(0);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1117] border border-white/10 text-white text-xs focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="UPI">📱 UPI / QR Code (GPay, PhonePe, Paytm)</option>
                      <option value="Cash">💵 Cash In-Hand</option>
                      <option value="Bank Transfer">🏦 Bank Transfer / IMPS / NEFT</option>
                      <option value="VIP Pass">🎟️ VIP Pass</option>
                    </select>
                  </div>

                  {/* Amount Paid */}
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-300">Amount Paid (₹)</label>
                    <input
                      type="number"
                      value={planAmount}
                      onChange={(e) => setPlanAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1117] border border-white/10 text-white font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Receipt / UTR Tag */}
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-300">Receipt / UTR Tagging *</label>
                    <input
                      type="text"
                      required
                      value={receiptTag}
                      onChange={(e) => setReceiptTag(e.target.value)}
                      placeholder="e.g. UTR202608309182 or REC-0012"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1117] border border-white/10 text-white font-mono text-xs focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Optional Receipt Attachment / Screenshot URL */}
                <div className="space-y-1">
                  <label className="block font-bold text-gray-300">
                    Receipt Attachment Proof (Optional Image / URL)
                  </label>
                  <input
                    type="text"
                    value={receiptProofUrl}
                    onChange={(e) => setReceiptProofUrl(e.target.value)}
                    placeholder="https://... or Receipt Image URL"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1117] border border-white/10 text-white text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Internal Founder Notes */}
                <div className="space-y-1">
                  <label className="block font-bold text-gray-300">Internal Founder Audit Notes</label>
                  <textarea
                    rows={2}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="e.g. Collected via UPI during onboarding visit at PG."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1117] border border-white/10 text-white text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer360(null)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActivating}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-black font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isActivating ? (
                      <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-black" />
                        <span>Confirm Activation & Issue Plan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: ADMIN POWER CONTROLS */}
            {modalTab === "ACTIONS" && (
              <div className="space-y-4 animate-in fade-in text-xs">
                {/* 1-Click +14 Days Extension */}
                <div className="p-4 rounded-2xl bg-[#0d1117] border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white">1-Click Free Trial Extension (+14 Days)</h4>
                    <p className="text-[11px] text-gray-400">Instantly grant 14 additional days of full access without taking payment.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickExtendTrial(selectedCustomer360, 14)}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs shrink-0 cursor-pointer"
                  >
                    +14 Days
                  </button>
                </div>

                {/* Suspend / Resume Access */}
                <div className="p-4 rounded-2xl bg-[#0d1117] border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white">Account Access Lock / Suspension</h4>
                    <p className="text-[11px] text-gray-400">Temporarily suspend workspace access or unlock an active account.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSuspend(selectedCustomer360)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs shrink-0 cursor-pointer border ${
                      selectedCustomer360.subscriptionStatus === "SUSPENDED"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    }`}
                  >
                    {selectedCustomer360.subscriptionStatus === "SUSPENDED" ? "Unlock Access" : "Suspend Account"}
                  </button>
                </div>

                {/* Zero-Footprint Deep Purge */}
                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-rose-300">Irreversible Zero-Footprint Deep Purge</h4>
                    <p className="text-[11px] text-rose-200/70">Wipes all Firestore records, portfolio documents, and physical storage files.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountToPurge(selectedCustomer360);
                      setSelectedCustomer360(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 shrink-0 cursor-pointer"
                  >
                    Deep Purge
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deep Purge Modal */}
      {accountToPurge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-50">
          <div className="w-full max-w-lg bg-[#161b22] border-2 border-rose-500/50 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-white animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Zero-Footprint Deep Purge</h3>
                  <p className="text-xs text-rose-300 font-mono">{accountToPurge.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAccountToPurge(null);
                  setPurgeConfirmationInput("");
                }}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-200 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Warning: Irreversible Deletion
              </p>
              <p className="leading-relaxed">
                This will atomically purge all database and physical storage records for this account:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-300 text-[11px]">
                <li><strong className="text-white">Firestore:</strong> users/{accountToPurge.userId || "uid"}</li>
                <li><strong className="text-white">Portfolio:</strong> users/portfolio_{accountToPurge.email.replace(/[^a-z0-9]/g, "_")}</li>
                <li><strong className="text-white">Properties:</strong> {accountToPurge.propertyIds.join(", ") || "None"} & all subcollections</li>
                <li><strong className="text-white">Storage:</strong> Tenant Aadhaar cards, KYC photos, complaint pictures, & QR images</li>
              </ul>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-gray-400">
                Type <span className="font-bold text-rose-400 font-mono">PURGE</span> to confirm:
              </label>
              <input
                type="text"
                value={purgeConfirmationInput}
                onChange={(e) => setPurgeConfirmationInput(e.target.value.toUpperCase())}
                placeholder="PURGE"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1117] border border-rose-500/40 text-white font-mono font-bold text-xs focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAccountToPurge(null);
                  setPurgeConfirmationInput("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeepPurge}
                disabled={purgeConfirmationInput !== "PURGE" || isPurging}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30"
              >
                {isPurging ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Deep Purge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
