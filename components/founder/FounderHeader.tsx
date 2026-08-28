"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Menu,
  Sparkles,
  Ticket,
  Cloud,
  ShieldCheck,
  Search,
  Zap,
} from "lucide-react";

interface FounderHeaderProps {
  title: string;
  subtitle?: string;
  onMobileMenuToggle: () => void;
  actionElement?: React.ReactNode;
}

export function FounderHeader({
  title,
  subtitle,
  onMobileMenuToggle,
  actionElement,
}: FounderHeaderProps) {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#0d0f12]/90 backdrop-blur-xl border-b border-white/8 px-4 sm:px-6 md:px-8 py-3.5 flex items-center justify-between gap-4 text-white">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 md:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif font-bold text-base sm:text-lg text-white tracking-tight">
              {title}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Cloud className="w-3 h-3" /> CLOUD FIRESTORE 🟢
            </span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#16191f] border border-white/6 text-slate-300 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>IST: {timeStr || "10:30 PM"}</span>
        </div>

        {/* Optional Action element */}
        {actionElement}
      </div>
    </header>
  );
}
