"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { FounderSidebar } from "@/components/founder/FounderSidebar";
import { FounderHeader } from "@/components/founder/FounderHeader";
import {
  founderStore,
  PlatformMacroMetrics,
  FounderClientRecord,
  FounderVipInvite,
} from "@/constants/founderStore";
import {
  TrendingUp,
  Building2,
  Users,
  Ticket,
  Zap,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Layers,
  MapPin,
  Clock,
  CheckCircle2,
  CreditCard,
  Eye,
  ChevronRight,
  DollarSign,
  Cpu,
} from "lucide-react";

export default function ApexCommandOverviewPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [metrics, setMetrics] = useState<PlatformMacroMetrics>(() => founderStore.getMetrics());
  const [clients, setClients] = useState<FounderClientRecord[]>(() => founderStore.getClients());
  const [invites, setInvites] = useState<FounderVipInvite[]>(() => founderStore.getInvites());

  useEffect(() => {
    // 100% Real-Time Cloud Firebase Firestore Sync
    founderStore.initFirebase();

    const updateAll = () => {
      setMetrics(founderStore.getMetrics());
      setClients(founderStore.getClients());
      setInvites(founderStore.getInvites());
    };

    updateAll();
    const unsub = founderStore.subscribe(updateAll);
    return () => {
      unsub();
    };
  }, []);

  const pendingInvitesCount = invites.filter((i) => i.status === "PENDING").length;
  const atRiskClientsCount = clients.filter((c) => c.healthScore === "AT_RISK").length;

  return (
    <div className="flex min-h-screen bg-[#0d0f12] text-slate-100 font-sans selection:bg-[#ff3366]/30 selection:text-white">
      {/* 256px Neo-Dark Founder Sidebar */}
      <FounderSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <FounderHeader
          title="Platform Pulse"
          subtitle="Tenopilot.com real-time operations, revenue, and active PG network"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Workspace Body */}
        <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 flex-1 max-w-[1400px] mx-auto w-full pb-24">
          {/* Top Hero Banner: Macro Business Status */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#16191f] via-[#1c2027] to-[#16191f] border border-white/8 p-6 sm:p-8 shadow-2xl">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#ff3366]/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#ff8400]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-[#ff3366] to-[#ff8400] text-white shadow-md shadow-[#ff3366]/20">
                    👑 FOUNDER CONSOLE
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    All-India Network Status: <span className="text-emerald-400 font-bold">100% Operational 🟢</span>
                  </span>
                </div>
                <h1 className="font-sans font-bold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
                  Tenopilot Command Hub
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-medium">
                  Real-time visibility across all onboarded properties, active onboarding leads, and macro customer health.
                </p>
              </div>

              {/* Quick Jump Badges */}
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                <Link
                  href="/apex-command/invites"
                  className="px-4 py-2.5 rounded-2xl bg-[#1d222a] border border-white/10 hover:border-[#ff5436]/60 text-xs font-bold text-white transition-all flex items-center gap-2 shadow-xs group"
                >
                  <Ticket className="w-4 h-4 text-[#ff5436] group-hover:rotate-12 transition-transform" />
                  <span>{pendingInvitesCount} Pending Onboardings</span>
                </Link>

                <Link
                  href="/apex-command/churn-radar"
                  className="px-4 py-2.5 rounded-2xl bg-[#1d222a] border border-white/10 hover:border-amber-500/60 text-xs font-bold text-white transition-all flex items-center gap-2 shadow-xs group"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:animate-bounce" />
                  <span>{atRiskClientsCount} At-Risk Customer{atRiskClientsCount !== 1 ? "s" : ""}</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Row 1: The 4 Core SaaS Health Bento Cards (2x2 on Mobile, 4 on Desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {/* Bento 1: MRR */}
            <div className="p-4 sm:p-6 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl relative overflow-hidden group hover:border-[#ff3366]/50 transition-all flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">
                  MONTHLY RECURRING (MRR)
                </span>
                <div className="p-2 rounded-2xl bg-[#ff3366]/10 text-[#ff5436] border border-[#ff3366]/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h2 className="font-sans font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight truncate">
                  ₹{metrics.mrr.toLocaleString("en-IN")}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    +{metrics.mrrGrowthPct}% MoM
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ARR: ₹{(metrics.arr / 100000).toFixed(2)}L
                  </span>
                </div>
              </div>

              {/* Glowing Mini Sparkline */}
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#ff3366] to-[#ff8400] w-[78%] rounded-full"></div>
              </div>
            </div>

            {/* Bento 2: Active Customers */}
            <div className="p-4 sm:p-6 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">
                  ACTIVE CUSTOMERS
                </span>
                <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h2 className="font-sans font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight truncate">
                  {metrics.activePaidClients + metrics.activeTrialClients} Customers
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-white bg-white/10 px-2 py-0.5 rounded-full">
                    {metrics.activePaidClients} Paid PGs
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {metrics.activeTrialClients} Trial PGs
                  </span>
                </div>
              </div>

              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 w-[88%] rounded-full"></div>
              </div>
            </div>

            {/* Bento 3: Total Managed Beds */}
            <div className="p-4 sm:p-6 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-all flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">
                  MANAGED BED INVENTORY
                </span>
                <div className="p-2 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Layers className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h2 className="font-sans font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight truncate">
                  {metrics.totalManagedBeds.toLocaleString("en-IN")} Beds
                </h2>
                <p className="text-[10px] sm:text-[11px] text-blue-400 font-medium mt-1.5">
                  ₹{(metrics.totalTenantRentProcessed / 10000000).toFixed(2)} Cr tenant rent processed/mo
                </p>
              </div>

              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[72%] rounded-full"></div>
              </div>
            </div>

            {/* Bento 4: API & Cloud Costs */}
            <div className="p-4 sm:p-6 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl relative overflow-hidden group hover:border-purple-500/50 transition-all flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">
                  API & INFRA SPEND
                </span>
                <div className="p-2 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Cpu className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h2 className="font-sans font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight truncate">
                  ₹{metrics.apiCostIncurredThisMonth.toLocaleString("en-IN")}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    {metrics.geminiVisionScansMonth} Gemini AI Scans
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate">
                    {metrics.whatsappCreditsBalance.toLocaleString("en-IN")} WA Credits
                  </span>
                </div>
              </div>

              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 w-[55%] rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Row 2: 6-Month Growth Spline Chart + City Territory Expansion */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: 6-Month MRR Growth Trajectory Visual */}
            <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/8 pb-4">
                <div>
                  <h3 className="font-serif font-bold text-xl text-white">
                    6-Month MRR & Client Growth Curve
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Platform monthly subscription revenue scaling from March to August 2026
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shrink-0">
                  🚀 +114% Total ARR Expansion
                </span>
              </div>

              {/* Interactive Neo-Dark Bar/Spline Visual */}
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-56 pt-8 pb-2 border-b border-white/8">
                  {metrics.sixMonthTrend.map((item, idx) => {
                    const maxMRR = Math.max(...metrics.sixMonthTrend.map((t) => t.mrr)) || 1;
                    const heightPct = Math.max(20, Math.round((item.mrr / maxMRR) * 100));
                    const isLatest = idx === metrics.sixMonthTrend.length - 1;

                    return (
                      <div key={item.month} className="flex flex-col items-center gap-2 h-full justify-end group">
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-[#0d0f12] text-[10px] font-bold py-1 px-2 rounded-lg shadow-lg mb-1 whitespace-nowrap pointer-events-none">
                          ₹{(item.mrr / 1000).toFixed(1)}K ({item.clients} PGs)
                        </div>

                        {/* Bar Graphic */}
                        <div
                          className="w-full max-w-[48px] rounded-2xl transition-all duration-500 relative flex items-end justify-center shadow-lg overflow-hidden group-hover:scale-105"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: isLatest ? "#ff3366" : "#2a2f3a",
                          }}
                        >
                          {isLatest ? (
                            <div className="w-full h-full bg-gradient-to-t from-[#ff3366] via-[#ff5436] to-[#ff8400] rounded-2xl relative">
                              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white animate-ping"></span>
                            </div>
                          ) : (
                            <div
                              className="w-full bg-emerald-500/60 rounded-t-lg transition-all"
                              style={{ height: `${(item.clients / 50) * 100}%` }}
                            ></div>
                          )}
                        </div>

                        {/* Month Label */}
                        <span className={`text-xs font-bold ${isLatest ? "text-[#ff5436]" : "text-slate-400"}`}>
                          {item.month}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-6 pt-2 text-xs font-bold flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-gradient-to-r from-[#ff3366] to-[#ff8400]"></span>
                    <span className="text-slate-300">MRR Revenue (₹)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-emerald-500/70"></span>
                    <span className="text-slate-300">Onboarded PG Clients</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: City Expansion Radar */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/8 pb-4">
                  <h3 className="font-serif font-bold text-xl text-white">
                    City Territory Expansion
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    4 Clusters
                  </span>
                </div>

                <div className="divide-y divide-white/6 pt-2">
                  {metrics.cityBreakdown.map((city) => (
                    <div key={city.city} className="py-3.5 flex items-center justify-between group hover:bg-white/3 px-2 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-[#ff5436] group-hover:border-[#ff3366]/40 transition-colors">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-white">{city.city}</h4>
                          <p className="text-[10px] text-slate-400">
                            {city.pgCount} PGs • {city.bedCount} Beds
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-white">
                          ₹{city.mrr.toLocaleString("en-IN")}
                        </span>
                        <p className="text-[10px] font-bold text-emerald-400">{city.growth}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/apex-command/clients"
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View Full Client CRM</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Row 3: Live System Audit Activity Stream */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#ff5436]" />
                  Live Platform Audit Stream
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Real-time ticker of door-to-door activations, register scans, and subscription renewals
                </p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            <div className="divide-y divide-white/6">
              {metrics.recentActivity.map((act) => (
                <div key={act.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/2 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        act.type === "ACTIVATION"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : act.type === "SCAN"
                          ? "bg-[#ff3366]/20 text-[#ff5436] border border-[#ff3366]/30"
                          : act.type === "RENEWAL"
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {act.type === "ACTIVATION" ? "🎉" : act.type === "SCAN" ? "⚡" : act.type === "RENEWAL" ? "💳" : "🎟️"}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-white">{act.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{act.description}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500 shrink-0 self-start sm:self-auto">
                    {act.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
