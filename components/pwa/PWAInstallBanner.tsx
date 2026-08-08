"use client";

import React from "react";
import { Download, Smartphone, Monitor, CheckCircle2, QrCode, Sparkles } from "lucide-react";
import { usePWAInstaller } from "@/hooks/usePWAInstaller";

/**
 * PWAInstallBanner - Premium 1-Click PWA App Installation & QR Code Card
 * 
 * Features:
 * 1. High-res QR code for desktop users to scan with mobile camera
 * 2. 1-Click Install Mobile App button (triggers native system install prompt directly)
 * 3. 1-Click Install Desktop App button
 * 4. Automatic detection of existing app installation with "App Already Exists" status
 */
export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, promptInstall, installedStatusMessage } = usePWAInstaller();

  // QR Code SVG generating pointing to TenoPilot Home
  const qrTargetUrl = "https://tenopilot-com.vercel.app/home";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#201812] via-[#2a1e16] to-[#140F0B] text-white p-6 sm:p-8 shadow-2xl border border-amber-500/30">
      {/* Dynamic Background Aurora Effect */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-gradient-to-bl from-amber-500/20 via-orange-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-8">
        {/* Left Info Column */}
        <div className="space-y-3 max-w-xl text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>TenoPilot.com Official Progressive Web App</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Install TenoPilot on Mobile & Desktop
          </h2>

          <p className="text-xs sm:text-sm text-amber-100/75 leading-relaxed">
            Get 1-tap instant access right from your mobile Home Screen or desktop. Fast performance, zero browser URL bars, and live real-time notifications.
          </p>

          {/* Installation Status Pill */}
          {isInstalled ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>App Already Exists on This Device!</span>
            </div>
          ) : installedStatusMessage ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{installedStatusMessage}</span>
            </div>
          ) : null}
        </div>

        {/* Right QR Code + 1-Click Install Action Column */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10 backdrop-blur-md shrink-0 w-full lg:w-auto justify-center">
          {/* QR Code Container (Scanning on Mobile) */}
          <div className="flex flex-col items-center text-center p-3 bg-white rounded-xl shadow-lg border border-amber-200 shrink-0">
            <div className="relative w-28 h-28 flex items-center justify-center bg-slate-900 rounded-lg overflow-hidden">
              {/* High-res Styled QR Symbol SVG */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 bg-white p-2">
                <rect x="0" y="0" width="100" height="100" fill="white" />
                {/* QR Finder Patterns Top-Left, Top-Right, Bottom-Left */}
                <path d="M10,10 h25 v25 h-25 z M15,15 h15 v15 h-15 z M18,18 h9 v9 h-9 z" fill="#201a17" />
                <path d="M65,10 h25 v25 h-25 z M70,15 h15 v15 h-15 z M73,18 h9 v9 h-9 z" fill="#201a17" />
                <path d="M10,65 h25 v25 h-25 z M15,70 h15 v15 h-15 z M18,73 h9 v9 h-9 z" fill="#201a17" />
                {/* Data Modules */}
                <rect x="42" y="10" width="8" height="8" fill="#c2652a" />
                <rect x="52" y="18" width="8" height="8" fill="#201a17" />
                <rect x="42" y="28" width="8" height="8" fill="#201a17" />
                <rect x="10" y="42" width="8" height="8" fill="#c2652a" />
                <rect x="22" y="42" width="8" height="8" fill="#201a17" />
                <rect x="34" y="42" width="8" height="8" fill="#c2652a" />
                <rect x="46" y="42" width="12" height="12" fill="#c2652a" />
                <rect x="62" y="42" width="8" height="8" fill="#201a17" />
                <rect x="74" y="42" width="8" height="8" fill="#c2652a" />
                <rect x="84" y="42" width="6" height="6" fill="#201a17" />
                <rect x="42" y="65" width="8" height="8" fill="#201a17" />
                <rect x="54" y="73" width="8" height="8" fill="#c2652a" />
                <rect x="65" y="65" width="10" height="10" fill="#201a17" />
                <rect x="78" y="75" width="12" height="12" fill="#c2652a" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mt-1.5 flex items-center gap-1">
              <QrCode className="w-3 h-3 text-[#964407]" /> Scan QR on Phone
            </span>
          </div>

          {/* 1-Click Install Action Buttons */}
          <div className="flex flex-col gap-2.5 w-full sm:w-52">
            <button
              onClick={promptInstall}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 ${
                isInstalled
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-gradient-to-r from-[#C6572A] to-[#964407] text-white hover:opacity-95"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>{isInstalled ? "✓ App Installed" : "📲 1-Click Install Mobile App"}</span>
            </button>

            <button
              onClick={promptInstall}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Monitor className="w-4 h-4 text-amber-300" />
              <span>💻 Install Desktop App</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
