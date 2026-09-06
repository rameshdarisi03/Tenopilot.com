"use client";

import { useState, useEffect } from "react";
import { FounderSidebar } from "@/components/founder/FounderSidebar";
import { FounderHeader } from "@/components/founder/FounderHeader";
import {
  Sliders,
  CreditCard,
  Clock,
  Building2,
  Phone,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Zap,
  ShieldCheck,
  MessageSquare,
  QrCode,
  Users,
} from "lucide-react";
import {
  DEFAULT_PLATFORM_CONFIG,
  PlatformConfig,
  getStoredPlatformConfig,
  setStoredPlatformConfig,
} from "@/lib/platformConfig";

export default function MasterControlsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [config, setConfig] = useState<PlatformConfig>(() => getStoredPlatformConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadMasterControls() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/apex/master-controls");
        if (res.ok) {
          const data = await res.json();
          if (data?.config) {
            setConfig(data.config);
            setStoredPlatformConfig(data.config);
          }
        }
      } catch (err: any) {
        console.warn("Failed to load master controls:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMasterControls();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      const res = await fetch("/api/apex/master-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          updatedBy: "Founder Master Controls",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save master controls");
      }

      if (data.config) {
        setConfig(data.config);
        setStoredPlatformConfig(data.config);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      console.error("Save master controls failed:", err);
      setErrorMessage(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all platform controls to default baseline values?")) {
      setConfig({ ...DEFAULT_PLATFORM_CONFIG });
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <FounderSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <FounderHeader
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
          title="Master Platform Controls"
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Headline & Quick Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#16191f] to-[#121418] border border-white/10 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#ff3366]/20 text-[#ff5436]">
                  <Sliders className="w-5 h-5" />
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Master Platform Controls
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SSOT LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl">
                Changes saved here dynamically propagate across the entire application — including landing page copy, pricing tables, tenant limits, FastTrack AI, and automated trial clocks.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleResetDefaults}
                disabled={isSaving}
                className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Defaults</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] text-white text-xs font-black shadow-lg shadow-[#ff3366]/25 hover:opacity-95 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Platform Controls</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback Banners */}
          {saveSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs font-semibold animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                All master controls saved to Firestore SSOT and broadcasted to clients in real-time!
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 4 Control Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Subscription Plan Pricing Matrix */}
            <div className="p-5 rounded-2xl bg-[#111317] border border-white/8 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Plan & Add-on Pricing
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">INR (₹)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pro Monthly */}
                <div className="p-3.5 rounded-xl bg-[#16191f] border border-white/6 space-y-1.5">
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                    💎 Pro Monthly Plan
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={config.proMonthlyPrice}
                      onChange={(e) =>
                        setConfig({ ...config, proMonthlyPrice: Number(e.target.value) })
                      }
                      className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-purple-500"
                    />
                    <span className="text-xs text-slate-400 whitespace-nowrap">/ mo</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Reflects in pricing page, upgrade modal, and Razorpay.
                  </p>
                </div>

                {/* Pro Annual */}
                <div className="p-3.5 rounded-xl bg-[#16191f] border border-white/6 space-y-1.5">
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                    🏆 Pro Annual Plan
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={config.proAnnualPrice}
                      onChange={(e) =>
                        setConfig({ ...config, proAnnualPrice: Number(e.target.value) })
                      }
                      className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-purple-500"
                    />
                    <span className="text-xs text-slate-400 whitespace-nowrap">/ yr</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Billed annually with built-in discount badge.
                  </p>
                </div>

                {/* Multi-Property Add-on */}
                <div className="p-3.5 rounded-xl bg-[#16191f] border border-white/6 space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                    🏢 Multi-Property Add-on
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={config.multiPropertyPrice}
                      onChange={(e) =>
                        setConfig({ ...config, multiPropertyPrice: Number(e.target.value) })
                      }
                      className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-slate-400 whitespace-nowrap">/ bldg / mo</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Slot fee for adding additional branch properties.
                  </p>
                </div>

                {/* Tenant Pack */}
                <div className="p-3.5 rounded-xl bg-[#16191f] border border-white/6 space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                    ⚡ Tenant Extension Pack
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={config.tenantPackPrice}
                      onChange={(e) =>
                        setConfig({ ...config, tenantPackPrice: Number(e.target.value) })
                      }
                      className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-slate-400 whitespace-nowrap">/ +25 slots</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    FastTrack and onboard tenant extension tier.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Trial Engine & Grace Periods */}
            <div className="p-5 rounded-2xl bg-[#111317] border border-white/8 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Trial Engine & Grace Period
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">AUTOMATED CLOCK</span>
              </div>

              <div className="space-y-4">
                {/* Free Trial Days */}
                <div className="p-4 rounded-xl bg-[#16191f] border border-white/6 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      ⏳ Free Trial Duration
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {config.trialDays} Days
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig({ ...config, trialDays: Math.max(1, config.trialDays - 1) })
                      }
                      className="w-10 h-10 rounded-lg bg-[#0d0f12] border border-white/10 text-white font-bold hover:bg-white/5 cursor-pointer text-base"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={config.trialDays}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          trialDays: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="flex-1 bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2 text-center text-white font-mono font-bold text-base focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, trialDays: config.trialDays + 1 })}
                      className="w-10 h-10 rounded-lg bg-[#0d0f12] border border-white/10 text-white font-bold hover:bg-white/5 cursor-pointer text-base"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Select Chips */}
                  <div className="flex items-center gap-2 pt-1">
                    {[7, 10, 14, 30].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setConfig({ ...config, trialDays: days })}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          config.trialDays === days
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                            : "bg-[#0d0f12] text-slate-400 border-white/6 hover:text-white"
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Automatically updates all marketing headlines, signup badges, and subscription expiration clocks.
                  </p>
                </div>

                {/* Grace Period Days */}
                <div className="p-4 rounded-xl bg-[#16191f] border border-white/6 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      🛡️ Subscription Grace Period
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {config.graceDays} Days
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig({ ...config, graceDays: Math.max(0, config.graceDays - 1) })
                      }
                      className="w-10 h-10 rounded-lg bg-[#0d0f12] border border-white/10 text-white font-bold hover:bg-white/5 cursor-pointer text-base"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={config.graceDays}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          graceDays: Math.max(0, Number(e.target.value)),
                        })
                      }
                      className="flex-1 bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2 text-center text-white font-mono font-bold text-base focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, graceDays: config.graceDays + 1 })}
                      className="w-10 h-10 rounded-lg bg-[#0d0f12] border border-white/10 text-white font-bold hover:bg-white/5 cursor-pointer text-base"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {[0, 3, 5, 7].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setConfig({ ...config, graceDays: days })}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          config.graceDays === days
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                            : "bg-[#0d0f12] text-slate-400 border-white/6 hover:text-white"
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Days after subscription expiration before workspace switches to read-only mode.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Platform Capacity Defaults */}
            <div className="p-5 rounded-2xl bg-[#111317] border border-white/8 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Platform Capacity Limits
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">TENANT CAP</span>
              </div>

              <div className="space-y-4">
                {/* Pro Plan Default */}
                <div className="p-4 rounded-xl bg-[#16191f] border border-white/6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      💎 Pro Plan Base Tenants
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {config.proTenantLimit} Tenants
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          proTenantLimit: Math.max(10, config.proTenantLimit - 25),
                        })
                      }
                      className="w-10 h-10 rounded-lg bg-[#0d0f12] border border-white/10 text-white font-bold hover:bg-white/5 cursor-pointer text-base"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={config.proTenantLimit}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          proTenantLimit: Math.max(10, Number(e.target.value)),
                        })
                      }
                      className="flex-1 bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2 text-center text-white font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          proTenantLimit: config.proTenantLimit + 25,
                        })
                      }
                      className="w-10 h-10 rounded-lg bg-[#0d0f12] border border-white/10 text-white font-bold hover:bg-white/5 cursor-pointer text-base"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {[100, 200, 300, 500].map((lim) => (
                      <button
                        key={lim}
                        type="button"
                        onClick={() => setConfig({ ...config, proTenantLimit: lim })}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          config.proTenantLimit === lim
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                            : "bg-[#0d0f12] text-slate-400 border-white/6 hover:text-white"
                        }`}
                      >
                        {lim}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Free Trial Default */}
                <div className="p-4 rounded-xl bg-[#16191f] border border-white/6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      ⏳ Free Trial Base Tenants
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {config.trialTenantLimit} Tenants
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          trialTenantLimit: Math.max(5, config.trialTenantLimit - 10),
                        })
                      }
                      className="w-10 h-10 rounded-lg bg-[#0d0f12] border border-white/10 text-white font-bold hover:bg-white/5 cursor-pointer text-base"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={config.trialTenantLimit}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          trialTenantLimit: Math.max(5, Number(e.target.value)),
                        })
                      }
                      className="flex-1 bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2 text-center text-white font-mono font-bold text-base focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          trialTenantLimit: config.trialTenantLimit + 10,
                        })
                      }
                      className="w-10 h-10 rounded-lg bg-[#0d0f12] border border-white/10 text-white font-bold hover:bg-white/5 cursor-pointer text-base"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {[25, 50, 75, 100].map((lim) => (
                      <button
                        key={lim}
                        type="button"
                        onClick={() => setConfig({ ...config, trialTenantLimit: lim })}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          config.trialTenantLimit === lim
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                            : "bg-[#0d0f12] text-slate-400 border-white/6 hover:text-white"
                        }`}
                      >
                        {lim}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Base Allowed Buildings */}
                <div className="p-4 rounded-xl bg-[#16191f] border border-white/6 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      🏢 Base Allowed Properties
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Buildings allowed before Multi-Property add-on applies
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setConfig({ ...config, baseAllowedBuildings: b })}
                        className={`w-9 h-9 rounded-lg font-mono font-bold text-xs border transition-all cursor-pointer ${
                          config.baseAllowedBuildings === b
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                            : "bg-[#0d0f12] text-slate-400 border-white/6 hover:text-white"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Founder Contact & Billing Credentials */}
            <div className="p-5 rounded-2xl bg-[#111317] border border-white/8 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Founder Contact & UPI
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">PAYMENT / SUPPORT</span>
              </div>

              <div className="space-y-4">
                {/* WhatsApp Support Number */}
                <div className="p-4 rounded-xl bg-[#16191f] border border-white/6 space-y-1.5">
                  <label className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                    💬 Founder WhatsApp Number
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">+91</span>
                    <input
                      type="text"
                      value={config.founderWhatsapp}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          founderWhatsapp: e.target.value.replace(/\D/g, "").slice(0, 10),
                        })
                      }
                      placeholder="9206651295"
                      className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Used for direct wa.me chat links and priority onboarding support.
                  </p>
                </div>

                {/* Official UPI VPA ID */}
                <div className="p-4 rounded-xl bg-[#16191f] border border-white/6 space-y-1.5">
                  <label className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                    📱 Official UPI VPA ID
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={config.founderUpiVpa}
                      onChange={(e) =>
                        setConfig({ ...config, founderUpiVpa: e.target.value.trim() })
                      }
                      placeholder="rameshdarisi01@ybl"
                      className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Target VPA for all instant QR codes and offline proof submissions.
                  </p>
                </div>

                {/* Payee Legal Name */}
                <div className="p-4 rounded-xl bg-[#16191f] border border-white/6 space-y-1.5">
                  <label className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                    🏛️ Official Payee Legal Name
                  </label>
                  <input
                    type="text"
                    value={config.founderUpiName}
                    onChange={(e) =>
                      setConfig({ ...config, founderUpiName: e.target.value })
                    }
                    placeholder="RAMESH DARISI"
                    className="w-full bg-[#0d0f12] border border-white/10 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Display name for UPI deep links and bank receipts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
