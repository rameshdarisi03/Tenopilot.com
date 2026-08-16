"use client";

import React, { useState } from "react";
import { Smartphone, CheckCircle2, QrCode, X, Download } from "lucide-react";
import { usePWAInstaller } from "@/hooks/usePWAInstaller";

export function CompactPwaInstallCard() {
  const { isInstalled, promptInstall } = usePWAInstaller();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleInstallClick = async () => {
    if (isInstalled) {
      setToastMessage("🟢 App is already installed on this device!");
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }
    await promptInstall();
  };

  const qrCodeImageUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://www.tenopilot.com/install&color=201a17&bgcolor=ffffff";

  return (
    <>
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

      {/* Compact Theme-Matching PWA & QR Card */}
      <div className="p-3 bg-[#fff8f6] rounded-2xl border border-[#d7c2b9] flex items-center justify-between gap-3 text-xs shadow-2xs">
        {/* Left: Scannable Mini QR Thumbnail */}
        <button
          type="button"
          onClick={() => setShowQrModal(true)}
          className="relative w-12 h-12 bg-white rounded-xl border border-[#d7c2b9] p-1 shrink-0 group cursor-pointer hover:border-[#964407] transition-all shadow-2xs"
          title="Click to expand QR Code"
        >
          <img
            src={qrCodeImageUrl}
            alt="QR Code"
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-[#964407]/80 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
            <QrCode className="w-4 h-4" />
          </div>
        </button>

        {/* Center: Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[#201a17] text-xs truncate">
            TenoPilot PWA App
          </h4>
          <p className="text-[10px] text-[#554339] font-medium truncate">
            Scan QR with phone camera
          </p>
        </div>

        {/* Right: 1-Click Install Button */}
        <button
          type="button"
          onClick={handleInstallClick}
          className="py-2 px-3 rounded-xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-[11px] flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      </div>

      {/* Expanded QR Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-[#d7c2b9] shadow-2xl max-w-xs w-full p-6 text-center space-y-4 animate-in zoom-in-95 text-xs text-[#201a17]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f8ede3] pb-3">
              <h3 className="font-serif font-bold text-sm text-[#201a17]">
                Scan to Open on Mobile
              </h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-[#d7c2b9] shadow-inner inline-block mx-auto">
              <img
                src={qrCodeImageUrl}
                alt="Scan QR code on Mobile"
                className="w-44 h-44 object-contain"
              />
            </div>

            <p className="text-[11px] text-[#554339] leading-relaxed">
              Open your phone camera to instantly launch TenoPilot on your smartphone.
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#201a17] font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
