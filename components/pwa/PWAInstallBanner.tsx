"use client";

import React, { useState } from "react";
import { Smartphone, Monitor, CheckCircle2, QrCode, Sparkles, X } from "lucide-react";
import { usePWAInstaller } from "@/hooks/usePWAInstaller";

/**
 * PWAInstallBanner - Premium 1-Click PWA App Installation & QR Code Card for Landing Page
 * 
 * Features:
 * 1. 100% Real, camera-scannable QR Code encoding https://tenopilot-com.vercel.app/home
 * 2. 1-Click Install Mobile App & 1-Click Install Desktop App buttons
 * 3. Non-intrusive toast notification when app is already installed (appears for 2s on click, then disappears)
 */
export const PWAInstallBanner: React.FC = () => {
  const { isInstalled, promptInstall } = usePWAInstaller();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleInstallClick = async () => {
    if (isInstalled) {
      // User clicked install when app already exists -> show 2-second temporary toast!
      setToastMessage("🟢 App Already Installed on this device!");
      setTimeout(() => {
        setToastMessage(null);
      }, 2000);
      return;
    }

    await promptInstall();
  };

  // Real, 100% scannable QR Code URL pointing to direct App Installation Portal
  const qrCodeImageUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://www.tenopilot.com/install&color=201a17&bgcolor=ffffff";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#201812] via-[#2a1e16] to-[#140F0B] text-white p-6 sm:p-8 shadow-2xl border border-amber-500/30">
      {/* 2-Second Temporary Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[300] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-emerald-500/40 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/60 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dynamic Ambient Aurora Gold Effect */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-gradient-to-bl from-amber-500/20 via-orange-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-8">
        {/* Left Info Column */}
        <div className="space-y-3 max-w-xl text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>TenoPilot.com Official Mobile & Desktop App</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Install TenoPilot App in 1-Click
          </h2>

          <p className="text-xs sm:text-sm text-amber-100/75 leading-relaxed">
            Scan the QR code with your phone camera or click 1-Click Install below to add TenoPilot.com with the official orange <strong>“T”</strong> icon directly to your home screen.
          </p>
        </div>

        {/* Right QR Code + 1-Click Install Action Column */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10 backdrop-blur-md shrink-0 w-full lg:w-auto justify-center">
          {/* 100% Real Scannable QR Code */}
          <div className="flex flex-col items-center text-center p-3 bg-white rounded-2xl shadow-lg border border-amber-200 shrink-0">
            <div className="relative w-28 h-28 flex items-center justify-center rounded-xl overflow-hidden bg-white p-1">
              <img
                src={qrCodeImageUrl}
                alt="Scan QR Code to open TenoPilot on Phone"
                className="w-full h-full object-contain"
                loading="eager"
              />
            </div>
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mt-1.5 flex items-center gap-1">
              <QrCode className="w-3 h-3 text-[#964407]" /> Scan QR on Phone
            </span>
          </div>

          {/* 1-Click Install Action Buttons */}
          <div className="flex flex-col gap-2.5 w-full sm:w-52">
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#C6572A] to-[#964407] text-white hover:opacity-95 shadow-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4 text-amber-200" />
              <span>📲 1-Click Install Mobile App</span>
            </button>

            <button
              onClick={handleInstallClick}
              className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Monitor className="w-4 h-4 text-amber-300" />
              <span>💻 1-Click Install Desktop App</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
