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
  Clock,
  Camera,
  Smartphone,
  ClipboardCheck,
  Sparkles,
  FileText,
} from "lucide-react";
import { propertySettingsStore } from "@/constants/propertySettings";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const posterRef = useRef<HTMLDivElement>(null);
  const printPosterRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState(() => propertySettingsStore.getSettings(propertyId));

  useEffect(() => {
    propertySettingsStore.initFirebaseListener(propertyId);
    setSettings(propertySettingsStore.getSettings(propertyId));
    return propertySettingsStore.subscribe(() => {
      setSettings(propertySettingsStore.getSettings(propertyId));
    });
  }, [propertyId]);

  // Robust resolver: Never display raw building IDs (e.g., "Prop 1788438308277")
  const isRawBuildingId = (val?: string) => !val || val === "Your Property" || /^prop[-_\s]?\d+/i.test(val.trim());
  
  let realPgName = "";
  if (propertyName && !isRawBuildingId(propertyName)) {
    realPgName = propertyName;
  } else if (settings?.propertyName && !isRawBuildingId(settings.propertyName)) {
    realPgName = settings.propertyName;
  } else {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("tenopilot_saved_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.propertyName && !isRawBuildingId(parsed.propertyName)) {
            realPgName = parsed.propertyName;
          }
        }
      } catch {}
    }
  }

  if (!realPgName) {
    realPgName = settings?.propertyName || (propertyId === "sunshine-pg" ? "Sunshine Heights PG" : "Arihant Stays");
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const baseDomain = isLocal ? window.location.origin : "https://www.tenopilot.com";
      setPortalUrl(`${baseDomain}/p/${propertyId}/public-complaint`);
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

  // High-Resolution PNG Poster Download (300 DPI Canvas Capture)
  const handleDownloadPng = async () => {
    const el = posterRef.current;
    if (!el) return;
    setIsGeneratingPng(true);

    try {
      const canvas = await (html2canvas as any)(el, {
        scale: 3, // 300+ DPI equivalent sharpness
        useCORS: true,
        backgroundColor: "#FAF7F2",
        logging: false,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${realPgName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Resident_Care_Poster.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error generating poster PNG:", err);
    } finally {
      setIsGeneratingPng(false);
    }
  };

  // High-Resolution A4 PDF Poster Download
  const handleDownloadPdf = async () => {
    const el = posterRef.current;
    if (!el) return;
    setIsGeneratingPdf(true);

    try {
      const canvas = await (html2canvas as any)(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#FAF7F2",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      // Standard A4 dimensions in mm: 210 x 297
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      pdf.save(`${realPgName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Resident_Care_Poster_A4.pdf`);
    } catch (err) {
      console.error("Error generating poster PDF:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <>
      {/* SCREEN MODAL VIEW */}
      <div
        className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:hidden animate-in fade-in overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-200 overflow-hidden my-auto flex flex-col md:flex-row max-h-[95vh] animate-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Column: Live A4 Poster Preview */}
          <div className="flex-1 bg-neutral-100 p-4 sm:p-6 overflow-y-auto flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
            {/* The Actual Scaled Poster Component */}
            <div
              ref={posterRef}
              className="w-full max-w-[390px] aspect-[1/1.414] bg-[#FAF7F2] rounded-2xl shadow-xl border border-orange-100/80 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden text-center select-none"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 10% 15%, rgba(254, 215, 170, 0.28) 0%, transparent 45%),
                  radial-gradient(circle at 90% 85%, rgba(251, 146, 60, 0.15) 0%, transparent 45%)
                `,
              }}
            >
              {/* Decorative Subtle Wood Slat Accents (Left Edge) */}
              <div
                className="absolute top-0 bottom-0 left-0 w-8 opacity-25 pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, #b48c68 0px, #b48c68 4px, transparent 4px, transparent 10px)",
                }}
              />

              {/* Decorative Hanging Pendant Lamp (Top Left) */}
              <div className="absolute -top-1 left-9 pointer-events-none opacity-85">
                <svg width="34" height="68" viewBox="0 0 34 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Cord */}
                  <line x1="17" y1="0" x2="17" y2="34" stroke="#2B2625" strokeWidth="1.5" />
                  {/* Pendant Cone */}
                  <path d="M7 46C7 38 12 34 17 34C22 34 27 38 27 46H7Z" fill="#2B2625" />
                  {/* Warm Glow Bulb */}
                  <circle cx="17" cy="48" r="3" fill="#FBBF24" />
                  <ellipse cx="17" cy="52" rx="14" ry="7" fill="rgba(251, 191, 36, 0.22)" />
                </svg>
              </div>

              {/* Decorative Leaf Accent (Bottom Right) */}
              <div className="absolute -bottom-4 -right-4 pointer-events-none opacity-25">
                <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                  <path
                    d="M10 70C25 65 55 45 68 12C50 30 30 45 10 70Z"
                    fill="#15803d"
                  />
                  <path
                    d="M20 70C35 55 58 35 68 12C45 28 32 45 20 70Z"
                    fill="#16a34a"
                  />
                </svg>
              </div>

              {/* Top Authority Header */}
              <div className="pt-1.5 space-y-0.5 relative z-10">
                <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.28em] uppercase text-[#735E54]">
                  Resident Care Desk
                </p>
                <p className="text-[9px] font-semibold text-[#A89286] tracking-wider">
                  Maintenance Issues & Repairs 24/7
                </p>
              </div>

              {/* Hero Hook Headline */}
              <div className="my-1.5 relative z-10">
                <h1 className="text-xl sm:text-2xl font-black text-[#201A18] tracking-tight leading-none">
                  Facing a Problem?
                </h1>
                <h2 className="text-xl sm:text-2xl font-black text-[#C25E2E] tracking-tight leading-tight mt-0.5">
                  Scan to Report It.
                </h2>
              </div>

              {/* Option A Highlighted PG Name Badge (Smooth Rounded Pill, No House Symbol) */}
              <div className="my-1 relative z-10 flex justify-center">
                <div className="bg-gradient-to-r from-[#BA5324] via-[#C25E2E] to-[#D36A38] text-white px-5 sm:px-6 py-1.5 sm:py-2 rounded-full shadow-md shadow-orange-950/20 border border-orange-300/40 max-w-[85%]">
                  <span className="font-extrabold text-xs sm:text-sm tracking-wide uppercase truncate block">
                    {realPgName}
                  </span>
                </div>
              </div>

              {/* QR Code Container with "Your PG Our Care" Flourish */}
              <div className="relative z-10 my-1 flex items-center justify-center">
                <div className="bg-white p-3.5 sm:p-4 rounded-3xl shadow-xl border border-orange-100 flex flex-col items-center justify-center relative">
                  <QRCodeCanvas
                    id={`complaint-qr-${propertyId}`}
                    value={portalUrl}
                    size={140}
                    fgColor="#201A18"
                    bgColor="#FFFFFF"
                    level="H"
                    includeMargin={false}
                  />

                  {/* Whimsical Handwritten Tag Beside QR */}
                  <div className="absolute -right-16 sm:-right-20 top-3 text-left pointer-events-none select-none">
                    {/* Orange Sunbeam Accents */}
                    <div className="flex gap-1 ml-3 mb-0.5">
                      <span className="w-1.5 h-0.5 bg-[#C25E2E] rotate-[-35deg] inline-block rounded-full" />
                      <span className="w-2 h-0.5 bg-[#C25E2E] rotate-[-5deg] inline-block rounded-full" />
                      <span className="w-1.5 h-0.5 bg-[#C25E2E] rotate-[35deg] inline-block rounded-full" />
                    </div>
                    <div className="font-serif italic font-bold text-[11px] sm:text-xs text-[#201A18] leading-tight">
                      Your PG
                      <br />
                      <span className="text-[#C25E2E]">Our Care</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-Step Instruction Sequence */}
              <div className="relative z-10 my-1">
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  {/* Step 1 */}
                  <div className="flex flex-col items-center flex-1 max-w-[80px]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-orange-200 shadow-xs flex items-center justify-center relative mb-1">
                      <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C25E2E]" />
                      <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#C25E2E] text-white text-[8px] font-black flex items-center justify-center">
                        1
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-bold text-[#201A18] leading-tight">
                      Scan with Phone Camera
                    </span>
                  </div>

                  <span className="text-orange-400 font-black text-xs pb-3">›</span>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center flex-1 max-w-[80px]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-orange-200 shadow-xs flex items-center justify-center relative mb-1">
                      <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C25E2E]" />
                      <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#C25E2E] text-white text-[8px] font-black flex items-center justify-center">
                        2
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-bold text-[#201A18] leading-tight">
                      Enter Mobile Number
                    </span>
                  </div>

                  <span className="text-orange-400 font-black text-xs pb-3">›</span>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center flex-1 max-w-[80px]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-orange-200 shadow-xs flex items-center justify-center relative mb-1">
                      <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C25E2E]" />
                      <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#C25E2E] text-white text-[8px] font-black flex items-center justify-center">
                        3
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-bold text-[#201A18] leading-tight">
                      Submit Your Issue
                    </span>
                  </div>
                </div>
              </div>

              {/* SLA Service Commitment Box */}
              <div className="relative z-10 my-1 bg-[#FDF4EB] border border-[#F5DCB7] p-2.5 rounded-xl text-left flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
                  <Clock className="w-3.5 h-3.5 text-[#C25E2E]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] sm:text-[10px] font-extrabold text-[#201A18]">
                    Fast • Simple • Available 24/7
                  </p>
                  <p className="text-[8px] text-[#735E54] leading-tight">
                    Your complaint goes directly to the property caretaker and management team.
                  </p>
                </div>
              </div>

              {/* Bottom Official TenoPilot Enterprise Branding */}
              <div className="relative z-10 pt-1 border-t border-orange-200/60 mt-1">
                <div className="flex items-center justify-center gap-2 text-[9px] font-extrabold tracking-[0.22em] text-[#A89286] uppercase font-sans">
                  <span>──</span>
                  <span className="text-[#875F4B]">POWERED BY TENOPILOT</span>
                  <span>──</span>
                </div>
                <p className="text-[7.5px] text-[#A89286] font-medium mt-0.5 tracking-tight">
                  tenopilot.com • Instant Direct Dispatch to Property Caretaker & Management
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Actions & Configuration Panel */}
          <div className="w-full md:w-80 p-5 sm:p-6 flex flex-col justify-between space-y-6 bg-white">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Complaints QR Poster</h3>
                  <p className="text-xs text-gray-500">Premium printable resident care poster</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Active Property Info Badge */}
              <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-orange-800">
                  Selected Property
                </span>
                <p className="font-extrabold text-sm text-gray-900">{realPgName}</p>
                <p className="text-[11px] text-gray-500 font-mono truncate">{portalUrl}</p>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>PG Name highlighted in rounded terracotta badge</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>No app required for residents (browser-based)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Ready for A4 framing, acrylic desk stands & lobbies</span>
                </div>
              </div>
            </div>

            {/* Action Buttons Stack */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100">
              {/* Primary Download A4 PDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#BA5324] to-[#C25E2E] hover:from-[#a8471c] hover:to-[#b05226] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <FileText className="w-4 h-4" />
                <span>{isGeneratingPdf ? "Generating A4 PDF..." : "Download A4 Poster (PDF)"}</span>
              </button>

              {/* Secondary Download High-Res PNG */}
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isGeneratingPng}
                className="w-full py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#C25E2E] font-bold text-xs flex items-center justify-center gap-2 border border-orange-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingPng ? "Rendering PNG..." : "Download Image (PNG)"}</span>
              </button>

              {/* Print Poster Button */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePrintPoster}
                  className="py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-300 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-gray-600" />
                  <span>Print Poster</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-300 transition-all cursor-pointer"
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

              {/* Test in New Tab Link */}
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 rounded-xl text-center text-gray-500 hover:text-gray-800 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>Test Complaints Portal in New Tab</span>
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY CLEAN POSTER LAYOUT (Triggered on Print Poster or Ctrl+P) */}
      <div className="hidden print:flex flex-col items-center justify-center min-h-screen p-0 bg-white text-[#201A18] font-sans">
        <div
          ref={printPosterRef}
          className="w-[210mm] h-[297mm] p-12 bg-[#FAF7F2] flex flex-col justify-between text-center relative overflow-hidden"
          style={{
            backgroundImage: `
              radial-gradient(circle at 10% 15%, rgba(254, 215, 170, 0.35) 0%, transparent 45%),
              radial-gradient(circle at 90% 85%, rgba(251, 146, 60, 0.20) 0%, transparent 45%)
            `,
          }}
        >
          {/* Decorative Wood Slats */}
          <div
            className="absolute top-0 bottom-0 left-0 w-16 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #b48c68 0px, #b48c68 8px, transparent 8px, transparent 20px)",
            }}
          />

          {/* Top Header */}
          <div className="pt-4 space-y-1">
            <p className="text-base font-extrabold tracking-[0.3em] uppercase text-[#735E54]">
              Resident Care Desk
            </p>
            <p className="text-xs font-semibold text-[#A89286] tracking-wider">
              Maintenance Issues & Repairs 24/7
            </p>
          </div>

          {/* Hero Headline */}
          <div className="my-3">
            <h1 className="text-4xl font-black text-[#201A18] tracking-tight">
              Facing a Problem?
            </h1>
            <h2 className="text-4xl font-black text-[#C25E2E] tracking-tight mt-1">
              Scan to Report It.
            </h2>
          </div>

          {/* Option A Highlighted PG Name (Rounded Pill, No House Symbol) */}
          <div className="my-2 flex justify-center">
            <div className="bg-gradient-to-r from-[#BA5324] via-[#C25E2E] to-[#D36A38] text-white px-10 py-3 rounded-full shadow-lg border border-orange-200 inline-block">
              <span className="font-extrabold text-xl tracking-wider uppercase">
                {realPgName}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="my-4 flex items-center justify-center">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-orange-100 flex flex-col items-center justify-center relative">
              <QRCodeCanvas
                value={portalUrl}
                size={260}
                fgColor="#201A18"
                bgColor="#FFFFFF"
                level="H"
                includeMargin={false}
              />

              <div className="absolute -right-28 top-8 text-left">
                <div className="font-serif italic font-bold text-base text-[#201A18]">
                  Your PG
                  <br />
                  <span className="text-[#C25E2E]">Our Care</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Steps */}
          <div className="my-3 px-8">
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-orange-300 flex items-center justify-center relative mb-2 shadow-xs">
                  <Camera className="w-6 h-6 text-[#C25E2E]" />
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#C25E2E] text-white text-xs font-black flex items-center justify-center">
                    1
                  </span>
                </div>
                <span className="text-xs font-bold text-[#201A18]">Scan with Phone Camera</span>
              </div>

              <span className="text-orange-400 font-black text-xl pb-6">›</span>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-orange-300 flex items-center justify-center relative mb-2 shadow-xs">
                  <Smartphone className="w-6 h-6 text-[#C25E2E]" />
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#C25E2E] text-white text-xs font-black flex items-center justify-center">
                    2
                  </span>
                </div>
                <span className="text-xs font-bold text-[#201A18]">Enter Mobile Number</span>
              </div>

              <span className="text-orange-400 font-black text-xl pb-6">›</span>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-orange-300 flex items-center justify-center relative mb-2 shadow-xs">
                  <ClipboardCheck className="w-6 h-6 text-[#C25E2E]" />
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#C25E2E] text-white text-xs font-black flex items-center justify-center">
                    3
                  </span>
                </div>
                <span className="text-xs font-bold text-[#201A18]">Submit Your Issue</span>
              </div>
            </div>
          </div>

          {/* SLA Box */}
          <div className="my-2 bg-[#FDF4EB] border border-[#F5DCB7] p-4 rounded-2xl flex items-center justify-center gap-4 max-w-lg mx-auto">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
              <Clock className="w-5 h-5 text-[#C25E2E]" />
            </div>
            <div className="text-left">
              <p className="text-xs font-extrabold text-[#201A18]">Fast • Simple • Available 24/7</p>
              <p className="text-[11px] text-[#735E54]">
                Your complaint goes directly to the property caretaker and management team.
              </p>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="pt-4 border-t border-orange-200 mt-2">
            <div className="flex items-center justify-center gap-3 text-xs font-extrabold tracking-[0.25em] text-[#A89286] uppercase font-sans">
              <span>──</span>
              <span className="text-[#875F4B]">POWERED BY TENOPILOT</span>
              <span>──</span>
            </div>
            <p className="text-[10px] text-[#A89286] font-medium mt-1">
              tenopilot.com • Instant Direct Dispatch to Property Caretaker & Management
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
