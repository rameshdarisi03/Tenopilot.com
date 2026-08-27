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

          {/* Section 2: Global Platform Announcement & Broadcast Center */}
          <div className="bg-[#16191f] border border-white/8 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-[#ff5436]" />
                  Global Platform Announcement & Broadcast Desk
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Push in-app announcement banners or WhatsApp broadcast messages to all onboarded PG dashboards
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Broadcast Composer Form */}
              <form onSubmit={handleSendBroadcast} className="space-y-4 p-5 rounded-2xl bg-[#0d0f12] border border-white/8">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Compose Live Platform Broadcast
                </h4>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Announcement Headline *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. New Feature: Instant GST Invoicing is now live!"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#16191f] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Broadcast Message Details *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Explain the update clearly for PG owners..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#16191f] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Banner Type *
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#16191f] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    >
                      <option value="FEATURE">🚀 Feature Update</option>
                      <option value="NOTICE">📢 General Notice</option>
                      <option value="MAINTENANCE">⚠️ Maintenance Alert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Target Audience *
                    </label>
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#16191f] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    >
                      <option value="ALL">All 48 PG Clients (All India)</option>
                      <option value="BLR">Bangalore PGs Only (26)</option>
                      <option value="HYD">Hyderabad PGs Only (14)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] hover:opacity-95 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? "Broadcasting..." : "Dispatch Broadcast to Clients ➔"}</span>
                </button>
              </form>

              {/* Past Broadcast History */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Recent Broadcast Dispatches
                </h4>

                <div className="space-y-2.5">
                  {broadcasts.map((bc) => (
                    <div
                      key={bc.id}
                      className="p-4 rounded-2xl bg-[#0d0f12] border border-white/8 space-y-2 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            bc.type === "FEATURE"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : "bg-[#ff3366]/20 text-[#ff5436] border border-[#ff3366]/30"
                          }`}
                        >
                          {bc.type}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{bc.timestamp}</span>
                      </div>

                      <h5 className="font-bold text-xs text-white">{bc.title}</h5>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{bc.message}</p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/6">
                        <span>Audience: <strong className="text-slate-300">{bc.target}</strong></span>
                        <span className="text-emerald-400 font-bold">✓ Delivered ({bc.deliveredCount})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
