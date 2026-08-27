"use client";

import { useState } from "react";
import { FounderSidebar } from "@/components/founder/FounderSidebar";
import { FounderHeader } from "@/components/founder/FounderHeader";
import {
  Radio,
  Send,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Smartphone,
  ExternalLink,
  Layers,
  X,
  Eye,
  Trash2,
  RotateCcw,
  Zap,
  Filter,
  Check,
  MessageSquare,
} from "lucide-react";

interface BroadcastItem {
  id: string;
  title: string;
  message: string;
  type: "FEATURE" | "NOTICE" | "MAINTENANCE" | "COMPLIANCE";
  channels: ("IN_APP" | "WHATSAPP" | "POPUP")[];
  target: string;
  targetCount: number;
  timestamp: string;
  status: "ACTIVE" | "COMPLETED" | "SCHEDULED";
  ctaText?: string;
  ctaLink?: string;
}

const INITIAL_BROADCASTS: BroadcastItem[] = [
  {
    id: "bc-1",
    title: "1-Click CA Multi-Sheet Excel Pack is Live!",
    message: "PG owners can now export GAAP-ready multi-sheet accounts workbooks directly from the Reports Hub with Security Deposit Escrow.",
    type: "FEATURE",
    channels: ["IN_APP", "WHATSAPP"],
    target: "All 48 PG Clients (All India)",
    targetCount: 48,
    timestamp: "Yesterday at 4:30 PM",
    status: "ACTIVE",
    ctaText: "Open Reports Hub",
    ctaLink: "/p/reports",
  },
  {
    id: "bc-2",
    title: "Karnataka Police Verification Compliance Format Update",
    message: "Updated police tenant background verification forms for Bangalore Koramangala & HSR PGs have been synchronized.",
    type: "COMPLIANCE",
    channels: ["IN_APP", "POPUP"],
    target: "Bangalore PGs Only (26)",
    targetCount: 26,
    timestamp: "3 days ago",
    status: "ACTIVE",
    ctaText: "Download Forms",
    ctaLink: "/p/settings",
  },
  {
    id: "bc-3",
    title: "Scheduled Cloud Firestore Index Optimization",
    message: "Platform index updates will run tonight from 2:00 AM to 2:15 AM IST. Zero downtime expected.",
    type: "MAINTENANCE",
    channels: ["IN_APP"],
    target: "All 48 PG Clients (All India)",
    targetCount: 48,
    timestamp: "1 week ago",
    status: "COMPLETED",
  },
];

