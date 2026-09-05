"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { FounderSidebar } from "@/components/founder/FounderSidebar";
import { FounderHeader } from "@/components/founder/FounderHeader";
import {
  founderStore,
  FounderVipInvite,
} from "@/constants/founderStore";
import {
  Ticket,
  Plus,
  Search,
  Copy,
  Check,
  Share2,
  Clock,
  CheckCircle2,
  X,
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Sparkles,
  ShieldCheck,
  Filter,
  AlertCircle,
} from "lucide-react";

export default function ApexCommandInvitesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [invites, setInvites] = useState<FounderVipInvite[]>(() => founderStore.getInvites());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "REDEEMED">("ALL");

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInviteSuccess, setNewInviteSuccess] = useState<FounderVipInvite | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [pgName, setPgName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [approxBeds, setApproxBeds] = useState("80");
  const [assignedPlan, setAssignedPlan] = useState<"10_DAY_TRIAL" | "PRO_MONTHLY" | "ANNUAL_VIP">("10_DAY_TRIAL");
  const [trialDurationDays, setTrialDurationDays] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    founderStore.initFirebase();
    const unsub = founderStore.subscribe(() => {
      setInvites(founderStore.getInvites());
    });
    return () => {
      unsub();
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyCode = (code: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      triggerToast(`✓ Activation code ${code} copied to clipboard!`);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  const handleShareWhatsApp = (invite: FounderVipInvite) => {
    const cleanPhone = invite.ownerPhone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `🎉 Welcome to TenoPilot!\n\n` +
        `Hi ${invite.ownerName}, your VIP onboarding pass for *${invite.pgName}* has been issued.\n\n` +
        `🔑 *1-Time Activation Code:* ${invite.activationCode}\n\n` +
        `📲 Complete your 30-second setup here: https://tenopilot.com/signup\n\n` +
        `Need help? Reply to this message.`
    );
    const waUrl = `https://wa.me/91${cleanPhone.slice(-10)}?text=${text}`;
    window.open(waUrl, "_blank");
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!pgName || !ownerName || !ownerPhone || !ownerEmail) {
      setCreateError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await founderStore.createVipInvite({
        pgName,
        ownerName,
        ownerPhone,
        ownerEmail,
        city,
        assignedPlan,
        trialDurationDays: Number(trialDurationDays),
        generatedByStaffName: "Founder (Apex)",
        generatedByStaffEmail: "admin@tenopilot.com",
      });

      setNewInviteSuccess(created);
      setIsSubmitting(false);

      // Reset form
      setPgName("");
      setOwnerName("");
      setOwnerPhone("");
      setOwnerEmail("");
    } catch (err: any) {
      console.error(err);
      setCreateError(err.message || "Failed to create VIP invite. Contact credentials may already be in use.");
      setIsSubmitting(false);
    }
  };

  // Filtered Invites
  const filteredInvites = invites.filter((inv) => {
    const matchesSearch =
      inv.pgName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.ownerPhone.includes(searchQuery) ||
      inv.activationCode.includes(searchQuery);

    const matchesStatus =
      statusFilter === "ALL" ? true : inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalInvites = invites.length;
  const pendingCount = invites.filter((i) => i.status === "PENDING").length;
  const redeemedCount = invites.filter((i) => i.status === "REDEEMED").length;

  return (
    <div className="flex min-h-screen bg-[#0d0f12] text-slate-100 font-sans selection:bg-[#ff3366]/30 selection:text-white">
      <FounderSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <FounderHeader
          title="PG Onboarding Hub"
          subtitle="Generate and track VIP activation passes & links for prospective PG clients"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
          actionElement={
            <button
              type="button"
              onClick={() => {
                setNewInviteSuccess(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-[#ff3366]/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Onboard Customer</span>
            </button>
          }
        />

        <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 flex-1 max-w-[1400px] mx-auto w-full pb-24">
          {/* Top 3 Summary Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Generated */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl flex items-center justify-between group hover:border-white/20 transition-all">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  TOTAL ACTIVATIONS ISSUED
                </span>
                <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-white mt-1">
                  {totalInvites} Customers
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Door-to-door registrations</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                <Ticket className="w-6 h-6" />
              </div>
            </div>

            {/* Pending Redemption */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl flex items-center justify-between group hover:border-[#ff3366]/50 transition-all">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  PENDING ACTIVATION
                </span>
                <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-[#ff5436] mt-1">
                  {pendingCount} Invites
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Awaiting owner first login</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#ff3366]/10 border border-[#ff3366]/20 flex items-center justify-center text-[#ff5436]">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* Successfully Activated */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl flex items-center justify-between group hover:border-emerald-500/50 transition-all">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  REDEEMED & ACTIVE
                </span>
                <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-emerald-400 mt-1">
                  {redeemedCount} PGs Live
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {totalInvites > 0 ? Math.round((redeemedCount / totalInvites) * 100) : 0}% Conversion Rate
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Search & Filter Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#16191f] border border-white/8 p-3 sm:p-4 rounded-2xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by PG name, owner name, phone, or 6-digit code..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0d0f12] border border-white/8 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5436]"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-[#0d0f12] p-1 rounded-xl border border-white/8 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-white/15 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All ({totalInvites})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PENDING")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "PENDING"
                    ? "bg-[#ff3366] text-white shadow-xs"
                    : "text-slate-400 hover:text-[#ff5436]"
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("REDEEMED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "REDEEMED"
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "text-slate-400 hover:text-emerald-400"
                }`}
              >
                Activated ({redeemedCount})
              </button>
            </div>
          </div>

          {/* Master Invites Table */}
          <div className="bg-[#16191f] border border-white/8 rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <h3 className="font-sans font-bold text-xl text-white">
                  Customer Onboarding Registry
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  1-time activation codes issued to PG owners during door-to-door onboarding
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Showing {filteredInvites.length} of {totalInvites} customers
              </span>
            </div>

            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="min-w-[760px] w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/2">
                    <th className="py-3 px-4 rounded-l-xl">PG Brand & Location</th>
                    <th className="py-3 px-4">Owner Details</th>
                    <th className="py-3 px-4 text-center">Activation Code</th>
                    <th className="py-3 px-4">Plan Assigned</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 font-medium">
                  {filteredInvites.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff3366]/20 to-[#ff8400]/20 border border-[#ff3366]/30 flex items-center justify-center text-[#ff5436] font-bold text-xs shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-white">{inv.pgName}</h4>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#ff5436]" /> {inv.city}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-white text-xs">{inv.ownerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{inv.ownerPhone}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{inv.ownerEmail}</div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0d0f12] border border-white/10 font-mono font-black text-sm text-[#ff5436] tracking-wider shadow-inner">
                          <span>{inv.activationCode}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(inv.activationCode, inv.id)}
                            className="text-slate-400 hover:text-white cursor-pointer"
                            title="Copy code"
                          >
                            {copiedCodeId === inv.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-[11px] font-bold text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                          {inv.assignedPlan === "10_DAY_TRIAL"
                            ? "10-Day Free Trial"
                            : inv.assignedPlan === "PRO_MONTHLY"
                            ? "Pro Monthly (₹1,499)"
                            : "Annual VIP"}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                            inv.status === "REDEEMED"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-[#ff3366]/15 text-[#ff5436] border-[#ff3366]/30 animate-pulse"
                          }`}
                        >
                          {inv.status === "REDEEMED" ? "✓ ACTIVATED" : "⏳ PENDING"}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(inv)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                          title="Dispatch via WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* CREATE ONBOARDING PASS MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#16191f] rounded-3xl border border-white/10 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 text-xs text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <div>
                <h3 className="font-sans font-bold text-xl text-white flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#ff5436]" /> Issue Customer Onboarding Pass
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Creates an exclusive 6-digit activation code for door-to-door onboarding
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If Just Created -> Show Holographic Card */}
            {newInviteSuccess ? (
              <div className="space-y-6">
                {/* Holographic VIP Gradient Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-tr from-[#ff3366] via-[#7928ca] to-[#0070f3] shadow-2xl space-y-4 text-white relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-black/30 px-2.5 py-1 rounded-full border border-white/20">
                      EXCLUSIVE ACCESS PASS
                    </span>
                    <span className="text-xs font-bold">10-DAY FREE TRIAL</span>
                  </div>

                  <div className="py-2">
                    <p className="text-xs text-white/80 font-medium">Activation Code:</p>
                    <h2 className="font-mono font-black text-4xl tracking-widest text-white mt-1 drop-shadow-md">
                      {newInviteSuccess.activationCode}
                    </h2>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/20">
                    <div>
                      <p className="text-[10px] text-white/70 font-semibold uppercase">Property</p>
                      <p className="font-bold text-white">{newInviteSuccess.pgName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/70 font-semibold uppercase">Owner</p>
                      <p className="font-bold text-white">{newInviteSuccess.ownerName}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0d0f12] border border-white/8 text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-white">✅ Code saved to Cloud Firestore!</p>
                  <p className="text-[11px] text-slate-400">
                    Send this code to {newInviteSuccess.ownerName} ({newInviteSuccess.ownerPhone}). When they register at <span className="text-[#ff5436] font-mono">tenopilot.com/signup</span>, this code will unlock their PG.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleCopyCode(newInviteSuccess.activationCode, newInviteSuccess.id);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(newInviteSuccess)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share on WhatsApp ➔</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                {createError && (
                  <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-300 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      PG Brand Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={pgName}
                      onChange={(e) => setPgName(e.target.value)}
                      placeholder="e.g. Sri Lakshmi Luxury PG"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Owner Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Suresh Reddy"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Owner Phone Number (WhatsApp) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Owner Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="e.g. suresh.pg@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      City / Territory *
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    >
                      <option value="Bangalore">Bangalore</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Pune">Pune</option>
                      <option value="Delhi-NCR">Delhi-NCR</option>
                      <option value="Chennai">Chennai</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Approx. Bed Capacity
                    </label>
                    <input
                      type="number"
                      value={approxBeds}
                      onChange={(e) => setApproxBeds(e.target.value)}
                      placeholder="e.g. 80"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Assigned Initial Plan *
                    </label>
                    <select
                      value={assignedPlan}
                      onChange={(e) => setAssignedPlan(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    >
                      <option value="10_DAY_TRIAL">10-Day Free Trial (Full)</option>
                      <option value="PRO_MONTHLY">Pro Monthly (₹1,499/mo)</option>
                      <option value="ANNUAL_VIP">Annual Growth (₹14,999/yr)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/8">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] text-white font-bold shadow-lg cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Generating..." : "Generate 6-Digit Activation Code ➔"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Luxury Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[#16191f] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#ff3366]/40 flex items-center gap-3 max-w-md text-xs font-bold">
            <span className="shrink-0">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer ml-auto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
