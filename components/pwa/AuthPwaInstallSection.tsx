"use client";

import React, { useState } from "react";
import { Smartphone, Monitor, CheckCircle2, QrCode, X } from "lucide-react";
import { usePWAInstaller } from "@/hooks/usePWAInstaller";

export function AuthPwaInstallSection() {
  const { isInstalled, promptInstall } = usePWAInstaller();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleInstallClick = async () => {
    if (isInstalled) {
      setToastMessage("🟢 App is already installed on this device!");
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }
    await promptInstall();
  };

  // Real, 100% scannable QR Code URL that opens the direct App Installation page on mobile
  const qrCodeImageUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://www.tenopilot.com/install&color=201a17&bgcolor=ffffff";

  return (
    <div className="w-full pt-2">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[300] bg-[#201a17] text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-emerald-500/40 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/60 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Classic PWA Install & QR Links Box */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9] shadow-xs flex flex-col sm:flex-row items-center gap-3.5">
        {/* Real Scannable QR Code */}
        <div className="flex flex-col items-center text-center p-2 bg-white rounded-xl shadow-2xs border border-[#d7c2b9] shrink-0">
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center rounded-lg overflow-hidden bg-white p-0.5">
            <img
              src={qrCodeImageUrl}
              alt="Scan QR Code to open TenoPilot on Phone"
              className="w-full h-full object-contain"
              loading="eager"
            />
          </div>
          <span className="text-[9px] font-bold text-[#554339] uppercase tracking-wider mt-1 flex items-center gap-1">
            <QrCode className="w-2.5 h-2.5 text-[#964407]" /> Scan on Phone
          </span>
        </div>

        {/* Action Info & Install Buttons */}
        <div className="flex-1 space-y-2 w-full text-center sm:text-left">
          <div>
            <h4 className="font-serif font-bold text-xs text-[#201a17]">
              Install TenoPilot App in 1-Click
            </h4>
            <p className="text-[10px] text-[#554339] font-medium leading-tight mt-0.5">
              Scan with phone camera or click below to install directly to home screen.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-2 px-3 rounded-xl font-bold text-[11px] bg-gradient-to-r from-[#c2652a] to-[#964407] hover:opacity-95 text-white shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-200" />
              <span>📲 1-Click Install Mobile App</span>
            </button>

            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-gray-50 border border-[#d7c2b9] text-[#201a17] font-bold text-[10px] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <Monitor className="w-3.5 h-3.5 text-[#964407]" />
              <span>💻 1-Click Install Desktop App</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
