"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FounderSidebar } from "@/components/founder/FounderSidebar";
import { FounderHeader } from "@/components/founder/FounderHeader";
import {
  founderStore,
  FounderClientRecord,
} from "@/constants/founderStore";
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
} from "lucide-react";

export default function ApexCommandClientsPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clients, setClients] = useState<FounderClientRecord[]>(() => founderStore.getClients());
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [selectedClient, setSelectedClient] = useState<FounderClientRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    founderStore.initFirebase();
    const unsub = founderStore.subscribe(() => {
      setClients(founderStore.getClients());
    });
    return () => {
      unsub();
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleImpersonate = (client: FounderClientRecord) => {
    triggerToast(`👑 Entering God-Mode for ${client.pgName}...`);
    setTimeout(() => {
      router.push(`/p/${client.id}/overview?impersonate=true`);
    }, 600);
  };

  const handleExtendTrial = async (client: FounderClientRecord, days: number = 7) => {
    await founderStore.extendClientTrial(client.id, days);
    triggerToast(`✓ Free trial extended by +${days} days for ${client.pgName}!`);
  };

  const handleToggleSuspend = async (client: FounderClientRecord) => {
    await founderStore.toggleClientSuspension(client.id);
    const newStatus = client.status === "SUSPENDED" ? "Active" : "Suspended";
    triggerToast(`✓ ${client.pgName} account status changed to ${newStatus}`);
  };

  // Filtered Clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.pgName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerPhone.includes(searchQuery) ||
      c.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.area.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlan = planFilter === "ALL" ? true : c.plan === planFilter;
    const matchesStatus = statusFilter === "ALL" ? true : c.status === statusFilter;
    const matchesCity = cityFilter === "ALL" ? true : c.city === cityFilter;

    return matchesSearch && matchesPlan && matchesStatus && matchesCity;
  });

  const totalClients = clients.length;
  const activePaidCount = clients.filter((c) => c.status === "ACTIVE").length;
  const trialCount = clients.filter((c) => c.status === "TRIAL").length;
  const totalBedsAcrossPlatform = clients.reduce((sum, c) => sum + c.totalBeds, 0);

  return (
    <div className="flex min-h-screen bg-[#0d0f12] text-slate-100 font-sans selection:bg-[#ff3366]/30 selection:text-white">
      <FounderSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <FounderHeader
          title="PG Client Master CRM & God-Mode"
          subtitle="Multi-tenant directory of all onboarded PG properties with 1-click client impersonation"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
          actionElement={
            <Link
              href="/apex-command/invites"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-[#ff3366]/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New PG</span>
            </Link>
          }
        />

        <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 flex-1 max-w-[1400px] mx-auto w-full pb-24">
          {/* Top 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                TOTAL PG BRANDS
              </span>
              <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-white">
                {totalClients} Clients
              </h2>
              <p className="text-[11px] text-slate-400">Managed organizations</p>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                PAID SUBSCRIBERS
              </span>
              <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-emerald-400">
                {activePaidCount} Paid
              </h2>
              <p className="text-[11px] text-emerald-400/80">Active Pro / Annual</p>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                ACTIVE VIP TRIALS
              </span>
              <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-[#ff5436]">
                {trialCount} In Trial
              </h2>
              <p className="text-[11px] text-slate-400">14-Day Full VIP Pass</p>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                TOTAL LIVE BEDS
              </span>
              <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-blue-400">
                {totalBedsAcrossPlatform} Beds
              </h2>
              <p className="text-[11px] text-blue-400/80">Layout inventory</p>
            </div>
          </div>

          {/* Search & Multi-Filter Control Bar */}
          <div className="p-4 rounded-2xl bg-[#16191f] border border-white/8 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by PG name, owner, phone, email, area, or city..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0d0f12] border border-white/8 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5436]"
                />
              </div>

              {/* City Filter */}
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-[#0d0f12] border border-white/8 text-xs font-bold text-white focus:outline-none focus:border-[#ff5436] shrink-0"
              >
                <option value="ALL">All Cities</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Pune">Pune</option>
                <option value="Delhi-NCR">Delhi-NCR</option>
              </select>

              {/* Plan Filter */}
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-[#0d0f12] border border-white/8 text-xs font-bold text-white focus:outline-none focus:border-[#ff5436] shrink-0"
              >
                <option value="ALL">All Plans</option>
                <option value="FREE_TRIAL">Free Trial</option>
                <option value="PRO_MONTHLY">Pro Monthly</option>
                <option value="GROWTH_ANNUAL">Growth Annual</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-[#0d0f12] border border-white/8 text-xs font-bold text-white focus:outline-none focus:border-[#ff5436] shrink-0"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Paid</option>
                <option value="TRIAL">Trial</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {/* Master PG Client Table */}
          <div className="bg-[#16191f] border border-white/8 rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-white">
                  Client Directory & God-Mode Access
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Click &apos;Impersonate&apos; to instantly log in as any PG owner without a password
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Showing {filteredClients.length} of {totalClients} PGs
              </span>
            </div>

            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="min-w-[900px] w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/2">
                    <th className="py-3 px-4 rounded-l-xl">PG Brand & Location</th>
                    <th className="py-3 px-4">Owner Contact</th>
                    <th className="py-3 px-4 text-center">Beds & Health</th>
                    <th className="py-3 px-4">Subscription Plan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">God-Mode Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 font-medium">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-white/2 transition-colors">
                      {/* PG Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#ff3366]/20 to-[#ff8400]/20 border border-[#ff3366]/30 flex items-center justify-center text-[#ff5436] font-bold text-xs shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedClient(client)}
                              className="font-bold text-xs text-white hover:text-[#ff5436] text-left transition-colors cursor-pointer"
                            >
                              {client.pgName}
                            </button>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#ff5436]" /> {client.area}, {client.city}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Owner Contact */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-white text-xs">{client.ownerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{client.ownerPhone}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{client.ownerEmail}</div>
                        </div>
                      </td>

                      {/* Beds & Health */}
                      <td className="py-4 px-4 text-center">
                        <div className="space-y-1">
                          <div className="font-bold text-white text-xs">
                            {client.occupiedBeds} / {client.totalBeds} Beds
                          </div>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                              client.healthScore === "HEALTHY"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : client.healthScore === "ATTENTION"
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                : "bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse"
                            }`}
                          >
                            {client.healthScore === "HEALTHY" ? "🟢 HEALTHY" : client.healthScore === "ATTENTION" ? "🟡 ATTENTION" : "🔴 AT RISK"}
                          </span>
                        </div>
                      </td>

                      {/* Subscription Plan */}
                      <td className="py-4 px-4">
                        <div>
                          <span className="text-[11px] font-bold text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                            {client.plan === "PRO_MONTHLY"
                              ? "Pro (₹1,499/mo)"
                              : client.plan === "GROWTH_ANNUAL"
                              ? "Annual Growth"
                              : "14-Day Trial"}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {client.trialDaysLeft !== undefined
                              ? `${client.trialDaysLeft} days left`
                              : `Renews on ${client.planRenewsOn}`}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            client.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : client.status === "TRIAL"
                              ? "bg-[#ff3366]/15 text-[#ff5436] border-[#ff3366]/30"
                              : client.status === "SUSPENDED"
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                              : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>

                      {/* God Mode Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Impersonate */}
                          <button
                            type="button"
                            onClick={() => handleImpersonate(client)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] text-white text-xs font-bold transition-all shadow-md shadow-[#ff3366]/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title="Log in as this client"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Impersonate</span>
                          </button>

                          {/* Extend Trial */}
                          {client.status === "TRIAL" && (
                            <button
                              type="button"
                              onClick={() => handleExtendTrial(client, 7)}
                              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition-all cursor-pointer"
                              title="Add +7 days to free trial"
                            >
                              +7d
                            </button>
                          )}

                          {/* Quick Inspect */}
                          <button
                            type="button"
                            onClick={() => setSelectedClient(client)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 cursor-pointer"
                            title="Inspect details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* CLIENT DEEP DIVE DRAWER / MODAL */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#16191f] rounded-3xl border border-white/10 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 text-xs text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff3366] to-[#ff8400] flex items-center justify-center text-white font-bold text-base shadow-md">
                  🏢
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xl text-white">
                    {selectedClient.pgName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedClient.area}, {selectedClient.city} • Onboarded by {selectedClient.onboardedBy}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#0d0f12] border border-white/8 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-black">Capacity</span>
                <p className="font-bold text-base text-white">{selectedClient.occupiedBeds} / {selectedClient.totalBeds} Beds</p>
                <p className="text-[10px] text-emerald-400">
                  {selectedClient.totalBeds > 0 ? Math.round((selectedClient.occupiedBeds / selectedClient.totalBeds) * 100) : 0}% Occupied
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0d0f12] border border-white/8 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-black">AI Scans</span>
                <p className="font-bold text-base text-[#ff5436]">{selectedClient.fastTrackScansCount} FastTrack</p>
                <p className="text-[10px] text-slate-400">Registers ingested</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0d0f12] border border-white/8 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-black">WA Credits</span>
                <p className="font-bold text-base text-purple-400">{selectedClient.whatsappCreditsUsed} Used</p>
                <p className="text-[10px] text-slate-400">Reminders sent</p>
              </div>
            </div>

            {/* Owner Contact */}
            <div className="p-4 rounded-2xl bg-[#0d0f12] border border-white/8 space-y-2">
              <h4 className="font-bold text-white text-xs">Owner & Billing Details</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-300 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px]">Owner Name:</span>
                  <p className="font-bold">{selectedClient.ownerName}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Phone Number:</span>
                  <p className="font-mono font-bold">{selectedClient.ownerPhone}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Email Address:</span>
                  <p className="font-mono truncate">{selectedClient.ownerEmail}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Current Plan:</span>
                  <p className="font-bold text-emerald-400">{selectedClient.plan}</p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-white/8 gap-3">
              <button
                type="button"
                onClick={() => handleToggleSuspend(selectedClient)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  selectedClient.status === "SUSPENDED"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                }`}
              >
                {selectedClient.status === "SUSPENDED" ? "Reactivate Account" : "Suspend Client"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExtendTrial(selectedClient, 7)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  +7 Days Trial
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null);
                    handleImpersonate(selectedClient);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>Impersonate Client ➔</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Luxury Toast */}
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
