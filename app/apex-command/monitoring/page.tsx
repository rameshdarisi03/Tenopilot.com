"use client";

import { useState } from "react";
import { FounderSidebar } from "@/components/founder/FounderSidebar";
import { FounderHeader } from "@/components/founder/FounderHeader";
import {
  Activity,
  ShieldCheck,
  Video,
  Send,
  Bell,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Zap,
  Globe,
  Radio,
  Clock,
  Play,
  Cpu,
  Layers,
  X,
} from "lucide-react";

interface BroadcastRecord {
  id: string;
  title: string;
  message: string;
  type: "FEATURE" | "NOTICE" | "MAINTENANCE";
  target: string;
  timestamp: string;
  deliveredCount: number;
}

const INITIAL_BROADCASTS: BroadcastRecord[] = [
  {
    id: "bc-1",
    title: "1-Click CA Multi-Sheet Excel Pack is Live!",
    message: "PG owners can now export GAAP-ready multi-sheet accounts workbooks directly from the Reports Hub.",
    type: "FEATURE",
    target: "All 48 PG Clients",
    timestamp: "Yesterday at 4:30 PM",
    deliveredCount: 48,
  },
  {
    id: "bc-2",
    title: "Karnataka Police Verification Format Update",
    message: "Updated police compliance forms for Bangalore Koramangala & HSR PGs have been synchronized.",
    type: "NOTICE",
    target: "Bangalore PGs (26)",
    timestamp: "3 days ago",
    deliveredCount: 26,
  },
];

