"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { FounderSidebar } from "@/components/founder/FounderSidebar";
import { FounderHeader } from "@/components/founder/FounderHeader";
import {
  founderStore,
  FounderClientRecord,
} from "@/constants/founderStore";
import {
  AlertTriangle,
  Phone,
  MessageSquare,
  Building2,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  MapPin,
  TrendingDown,
  UserCheck,
  ChevronRight,
  X,
  Share2,
} from "lucide-react";

export default function ApexCommandChurnRadarPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clients, setClients] = useState<FounderClientRecord[]>(() => founderStore.getClients());
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

  const handleSendWhatsAppCheckin = (client: FounderClientRecord) => {
    const cleanPhone = client.ownerPhone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Hello ${client.ownerName} ji! 🙏\n\n` +
      `I'm following up from the TenoPilot founder desk regarding *${client.pgName}*.\n\n` +
      `We noticed you haven't logged in over the past few days. Are you facing any difficulties setting up your room layouts, bed tariffs, or onboarding tenants?\n\n` +
      `Our onboarding specialist can visit your PG or assist you over a 2-minute call today. Would 4:00 PM work for you?`
    );

    const waUrl = cleanPhone.length === 10 ? `https://wa.me/91${cleanPhone}?text=${text}` : `https://wa.me/${cleanPhone}?text=${text}`;
    window.open(waUrl, "_blank");
    triggerToast(`✓ WhatsApp check-in opened for ${client.ownerName}!`);
  };

  const handleExtendTrial = async (client: FounderClientRecord, days: number = 7) => {
    await founderStore.extendClientTrial(client.id, days);
    triggerToast(`✓ Free trial extended by +${days} days for ${client.pgName}!`);
  };

  const atRiskList = clients.filter((c) => c.healthScore === "AT_RISK" || c.status === "EXPIRED");
  const attentionList = clients.filter((c) => c.healthScore === "ATTENTION");
  const healthyList = clients.filter((c) => c.healthScore === "HEALTHY" && c.status !== "EXPIRED");

  return (
    <div className="flex min-h-screen bg-[#0d0f12] text-slate-100 font-sans selection:bg-[#ff3366]/30 selection:text-white">
      <FounderSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <FounderHeader
          title="Client Health & Churn Prevention Radar"
          subtitle="Automated engagement tracking to flag struggling PG owners before they drop off"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 flex-1 max-w-[1400px] mx-auto w-full pb-24">
          {/* Top 3 Radar Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 🔴 High Risk */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#16191f] border border-rose-500/30 shadow-xl flex items-center justify-between group hover:border-rose-500 transition-all">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                    AT-RISK / INACTIVE (7+ DAYS)
                  </span>
                </div>
                <h2 className="font-sans font-extrabold text-3xl text-rose-400 mt-1">
                  {atRiskList.length} Clients
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">High drop-off probability</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            {/* 🟡 Needs Attention */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#16191f] border border-amber-500/30 shadow-xl flex items-center justify-between group hover:border-amber-500 transition-all">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    NEEDS ATTENTION (3-6 DAYS)
                  </span>
                </div>
                <h2 className="font-sans font-extrabold text-3xl text-amber-400 mt-1">
                  {attentionList.length} Clients
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Slowing usage pattern</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* 🟢 Healthy Power Users */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#16191f] border border-emerald-500/30 shadow-xl flex items-center justify-between group hover:border-emerald-500 transition-all">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    HEALTHY / ACTIVE TODAY
                  </span>
                </div>
                <h2 className="font-sans font-extrabold text-3xl text-emerald-400 mt-1">
                  {healthyList.length} Clients
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">94% Retention Rate</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Section 1: 🔴 High Churn Risk (Action Required) */}
          <div className="bg-[#16191f] border border-rose-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/8 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400">🚨</span>
                  At-Risk PG Clients (Action Required)
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Clients who have not logged in for 7+ days or whose trial expired with 0 recent receipts
                </p>
              </div>
              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 shrink-0">
                {atRiskList.length} Urgent Actions
              </span>
            </div>

            {atRiskList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                🎉 No at-risk clients right now! All PG owners are actively using TenoPilot.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {atRiskList.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl bg-[#0d0f12] border border-rose-500/30 space-y-4 hover:border-rose-500/60 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-base text-white">{c.pgName}</h4>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-[#ff5436]" /> {c.area}, {c.city}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          {c.lastActiveDate}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#16191f] border border-white/6 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Owner: <strong className="text-white">{c.ownerName}</strong></span>
                          <span className="font-mono text-slate-400">{c.ownerPhone}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span>Beds: {c.occupiedBeds}/{c.totalBeds}</span>
                          <span>Plan: <strong className="text-amber-400">{c.plan}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/6 gap-2">
                      <button
                        type="button"
                        onClick={() => handleExtendTrial(c, 7)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition-all cursor-pointer"
                      >
                        +7d Trial
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppCheckin(c)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Send WhatsApp Nudge</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: 🟡 Needs Attention Clients */}
          <div className="bg-[#16191f] border border-white/8 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">⚠️</span>
                  Needs Attention (3-6 Days Inactive)
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Send a quick friendly check-in before their trial runs out
                </p>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                {attentionList.length} Monitoring
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attentionList.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl bg-[#0d0f12] border border-amber-500/20 space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">{c.pgName}</h4>
                      <p className="text-[11px] text-slate-400">{c.ownerName} • {c.ownerPhone}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Inactive {c.lastActiveDate}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/6">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppCheckin(c)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Check-in</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

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
