"use client";

import React, { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  X,
  Sparkles,
  ShieldCheck,
  Building,
} from "lucide-react";

interface PublicComplaintQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName?: string;
}

export function PublicComplaintQrModal({
  isOpen,
  onClose,
  propertyId,
  propertyName = "Your Property",
}: PublicComplaintQrModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [portalUrl, setPortalUrl] = useState(`https://www.tenopilot.com/p/${propertyId}/public-complaint`);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPortalUrl(`${window.location.origin}/p/${propertyId}/public-complaint`);
    }
  }, [propertyId]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleDownloadQr = () => {
    const canvas = document.getElementById(`complaint-qr-${propertyId}`) as HTMLCanvasElement;
    if (!canvas) return;

    // Create a high-res branded card on an off-screen canvas
    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    exportCanvas.width = 800;
    exportCanvas.height = 1000;

    // Background Warm Ivory
    ctx.fillStyle = "#fff8f6";
    ctx.fillRect(0, 0, 800, 1000);

    // Decorative Border
    ctx.strokeStyle = "#d7c2b9";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 740, 940);

    // Top Header Badge
    ctx.fillStyle = "#964407";
    ctx.font = "bold 24px serif";
    ctx.textAlign = "center";
    ctx.fillText("TENOPILOT RESIDENT CARE DESK", 400, 100);

    // Property Title
    ctx.fillStyle = "#201a17";
    ctx.font = "bold 36px serif";
    ctx.fillText(propertyName, 400, 160);

    // Subtitle
    ctx.fillStyle = "#554339";
    ctx.font = "18px sans-serif";
    ctx.fillText("Scan to Report Maintenance Issues & Repairs 24/7", 400, 200);

    // White QR Container Card
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.08)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.fillRect(160, 240, 480, 480);
    ctx.shadowColor = "transparent";

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.strokeRect(160, 240, 480, 480);

    // Draw the QR Code image inside the card
    ctx.drawImage(canvas, 200, 280, 400, 400);

    // Instructions Box
    ctx.fillStyle = "#f8ede3";
    ctx.fillRect(100, 760, 600, 120);
    ctx.strokeStyle = "#d7c2b9";
    ctx.strokeRect(100, 760, 600, 120);

    ctx.fillStyle = "#201a17";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("1. Scan with Phone Camera  •  2. Enter Mobile  •  3. Submit Issue", 400, 810);

    ctx.fillStyle = "#964407";
    ctx.font = "bold 15px monospace";
    ctx.fillText(portalUrl, 400, 850);

    // Footer
    ctx.fillStyle = "#887569";
    ctx.font = "14px sans-serif";
    ctx.fillText("Instant Direct Dispatch to Property Caretaker & Management", 400, 930);

    // Trigger Download
    const dataUrl = exportCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${propertyId.replace(/[^a-zA-Z0-9_-]/g, "_")}_Complaints_QR_Poster.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <>
      {/* SCREEN MODAL VIEW */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-in fade-in"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center border border-gray-200 animate-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 text-left">
            <div>
              <h3 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#964407]" /> Maintenance Complaints QR
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Print or download for corridors, lift lobbies, and reception
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* QR Code Preview Frame */}
          <div className="p-6 bg-[#fff8f6] rounded-3xl border border-[#d7c2b9] flex flex-col items-center justify-center space-y-4 shadow-inner">
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#964407] bg-orange-100/80 px-3 py-1 rounded-full border border-orange-200">
                24/7 Resident Care Desk
              </span>
              <h4 className="font-serif font-bold text-base text-gray-900 mt-2">
                {propertyName}
              </h4>
            </div>

            <div
              ref={canvasRef}
              className="w-48 h-48 bg-white p-3.5 rounded-2xl shadow-md border border-gray-200 flex flex-col items-center justify-center relative"
            >
              <QRCodeCanvas
                id={`complaint-qr-${propertyId}`}
                value={portalUrl}
                size={160}
                fgColor="#201a17"
                bgColor="#ffffff"
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="text-center space-y-1">
              <span className="font-bold text-gray-900 block text-xs">
                Scan with Smartphone Camera
              </span>
              <span className="text-[10px] text-gray-500 font-mono break-all max-w-[280px] block mx-auto">
                {portalUrl}
              </span>
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div className="space-y-2.5">
            {/* Primary Download QR Image */}
            <button
              type="button"
              onClick={handleDownloadQr}
              className="w-full py-3.5 rounded-2xl bg-[#964407] hover:bg-[#c2652a] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Download High-Res QR Image (PNG)</span>
            </button>

            {/* Print Poster Button */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePrintPoster}
                className="py-2.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-300 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-gray-600" />
                <span>Print Poster</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-300 transition-all cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-600" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Open Portal Test Link */}
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Test Complaints Portal in New Tab</span>
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </a>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY CLEAN POSTER LAYOUT (Hidden on screen, active on Ctrl+P or Print Poster) */}
      <div className="hidden print:flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white text-[#201a17] font-sans">
        <div className="w-full max-w-xl border-4 border-[#964407] rounded-3xl p-10 space-y-6 shadow-none">
          <div className="space-y-1">
            <span className="text-xs font-bold tracking-widest uppercase text-[#964407] bg-orange-100 px-4 py-1.5 rounded-full">
              24/7 RESIDENT CARE DESK
            </span>
            <h1 className="font-serif text-3xl font-bold text-gray-900 pt-4">
              {propertyName}
            </h1>
            <p className="text-sm text-gray-600">
              Report Maintenance Issues, Plumbing, Electrical & Wi-Fi Repairs
            </p>
          </div>

          <div className="p-6 bg-gray-50 rounded-2xl border-2 border-gray-200 inline-block my-4">
            <QRCodeCanvas
              value={portalUrl}
              size={240}
              fgColor="#201a17"
              bgColor="#ffffff"
              level="H"
            />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="font-serif font-bold text-lg text-gray-900">
              3 Simple Steps to Report an Issue:
            </h2>
            <div className="text-xs text-gray-700 space-y-1 text-left bg-orange-50/60 p-4 rounded-xl border border-orange-200">
              <p><strong>1. Scan QR:</strong> Open camera or Google Lens on your smartphone.</p>
              <p><strong>2. Verify Mobile:</strong> Enter your 10-digit registered number.</p>
              <p><strong>3. Submit:</strong> Choose category, attach photo (optional), & submit.</p>
            </div>
            <p className="text-[11px] font-mono text-gray-500 pt-2">{portalUrl}</p>
          </div>

          <div className="border-t border-gray-200 pt-4 text-[10px] text-gray-400">
            Powered by TenoPilot.com • Precision Property Management OS
          </div>
        </div>
      </div>
    </>
  );
}