export default function ApexCommandMonitoringPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>(INITIAL_BROADCASTS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"FEATURE" | "NOTICE" | "MAINTENANCE">("FEATURE");
  const [target, setTarget] = useState("ALL");
  const [isSending, setIsSending] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      alert("Please fill in broadcast title and message.");
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      const newBC: BroadcastRecord = {
        id: `bc-${Date.now()}`,
        title,
        message,
        type,
        target: target === "ALL" ? "All 48 PG Clients" : target === "BLR" ? "Bangalore PGs (26)" : "Hyderabad PGs (14)",
        timestamp: "Just now",
        deliveredCount: target === "ALL" ? 48 : target === "BLR" ? 26 : 14,
      };

      setBroadcasts([newBC, ...broadcasts]);
      setIsSending(false);
      setTitle("");
      setMessage("");
      triggerToast(`✓ Platform broadcast dispatched to ${newBC.deliveredCount} PG dashboards!`);
    }, 600);
  };

  return (
    <div className="flex min-h-screen bg-[#0d0f12] text-slate-100 font-sans selection:bg-[#ff3366]/30 selection:text-white">
      <FounderSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <FounderHeader
          title="Health Monitor"
          subtitle="Real-time error diagnostics, client session replay links, and system uptime"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 flex-1 max-w-[1400px] mx-auto w-full pb-24">
          {/* Section 1: Sentry Crash Shield & PostHog Replay Bento (2 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentry Box */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/8 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                        Sentry Error Shield
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      </h3>
                      <p className="text-xs text-slate-400">Zero-downtime runtime exception tracker</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    100.0% Crash-Free
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-[#0d0f12] border border-white/8 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Error Rate</span>
                    <p className="font-bold text-lg text-emerald-400">0.00%</p>
                    <p className="text-[10px] text-slate-400">Healthy 🟢</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#0d0f12] border border-white/8 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">API Latency</span>
                    <p className="font-bold text-lg text-white">142ms</p>
                    <p className="text-[10px] text-slate-400">Fast response</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#0d0f12] border border-white/8 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Captured (24h)</span>
                    <p className="font-bold text-lg text-purple-400">0 Crashes</p>
                    <p className="text-[10px] text-slate-400">All routes clean</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Sentry automatically monitors frontend crashes, Gemini Vision AI FastTrack scan timeouts, and Cloud Firestore permission failures across all client devices.
                </p>
              </div>

              <a
                href="https://sentry.io"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-center text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Sentry Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* PostHog Box */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/8 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#ff3366]/10 border border-[#ff3366]/20 text-[#ff5436] flex items-center justify-center font-bold">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-white">
                        PostHog Session Replay
                      </h3>
                      <p className="text-xs text-slate-400">Watch user interaction playbacks & drop-off funnels</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#ff3366]/15 text-[#ff5436] border border-[#ff3366]/30">
                    Live Session Feed
                  </span>
                </div>

                {/* Funnel Progress */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Onboarding Activation Funnel</span>
                  <div className="p-3.5 rounded-2xl bg-[#0d0f12] border border-white/8 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>1. Code Redeemed ➔ 2. Layout Created</span>
                      <strong className="text-emerald-400">88% Completion</strong>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#ff3366] to-[#ff8400] w-[88%] rounded-full"></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>3. Added 1st Tenant ➔ 4. Logged Rent</span>
                      <strong className="text-blue-400">74% Completion</strong>
                    </div>
                  </div>
                </div>

                {/* Recent Session Replays */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/2 border border-white/6 text-xs">
                    <span className="font-bold text-white">Sunshine PG (Ramesh D.)</span>
                    <span className="text-slate-400 text-[10px]">4m 12s • 15 clicks</span>
                    <button type="button" className="text-[#ff5436] text-[11px] font-bold flex items-center gap-1 hover:underline cursor-pointer">
                      <Play className="w-3 h-3 fill-current" /> Watch
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/2 border border-white/6 text-xs">
                    <span className="font-bold text-white">Sri Lakshmi PG (Suresh R.)</span>
                    <span className="text-slate-400 text-[10px]">2m 45s • FastTrack AI</span>
                    <button type="button" className="text-[#ff5436] text-[11px] font-bold flex items-center gap-1 hover:underline cursor-pointer">
                      <Play className="w-3 h-3 fill-current" /> Watch
                    </button>
                  </div>
                </div>
              </div>

              <a
                href="https://posthog.com"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-center text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open PostHog Analytics</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Section 2: Infrastructure Vitals (Cloud Firestore, Gemini Vision AI, WhatsApp Cloud API) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Firestore Telemetry */}
            <div className="p-6 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Cloud Firestore</h4>
                    <p className="text-[10px] text-slate-400">Database & Realtime Listeners</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Healthy 🟢
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d0f12] border border-white/6">
                  <span className="text-slate-400">Active Snapshot Listeners</span>
                  <span className="font-bold text-white">48 Client Nodes</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d0f12] border border-white/6">
                  <span className="text-slate-400">Read / Write Latency</span>
                  <span className="font-bold text-emerald-400">42ms (P95)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d0f12] border border-white/6">
                  <span className="text-slate-400">Sync Success Rate</span>
                  <span className="font-bold text-white">99.98%</span>
                </div>
              </div>
            </div>

            {/* Gemini Vision AI Engine */}
            <div className="p-6 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Gemini Vision AI</h4>
                    <p className="text-[10px] text-slate-400">FastTrack Document OCR Engine</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  Ready ⚡
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d0f12] border border-white/6">
                  <span className="text-slate-400">Ledger Ingestion Speed</span>
                  <span className="font-bold text-purple-400">1.8s / Register Page</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d0f12] border border-white/6">
                  <span className="text-slate-400">Extraction Accuracy</span>
                  <span className="font-bold text-white">99.4% Multi-Bed Match</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d0f12] border border-white/6">
                  <span className="text-slate-400">Model Version</span>
                  <span className="font-bold text-slate-300 font-mono text-[10px]">Gemini 1.5 Flash</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Cloud Gateway */}
            <div className="p-6 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#ff3366]/10 text-[#ff5436] flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">WhatsApp Cloud API</h4>
                    <p className="text-[10px] text-slate-400">Meta Business Messaging</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Connected 🟢
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d0f12] border border-white/6">
                  <span className="text-slate-400">Webhook Delivery</span>
                  <span className="font-bold text-emerald-400">100% Up</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d0f12] border border-white/6">
                  <span className="text-slate-400">Average Dispatch Time</span>
                  <span className="font-bold text-white">210ms</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d0f12] border border-white/6">
                  <span className="text-slate-400">Simulation Sandbox</span>
                  <span className="font-bold text-[#ff5436]">Zero-Config Ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* Broadcast Quick Banner Link */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-[#ff3366]/15 via-[#ff5436]/10 to-[#ff8400]/15 border border-[#ff3366]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#ff3366]/20 text-[#ff5436] flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  Looking to push global announcements or notices?
                </h4>
                <p className="text-xs text-slate-300">
                  Create and manage in-app banners and WhatsApp broadcasts in the dedicated Broadcast Center.
                </p>
              </div>
            </div>
            <a
              href="/apex-command/broadcast"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] text-white text-xs font-bold shrink-0 hover:opacity-95 transition-all shadow-md shadow-[#ff3366]/25 active:scale-95"
            >
              Open Broadcast Center ➔
            </a>
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
