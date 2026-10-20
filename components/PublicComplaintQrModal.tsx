"use client";

import React, { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Download,
  Printer,
  Check,
  ExternalLink,
  X,
  Clock,
  Camera,
  Smartphone,
  ClipboardCheck,
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
  const [portalUrl, setPortalUrl] = useState(`https://www.tenopilot.com/p/${propertyId}/public-complaint`);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [bgBase64, setBgBase64] = useState<string>("");

  const posterRef = useRef<HTMLDivElement>(null);
  const exportPosterRef = useRef<HTMLDivElement>(null);
  const printPosterRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState(() => propertySettingsStore.getSettings(propertyId));

  useEffect(() => {
    propertySettingsStore.initFirebaseListener(propertyId);
    setSettings(propertySettingsStore.getSettings(propertyId));
    return propertySettingsStore.subscribe(() => {
      setSettings(propertySettingsStore.getSettings(propertyId));
    });
  }, [propertyId]);

  // Preload background image as Base64 Data URL so html2canvas renders it with zero CORS / network taint issues
  useEffect(() => {
    if (typeof window !== "undefined") {
      fetch("/images/poster-background.jpg")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch image");
          return res.blob();
        })
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              setBgBase64(reader.result);
            }
          };
          reader.readAsDataURL(blob);
        })
        .catch((e) => {
          console.warn("Notice: background image fetch for base64 preload:", e);
        });
    }
  }, []);

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

  const cleanPgName = realPgName.replace(/[^a-zA-Z0-9_-]/g, "_");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const baseDomain = isLocal ? window.location.origin : "https://www.tenopilot.com";
      setPortalUrl(`${baseDomain}/p/${propertyId}/public-complaint`);
    }
  }, [propertyId]);

  if (!isOpen) return null;

  // Universal Cross-Platform Blob Downloader (works on Android Chrome, iOS Safari, PWA & Desktop)
  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", filename);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 2000);
  };

  // Capture helper targeting the pristine offscreen fixed-dimension A4 element
  const capturePosterCanvas = async () => {
    const el = exportPosterRef.current || posterRef.current;
    if (!el) throw new Error("Poster element not available");

    return await (html2canvas as any)(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#FAF7F2",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 850,
      windowHeight: 1200,
    });
  };

  // High-Resolution PNG Poster Download
  const handleDownloadPng = async () => {
    setIsGeneratingPng(true);
    try {
      const canvas = await capturePosterCanvas();
      
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          triggerBlobDownload(blob, `${cleanPgName}_Resident_Care_Poster.png`);
        } else {
          // Fallback to dataURL if toBlob returned null
          const dataUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = `${cleanPgName}_Resident_Care_Poster.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setIsGeneratingPng(false);
      }, "image/png");
    } catch (err: any) {
      console.error("Error generating poster PNG:", err);
      setIsGeneratingPng(false);
      alert("Notice: Could not download automatically. Please use 'Print Poster' to save as PDF directly.");
    }
  };

  // High-Resolution A4 PDF Poster Download
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const canvas = await capturePosterCanvas();
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Fit standard A4 dimensions: 210mm x 297mm
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);

      try {
        const pdfBlob = pdf.output("blob");
        triggerBlobDownload(pdfBlob, `${cleanPgName}_Resident_Care_Poster_A4.pdf`);
      } catch {
        pdf.save(`${cleanPgName}_Resident_Care_Poster_A4.pdf`);
      }
    } catch (err: any) {
      console.error("Error generating poster PDF:", err);
      alert("Notice: Could not generate PDF file. Please use 'Print Poster' to print or save as PDF.");
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
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:hidden animate-in fade-in overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-200 overflow-hidden my-auto flex flex-col md:flex-row max-h-[96vh] animate-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Column: Live A4 Poster Preview */}
          <div className="flex-1 bg-neutral-900/10 p-4 sm:p-6 overflow-y-auto flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
            {/* The Actual Scaled Poster Component with Photorealistic Interior Background */}
            <div
              ref={posterRef}
              className="w-full max-w-[400px] aspect-[1/1.414] rounded-2xl shadow-2xl border border-orange-200/60 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden text-center select-none bg-[#FAF7F2]"
            >
              {/* Background image layer */}
              {bgBase64 ? (
                <img
                  src={bgBase64}
                  alt="Poster Background"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <img
                  src="/images/poster-background.jpg"
                  alt="Poster Background"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  crossOrigin="anonymous"
                />
              )}

              {/* Subtle Ambient Radial Glow on Center to enhance text contrast */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 45%, rgba(255, 255, 255, 0.40) 0%, rgba(255, 255, 255, 0.05) 70%, transparent 100%)",
                }}
              />

              {/* Top Authority Header */}
              <div className="pt-1 space-y-0.5 relative z-10">
                <p className="text-[10px] sm:text-[11px] font-black tracking-[0.26em] uppercase text-[#3D302A]">
                  Resident Care Desk
                </p>
                <p className="text-[8.5px] font-bold text-[#6B5A51] tracking-wider">
                  Maintenance Issues & Repairs 24/7
                </p>
              </div>

              {/* Hero Hook Headline */}
              <div className="my-1 relative z-10">
                <h1 className="text-xl sm:text-2xl font-black text-[#1F1714] tracking-tight leading-none">
                  Facing a Problem?
                </h1>
                <h2 className="text-xl sm:text-2xl font-black text-[#C25E2E] tracking-tight leading-tight mt-0.5">
                  Scan to Report It.
                </h2>
              </div>

              {/* Highlighted PG Name Badge (Smooth Rounded Terracotta Pill) */}
              <div className="my-1 relative z-10 flex justify-center">
                <div className="bg-gradient-to-r from-[#BA5324] via-[#C25E2E] to-[#D36A38] text-white px-5 sm:px-6 py-1.5 sm:py-2 rounded-full shadow-lg border border-white/30 max-w-[85%]">
                  <span className="font-extrabold text-xs sm:text-sm tracking-wider uppercase truncate block">
                    {realPgName}
                  </span>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="relative z-10 my-1 flex items-center justify-center">
                <div className="bg-white p-3.5 sm:p-4 rounded-3xl shadow-xl border border-orange-100 flex flex-col items-center justify-center relative">
                  <QRCodeCanvas
                    id={`complaint-qr-${propertyId}`}
                    value={portalUrl}
                    size={140}
                    fgColor="#1F1714"
                    bgColor="#FFFFFF"
                    level="H"
                    includeMargin={false}
                  />
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
                    <span className="text-[8px] sm:text-[9px] font-bold text-[#1F1714] leading-tight">
                      Scan with Phone Camera
                    </span>
                  </div>

                  <span className="text-orange-500 font-black text-xs pb-3">›</span>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center flex-1 max-w-[80px]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-orange-200 shadow-xs flex items-center justify-center relative mb-1">
                      <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C25E2E]" />
                      <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#C25E2E] text-white text-[8px] font-black flex items-center justify-center">
                        2
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-bold text-[#1F1714] leading-tight">
                      Enter Mobile Number
                    </span>
                  </div>

                  <span className="text-orange-500 font-black text-xs pb-3">›</span>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center flex-1 max-w-[80px]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-orange-200 shadow-xs flex items-center justify-center relative mb-1">
                      <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C25E2E]" />
                      <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#C25E2E] text-white text-[8px] font-black flex items-center justify-center">
                        3
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-bold text-[#1F1714] leading-tight">
                      Submit Your Issue
                    </span>
                  </div>
                </div>
              </div>

              {/* SLA Service Commitment Box */}
              <div className="relative z-10 my-1 bg-white/95 border border-orange-200/80 p-2.5 rounded-xl text-left flex items-center gap-2.5 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
                  <Clock className="w-3.5 h-3.5 text-[#C25E2E]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] sm:text-[10px] font-extrabold text-[#1F1714]">
                    Fast • Simple • Available 24/7
                  </p>
                  <p className="text-[8px] text-[#6B5A51] leading-tight">
                    Your complaint goes directly to the property caretaker and management team.
                  </p>
                </div>
              </div>

              {/* Bottom Official TenoPilot Enterprise Branding */}
              <div className="relative z-10 pt-1 border-t border-orange-300/40 mt-1">
                <div className="flex items-center justify-center gap-2 text-[9px] font-extrabold tracking-[0.22em] text-[#59473F] uppercase font-sans">
                  <span>──</span>
                  <span className="text-[#3D302A]">POWERED BY TENOPILOT</span>
                  <span>──</span>
                </div>
                <p className="text-[7.5px] text-[#59473F] font-bold mt-0.5 tracking-tight">
                  tenopilot.com • Instant Direct Dispatch to Property Caretaker & Management
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Actions & Controls Panel */}
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
                  Active Property
                </span>
                <p className="font-extrabold text-sm text-gray-900">{realPgName}</p>
                <p className="text-[11px] text-gray-500 font-mono truncate">{portalUrl}</p>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Photorealistic boutique interior background</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>PG Name highlighted in rounded terracotta pill</span>
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

              {/* Print Poster Button (Full Width, Replaced Copy Link) */}
              <button
                type="button"
                onClick={handlePrintPoster}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs flex items-center justify-center gap-2 border border-gray-300 transition-all cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-gray-600" />
                <span>Print Poster</span>
              </button>

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

      {/* OFF-SCREEN HIGH-RES RENDER CONTAINER (Guarantees 100% crisp, unclipped exports on both mobile & desktop) */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0px",
          width: "794px",
          height: "1123px",
          zIndex: -1,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <div
          ref={exportPosterRef}
          style={{
            width: "794px",
            height: "1123px",
            backgroundColor: "#FAF7F2",
          }}
          className="p-12 flex flex-col justify-between text-center relative overflow-hidden select-none"
        >
          {/* Background image layer */}
          {bgBase64 ? (
            <img
              src={bgBase64}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <img
              src="/images/poster-background.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              crossOrigin="anonymous"
            />
          )}

          {/* Top Authority Header */}
          <div className="pt-2 space-y-1 relative z-10">
            <p className="text-sm font-black tracking-[0.28em] uppercase text-[#3D302A]">
              Resident Care Desk
            </p>
            <p className="text-xs font-bold text-[#6B5A51] tracking-wider">
              Maintenance Issues & Repairs 24/7
            </p>
          </div>

          {/* Hero Headline */}
          <div className="my-2 relative z-10">
            <h1 className="text-4xl font-black text-[#1F1714] tracking-tight leading-tight">
              Facing a Problem?
            </h1>
            <h2 className="text-4xl font-black text-[#C25E2E] tracking-tight leading-tight mt-1">
              Scan to Report It.
            </h2>
          </div>

          {/* Highlighted PG Name (Terracotta Pill) */}
          <div className="my-2 relative z-10 flex justify-center">
            <div className="bg-gradient-to-r from-[#BA5324] via-[#C25E2E] to-[#D36A38] text-white px-8 py-3 rounded-full shadow-lg border border-white/30 max-w-[85%]">
              <span className="font-extrabold text-xl tracking-wider uppercase truncate block">
                {realPgName}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="relative z-10 my-2 flex items-center justify-center">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-orange-100 flex flex-col items-center justify-center">
              <QRCodeCanvas
                id={`complaint-export-qr-${propertyId}`}
                value={portalUrl}
                size={220}
                fgColor="#1F1714"
                bgColor="#FFFFFF"
                level="H"
                includeMargin={false}
              />
            </div>
          </div>

          {/* 3 Steps */}
          <div className="relative z-10 my-2 px-6">
            <div className="flex items-center justify-center gap-6">
              {/* Step 1 */}
              <div className="flex flex-col items-center flex-1 max-w-[140px]">
                <div className="w-12 h-12 rounded-full bg-white border border-orange-200 shadow-sm flex items-center justify-center relative mb-2">
                  <Camera className="w-6 h-6 text-[#C25E2E]" />
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#C25E2E] text-white text-[11px] font-black flex items-center justify-center">
                    1
                  </span>
                </div>
                <span className="text-xs font-bold text-[#1F1714]">
                  Scan with Phone Camera
                </span>
              </div>

              <span className="text-orange-500 font-black text-xl pb-6">›</span>

              {/* Step 2 */}
              <div className="flex flex-col items-center flex-1 max-w-[140px]">
                <div className="w-12 h-12 rounded-full bg-white border border-orange-200 shadow-sm flex items-center justify-center relative mb-2">
                  <Smartphone className="w-6 h-6 text-[#C25E2E]" />
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#C25E2E] text-white text-[11px] font-black flex items-center justify-center">
                    2
                  </span>
                </div>
                <span className="text-xs font-bold text-[#1F1714]">
                  Enter Mobile Number
                </span>
              </div>

              <span className="text-orange-500 font-black text-xl pb-6">›</span>

              {/* Step 3 */}
              <div className="flex flex-col items-center flex-1 max-w-[140px]">
                <div className="w-12 h-12 rounded-full bg-white border border-orange-200 shadow-sm flex items-center justify-center relative mb-2">
                  <ClipboardCheck className="w-6 h-6 text-[#C25E2E]" />
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#C25E2E] text-white text-[11px] font-black flex items-center justify-center">
                    3
                  </span>
                </div>
                <span className="text-xs font-bold text-[#1F1714]">
                  Submit Your Issue
                </span>
              </div>
            </div>
          </div>

          {/* SLA Service Commitment Box */}
          <div className="relative z-10 my-2 bg-white/95 border border-orange-200/90 p-4 rounded-2xl flex items-center gap-4 max-w-lg mx-auto shadow-sm text-left">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
              <Clock className="w-5 h-5 text-[#C25E2E]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold text-[#1F1714]">
                Fast • Simple • Available 24/7
              </p>
              <p className="text-[11px] text-[#6B5A51] leading-tight">
                Your complaint goes directly to the property caretaker and management team.
              </p>
            </div>
          </div>

          {/* Bottom Official TenoPilot Enterprise Branding */}
          <div className="relative z-10 pt-3 border-t border-orange-300/40 mt-2">
            <div className="flex items-center justify-center gap-3 text-xs font-extrabold tracking-[0.25em] text-[#59473F] uppercase font-sans">
              <span>──</span>
              <span className="text-[#3D302A]">POWERED BY TENOPILOT</span>
              <span>──</span>
            </div>
            <p className="text-[10px] text-[#59473F] font-bold mt-1 tracking-tight">
              tenopilot.com • Instant Direct Dispatch to Property Caretaker & Management
            </p>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY CLEAN POSTER LAYOUT (Triggered on Print Poster or Ctrl+P) */}
      <div className="hidden print:flex flex-col items-center justify-center min-h-screen p-0 bg-white text-[#1F1714] font-sans">
        <div
          ref={printPosterRef}
          className="w-[210mm] h-[297mm] p-12 flex flex-col justify-between text-center relative overflow-hidden bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/poster-background.jpg')",
          }}
        >
          {/* Top Header */}
          <div className="pt-4 space-y-1 relative z-10">
            <p className="text-base font-black tracking-[0.28em] uppercase text-[#3D302A]">
              Resident Care Desk
            </p>
            <p className="text-xs font-bold text-[#6B5A51] tracking-wider">
              Maintenance Issues & Repairs 24/7
            </p>
          </div>

          {/* Hero Headline */}
          <div className="my-3 relative z-10">
            <h1 className="text-4xl font-black text-[#1F1714] tracking-tight">
              Facing a Problem?
            </h1>
            <h2 className="text-4xl font-black text-[#C25E2E] tracking-tight mt-1">
              Scan to Report It.
            </h2>
          </div>

          {/* Highlighted PG Name (Terracotta Pill) */}
          <div className="my-2 flex justify-center relative z-10">
            <div className="bg-gradient-to-r from-[#BA5324] via-[#C25E2E] to-[#D36A38] text-white px-10 py-3 rounded-full shadow-xl border border-white/40 inline-block">
              <span className="font-extrabold text-xl tracking-wider uppercase">
                {realPgName}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="my-4 flex items-center justify-center relative z-10">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-orange-100 flex flex-col items-center justify-center relative">
              <QRCodeCanvas
                value={portalUrl}
                size={260}
                fgColor="#1F1714"
                bgColor="#FFFFFF"
                level="H"
                includeMargin={false}
              />
            </div>
          </div>

          {/* 3 Steps */}
          <div className="my-3 px-8 relative z-10">
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-orange-300 flex items-center justify-center relative mb-2 shadow-sm">
                  <Camera className="w-6 h-6 text-[#C25E2E]" />
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#C25E2E] text-white text-xs font-black flex items-center justify-center">
                    1
                  </span>
                </div>
                <span className="text-xs font-bold text-[#1F1714]">Scan with Phone Camera</span>
              </div>

              <span className="text-orange-500 font-black text-xl pb-6">›</span>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-orange-300 flex items-center justify-center relative mb-2 shadow-sm">
                  <Smartphone className="w-6 h-6 text-[#C25E2E]" />
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#C25E2E] text-white text-xs font-black flex items-center justify-center">
                    2
                  </span>
                </div>
                <span className="text-xs font-bold text-[#1F1714]">Enter Mobile Number</span>
              </div>

              <span className="text-orange-500 font-black text-xl pb-6">›</span>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-orange-300 flex items-center justify-center relative mb-2 shadow-sm">
                  <ClipboardCheck className="w-6 h-6 text-[#C25E2E]" />
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#C25E2E] text-white text-xs font-black flex items-center justify-center">
                    3
                  </span>
                </div>
                <span className="text-xs font-bold text-[#1F1714]">Submit Your Issue</span>
              </div>
            </div>
          </div>

          {/* SLA Box */}
          <div className="my-2 bg-white border border-orange-200 p-4 rounded-2xl flex items-center justify-center gap-4 max-w-lg mx-auto shadow-sm relative z-10">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
              <Clock className="w-5 h-5 text-[#C25E2E]" />
            </div>
            <div className="text-left">
              <p className="text-xs font-extrabold text-[#1F1714]">Fast • Simple • Available 24/7</p>
              <p className="text-[11px] text-[#6B5A51]">
                Your complaint goes directly to the property caretaker and management team.
              </p>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="pt-4 border-t border-orange-300/50 mt-2 relative z-10">
            <div className="flex items-center justify-center gap-3 text-xs font-extrabold tracking-[0.25em] text-[#59473F] uppercase font-sans">
              <span>──</span>
              <span className="text-[#3D302A]">POWERED BY TENOPILOT</span>
              <span>──</span>
            </div>
            <p className="text-[10px] text-[#59473F] font-bold mt-1">
              tenopilot.com • Instant Direct Dispatch to Property Caretaker & Management
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