export default function ApexCommandBroadcastPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>(INITIAL_BROADCASTS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"FEATURE" | "NOTICE" | "MAINTENANCE" | "COMPLIANCE">("FEATURE");
  const [selectedChannels, setSelectedChannels] = useState<("IN_APP" | "WHATSAPP" | "POPUP")[]>([
    "IN_APP",
    "WHATSAPP",
  ]);
  const [target, setTarget] = useState("ALL");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [isSending, setIsSending] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleChannel = (channel: "IN_APP" | "WHATSAPP" | "POPUP") => {
    if (selectedChannels.includes(channel)) {
      if (selectedChannels.length > 1) {
        setSelectedChannels(selectedChannels.filter((c) => c !== channel));
      }
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert("Please enter broadcast title and message details.");
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      const targetCountMap: Record<string, { label: string; count: number }> = {
        ALL: { label: "All 48 PG Clients (All India)", count: 48 },
        BLR: { label: "Bangalore PGs Only (26)", count: 26 },
        HYD: { label: "Hyderabad PGs Only (14)", count: 14 },
        PUN: { label: "Pune PGs Only (8)", count: 8 },
        AT_RISK: { label: "At-Risk Accounts Only (2)", count: 2 },
      };

      const selectedTarget = targetCountMap[target] || targetCountMap.ALL;

      const newBC: BroadcastItem = {
        id: `bc-${Date.now()}`,
        title,
        message,
        type,
        channels: selectedChannels,
        target: selectedTarget.label,
        targetCount: selectedTarget.count,
        timestamp: "Just now",
        status: "ACTIVE",
        ctaText: ctaText.trim() || undefined,
        ctaLink: ctaLink.trim() || undefined,
      };

      setBroadcasts([newBC, ...broadcasts]);
      setIsSending(false);
      setTitle("");
      setMessage("");
      setCtaText("");
      setCtaLink("");
      triggerToast(`✓ Platform broadcast successfully pushed to ${selectedTarget.count} PG client dashboards!`);
    }, 600);
  };

  const handleDeactivate = (id: string) => {
    setBroadcasts(
      broadcasts.map((b) => (b.id === id ? { ...b, status: "COMPLETED" as const } : b))
    );
    triggerToast("✓ Broadcast marked as completed/inactive.");
  };

  const handleDelete = (id: string) => {
    setBroadcasts(broadcasts.filter((b) => b.id !== id));
    triggerToast("✓ Broadcast removed from history.");
  };

  const activeBannersCount = broadcasts.filter((b) => b.status === "ACTIVE").length;
  const totalDelivered = broadcasts.reduce((acc, b) => acc + b.targetCount, 0);

  return (
    <div className="flex min-h-screen bg-[#0d0f12] text-slate-100 font-sans selection:bg-[#ff3366]/30 selection:text-white">
      <FounderSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <FounderHeader
          title="Broadcast"
          subtitle="Push live in-app announcements, top alert banners, and WhatsApp broadcasts to PG owners"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 flex-1 max-w-[1400px] mx-auto w-full pb-24">
          {/* Top 4 Macro Telemetry Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Active In-App Banners</span>
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <p className="font-sans font-black text-2xl sm:text-3xl text-emerald-400">
                {activeBannersCount} Live
              </p>
              <p className="text-[11px] text-slate-400">Pushed to client headers</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Total Dispatches</span>
                <Send className="w-4 h-4 text-[#ff5436]" />
              </div>
              <p className="font-sans font-black text-2xl sm:text-3xl text-white">
                {totalDelivered}
              </p>
              <p className="text-[11px] text-slate-400">All-time received messages</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Audience Reach</span>
                <Smartphone className="w-4 h-4 text-blue-400" />
              </div>
              <p className="font-sans font-black text-2xl sm:text-3xl text-blue-400">
                48 PGs
              </p>
              <p className="text-[11px] text-slate-400">100% network addressable</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#16191f] border border-white/8 shadow-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Read & Acknowledged</span>
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
              </div>
              <p className="font-sans font-black text-2xl sm:text-3xl text-purple-400">
                94.8%
              </p>
              <p className="text-[11px] text-slate-400">Average engagement rate</p>
            </div>
          </div>

          {/* Main 2-Column Section: Broadcast Composer & Live Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Composer (7 cols) */}
            <div className="lg:col-span-7 bg-[#16191f] border border-white/8 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <h3 className="font-sans font-black text-lg text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-[#ff5436]" />
                    Compose Platform Broadcast
                  </h3>
                  <p className="text-xs text-slate-400">
                    Instantly broadcast critical updates, feature releases, or notices
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                {/* Channels Selection */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">
                    Delivery Channels *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleChannel("IN_APP")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedChannels.includes("IN_APP")
                          ? "bg-gradient-to-r from-[#ff3366]/20 to-[#ff8400]/20 border-[#ff5436] text-white"
                          : "bg-[#0d0f12] border-white/8 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>In-App Banner</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleChannel("WHATSAPP")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedChannels.includes("WHATSAPP")
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : "bg-[#0d0f12] border-white/8 text-slate-400 hover:text-white"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleChannel("POPUP")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedChannels.includes("POPUP")
                          ? "bg-purple-500/20 border-purple-500 text-purple-400"
                          : "bg-[#0d0f12] border-white/8 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Modal Pop-up</span>
                    </button>
                  </div>
                </div>

                {/* Headline */}
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
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Message Details *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Explain the update clearly for PG owners..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436] resize-none"
                  />
                </div>

                {/* Category & Target Audience */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Banner Category *
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    >
                      <option value="FEATURE">🚀 Feature Update</option>
                      <option value="NOTICE">📢 Important Notice</option>
                      <option value="MAINTENANCE">⚠️ Maintenance Alert</option>
                      <option value="COMPLIANCE">⚖️ Police & Legal Compliance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Target Audience *
                    </label>
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    >
                      <option value="ALL">All 48 PG Clients (All India)</option>
                      <option value="BLR">Bangalore PGs Only (26)</option>
                      <option value="HYD">Hyderabad PGs Only (14)</option>
                      <option value="PUN">Pune PGs Only (8)</option>
                      <option value="AT_RISK">At-Risk Accounts Only (2)</option>
                    </select>
                  </div>
                </div>

                {/* Optional CTA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      CTA Button Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="e.g. Try Feature Now"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      CTA Redirect Link (Optional)
                    </label>
                    <input
                      type="text"
                      value={ctaLink}
                      onChange={(e) => setCtaLink(e.target.value)}
                      placeholder="e.g. /p/reports or https://..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#0d0f12] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-[#ff5436]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#ff3366] via-[#ff5436] to-[#ff8400] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-[#ff3366]/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50 mt-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? "Broadcasting..." : "Dispatch Broadcast to PG Dashboards ➔"}</span>
                </button>
              </form>
            </div>

            {/* Right: Live Interactive Mockup Simulator (5 cols) */}
            <div className="lg:col-span-5 bg-[#16191f] border border-white/8 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/8 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      Client Live Screen Preview
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Real-time simulator</span>
                </div>

                {/* Mockup Screen Container */}
                <div className="mt-4 p-4 rounded-2xl bg-[#0d0f12] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/8 text-[11px] text-slate-400">
                    <span className="font-bold text-white">Sunshine PG Dashboard</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>

                  {/* The Rendered In-App Banner */}
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                      type === "FEATURE"
                        ? "bg-purple-950/40 border-purple-500/40 text-purple-200"
                        : type === "COMPLIANCE"
                        ? "bg-blue-950/40 border-blue-500/40 text-blue-200"
                        : type === "MAINTENANCE"
                        ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
                        : "bg-rose-950/40 border-[#ff3366]/40 text-rose-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-black/40 border border-white/10">
                        {type === "FEATURE"
                          ? "🚀 Feature Update"
                          : type === "COMPLIANCE"
                          ? "⚖️ Compliance"
                          : type === "MAINTENANCE"
                          ? "⚠️ Maintenance"
                          : "📢 Notice"}
                      </span>
                      <X className="w-3.5 h-3.5 opacity-60 cursor-pointer" />
                    </div>

                    <h5 className="font-bold text-xs text-white">
                      {title.trim() || "1-Click CA Multi-Sheet Excel Pack is Live!"}
                    </h5>
                    <p className="text-[11px] opacity-80 leading-relaxed">
                      {message.trim() ||
                        "PG owners can now export GAAP-ready multi-sheet accounts workbooks directly from the Reports Hub."}
                    </p>

                    {(ctaText || title) && (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 text-white font-bold text-[10px] hover:bg-white/25 transition-all">
                          {ctaText.trim() || "Explore Update"} ➔
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Dummy Dashboard Content below banner */}
                  <div className="p-3 rounded-xl bg-white/2 border border-white/5 space-y-2 opacity-50 pointer-events-none">
                    <div className="h-3 w-1/3 bg-white/20 rounded-md"></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-10 bg-white/10 rounded-lg"></div>
                      <div className="h-10 bg-white/10 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0d0f12] border border-white/6 text-xs text-slate-400 space-y-1">
                <div className="flex items-center gap-2 text-white font-bold text-[11px]">
                  <Zap className="w-3.5 h-3.5 text-[#ff5436]" />
                  <span>Instant Edge Push Delivery</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  Broadcasts render on all active PG client browser tabs via Firestore Realtime Listeners within ~150ms.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Recent Broadcast Dispatches Log */}
          <div className="bg-[#16191f] border border-white/8 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <h3 className="font-sans font-black text-lg text-white">
                  Broadcast Dispatches History
                </h3>
                <p className="text-xs text-slate-400">
                  Track active announcement status, delivery count, and revoke permissions
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {broadcasts.map((bc) => (
                <div
                  key={bc.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#0d0f12] border border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-all group"
                >
                  <div className="space-y-1.5 max-w-2xl min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          bc.type === "FEATURE"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                            : bc.type === "COMPLIANCE"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : bc.type === "MAINTENANCE"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-[#ff3366]/20 text-[#ff5436] border border-[#ff3366]/30"
                        }`}
                      >
                        {bc.type}
                      </span>

                      {bc.channels.map((ch) => (
                        <span
                          key={ch}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400 uppercase"
                        >
                          {ch === "IN_APP" ? "In-App" : ch === "WHATSAPP" ? "WhatsApp" : "Pop-up"}
                        </span>
                      ))}

                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          bc.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                        }`}
                      >
                        {bc.status}
                      </span>

                      <span className="text-[10px] text-slate-500 font-mono ml-auto sm:ml-0">
                        {bc.timestamp}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white">{bc.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {bc.message}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span>
                        Target: <strong className="text-slate-300">{bc.target}</strong>
                      </span>
                      <span>
                        Delivered: <strong className="text-emerald-400">{bc.targetCount} PGs</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {bc.status === "ACTIVE" ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(bc.id)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 px-3 py-1.5">
                        Archived
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(bc.id)}
                      title="Delete from history"
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Toast Notification */}
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
