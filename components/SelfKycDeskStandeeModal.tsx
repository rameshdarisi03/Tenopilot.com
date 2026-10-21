"use client";

import { useState, useRef } from "react";
import {
  X,
  Printer,
  Download,
  ExternalLink,
  Sparkles,
  Check,
  ShieldCheck,
  QrCode,
  ScanFace,
  Home,
} from "lucide-react";
import { propertySettingsStore } from "@/constants/propertySettings";

interface SelfKycDeskStandeeModalProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SelfKycDeskStandeeModal({
  propertyId,
  isOpen,
  onClose,
}: SelfKycDeskStandeeModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const currentSettings = propertySettingsStore.getSettings(propertyId);
  const propertyName = currentSettings?.propertyName || "Ramesh Residencies";
  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${propertyId}/self-kyc-checkin`
      : `https://tenopilot.com/p/${propertyId}/self-kyc-checkin`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
    portalUrl
  )}&margin=10`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // 🎨 Generates true 4" × 6" high-resolution Standee Card PNG (1200 × 1800 px) matching preview
  const handleDownloadStandeePng = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1800;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Warm Scandinavian / Ambient Acrylic Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1800);
      bgGrad.addColorStop(0, "#fffbf7");
      bgGrad.addColorStop(0.5, "#ffffff");
      bgGrad.addColorStop(1, "#fcf7f2");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 1800);

      // Card Border & Drop Shadow accent
      ctx.strokeStyle = "#e8d8cc";
      ctx.lineWidth = 12;
      ctx.strokeRect(30, 30, 1140, 1740);

      // 2. Top Header Brand Pill
      const headGrad = ctx.createLinearGradient(70, 70, 1130, 270);
      headGrad.addColorStop(0, "#964407");
      headGrad.addColorStop(1, "#c2652a");
      ctx.fillStyle = headGrad;
      roundRect(ctx, 70, 70, 1060, 210, 36);
      ctx.fill();

      // Top Tagline
      ctx.fillStyle = "#fed7aa";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("DIGITAL SELF CHECK-IN", 600, 140);

      // Property Name
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 56px serif";
      ctx.fillText(propertyName.length > 25 ? propertyName.substring(0, 23) + "..." : propertyName, 600, 220);

      // 3. Central QR Code Frame
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#c2652a";
      ctx.lineWidth = 6;
      roundRect(ctx, 160, 330, 880, 880, 48);
      ctx.fill();
      ctx.stroke();

      // Load QR Image
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
        qrImg.src = qrImageUrl;
      });
      ctx.drawImage(qrImg, 220, 390, 760, 760);

      // 4. "SCAN WITH ANY CAMERA / GPAY" Pill
      ctx.fillStyle = "#fffbeb";
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 4;
      roundRect(ctx, 270, 1250, 660, 80, 40);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#964407";
      ctx.font = "bold 34px sans-serif";
      ctx.fillText("📷 SCAN WITH ANY CAMERA / GPAY", 600, 1303);

      // 5. 3-Step Instruction Box
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 4;
      roundRect(ctx, 100, 1370, 1000, 260, 32);
      ctx.fill();
      ctx.stroke();

      // Steps texts
      const steps = [
        "1.  Scan QR & select your preferred available bed",
        "2.  Upload live selfie photo & Aadhaar card",
        "3.  Instant front desk approval & keys handover",
      ];
      ctx.fillStyle = "#1e293b";
      ctx.font = "600 34px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(steps[0], 140, 1435);
      ctx.fillText(steps[1], 140, 1515);
      ctx.fillText(steps[2], 140, 1595);

      // 6. Footer Tag
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("ZERO APP DOWNLOAD REQUIRED", 100, 1700);
      ctx.textAlign = "right";
      ctx.fillText("POWERED BY TENOPILOT.COM", 1100, 1700);

      // Trigger download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${propertyId}-reception-desk-standee-4x6.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (e) {
      console.error("Standee PNG generation failed:", e);
      window.open(qrImageUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 via-amber-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c2652a] text-white flex items-center justify-center shadow-md">
              <ScanFace className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900">
                  Reception Desk Standee QR
                </h3>
                <span className="text-[10px] font-extrabold bg-[#c2652a] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                  4" × 6" Desk Size
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Compact desk-standee format (~25% A4 / Paytm acrylic stand size)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Preview Body (Fixed vertical alignment to ensure full card visibility without mobile cropping) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-stone-100 via-orange-50/20 to-stone-100 flex flex-col items-center justify-start sm:justify-center py-6">
          {/* Printable Acrylic Standee Canvas with Complementing Ambient Warm Wood & Acrylic Aesthetic */}
          <div
            ref={printRef}
            id="reception-standee-printable"
            className="w-[280px] sm:w-[320px] bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-2 border-[#c2652a]/20 p-5 flex flex-col items-center text-center relative overflow-hidden transition-all my-auto"
            style={{
              backgroundImage: "radial-gradient(#fed7aa 0.65px, transparent 0.65px), radial-gradient(#fed7aa 0.65px, #ffffff 0.65px)",
              backgroundSize: "26px 26px",
              backgroundPosition: "0 0, 13px 13px",
            }}
          >
            {/* Top Brand Banner */}
            <div className="w-full bg-gradient-to-br from-[#964407] to-[#c2652a] text-white p-3 rounded-2xl shadow-md mb-3">
              <span className="text-[9px] font-black uppercase tracking-widest block text-amber-200 opacity-90">
                DIGITAL SELF CHECK-IN
              </span>
              <h2 className="font-serif font-extrabold text-sm sm:text-base leading-tight mt-0.5 truncate">
                {propertyName}
              </h2>
            </div>

            {/* High-Contrast Central QR Code with acrylic bevel */}
            <div className="p-2.5 bg-white rounded-2xl border-2 border-dashed border-[#c2652a]/50 shadow-md my-1">
              <img
                src={qrImageUrl}
                alt="Reception Self-KYC QR"
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl"
              />
            </div>

            {/* Call to action badge */}
            <div className="mt-3 flex items-center justify-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-200 text-[#964407] text-[11px] font-black tracking-wide shadow-2xs">
              <QrCode className="w-3.5 h-3.5 text-[#c2652a]" />
              <span>SCAN WITH ANY CAMERA / GPAY</span>
            </div>

            {/* Simple 3-Step Instruction Box */}
            <div className="mt-3 w-full bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 text-left text-[10px] space-y-1 text-slate-700 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#c2652a] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="font-semibold truncate">Scan QR & pick available bed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#c2652a] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="font-semibold truncate">Upload selfie & Aadhaar photo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#c2652a] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="font-semibold truncate">Instant front desk confirmation</span>
              </div>
            </div>

            {/* Footer Tag */}
            <div className="mt-3 pt-2 border-t border-slate-100 w-full flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Zero App Download</span>
              <span>Powered by TenoPilot</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyLink}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ExternalLink className="w-3.5 h-3.5" />}
              <span>{copied ? "Link Copied!" : "Copy URL"}</span>
            </button>
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Test Walk-in Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            </a>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadStandeePng}
              disabled={downloading}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-[#c2652a]/40 bg-orange-50 text-[#c2652a] text-xs font-bold hover:bg-orange-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? "Generating..." : "Download Standee PNG"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print 4" × 6" Standee</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Print CSS targeting 4x6 / A6 standalone output */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #reception-standee-printable,
          #reception-standee-printable * {
            visibility: visible !important;
          }
          #reception-standee-printable {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) scale(1.15) !important;
            width: 105mm !important;
            max-width: 105mm !important;
            height: 148mm !important;
            box-shadow: none !important;
            border: 2px solid #c2652a !important;
            margin: 0 !important;
            padding: 10mm !important;
          }
        }
      `}</style>
    </div>
  );
}

// Helper to draw rounded rectangle on canvas
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
