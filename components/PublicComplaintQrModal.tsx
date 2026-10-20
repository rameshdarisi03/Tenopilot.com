"use client";

import React, { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Download,
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
import { toPng, toBlob } from "html-to-image";
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

  // 1-Click High-Resolution A4 PDF Poster Download (Direct 1:1 replica of the live preview)
  const handleDownloadPdf = async () => {
    const el = posterRef.current;
    if (!el) return;
    setIsGeneratingPdf(true);

    try {
      // Capture the exact preview element at 300+ DPI sharpness
      const dataUrl = await toPng(el, {
        pixelRatio: 3,
        cacheBust: true,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Fit standard A4 dimensions (210mm x 297mm)
      pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297, undefined, "FAST");
      
      const pdfBlob = pdf.output("blob");
      triggerBlobDownload(pdfBlob, `${cleanPgName}_Resident_Care_Poster_A4.pdf`);
    } catch (err: any) {
      console.error("Error generating poster PDF:", err);
      try {
        const dataUrl = await toPng(el, { pixelRatio: 2 });
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297);
        pdf.save(`${cleanPgName}_Resident_Care_Poster_A4.pdf`);
      } catch (fallbackErr) {
        alert("Notice: Could not generate PDF. Please try downloading as PNG.");
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 1-Click High-Resolution PNG Poster Download (Direct 1:1 replica of the live preview)
  const handleDownloadPng = async () => {
    const el = posterRef.current;
    if (!el) return;
    setIsGeneratingPng(true);

    try {
      const blob = await toBlob(el, {
        pixelRatio: 3,
        cacheBust: true,
      });

      if (blob) {
        triggerBlobDownload(blob, `${cleanPgName}_Resident_Care_Poster.png`);
      } else {
        const dataUrl = await toPng(el, { pixelRatio: 3 });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${cleanPgName}_Resident_Care_Poster.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      console.error("Error generating poster PNG:", err);
      try {
        const dataUrl = await toPng(el, { pixelRatio: 2 });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${cleanPgName}_Resident_Care_Poster.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackErr) {
        alert("Notice: Could not generate image. Please take a screenshot of the preview.");
      }
    } finally {
      setIsGeneratingPng(false);
    }
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
              className="w-full max-w-[390px] aspect-[1/1.414] rounded-none shadow-2xl border-0 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden text-center select-none bg-[#FAF7F2]"
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
              <div className="pt-0.5 space-y-0.5 relative z-10 shrink-0">
                <p className="text-[10px] sm:text-[11px] font-black tracking-[0.24em] uppercase text-[#3D302A]">
                  Resident Care Desk
                </p>
                <p className="text-[8px] sm:text-[8.5px] font-bold text-[#6B5A51] tracking-wider">
                  Maintenance & Resident Support
                </p>
              </div>

              {/* Hero Hook Headline */}
              <div className="my-0.5 relative z-10 shrink-0">
                <h1 className="text-xl sm:text-2xl font-black text-[#1F1714] tracking-tight leading-none">
                  Facing a Problem?
                </h1>
                <h2 className="text-xl sm:text-2xl font-black text-[#C25E2E] tracking-tight leading-tight mt-0.5">
                  Scan to Report It.
                </h2>
              </div>

              {/* Highlighted PG Name Badge (Smooth Rounded Terracotta Pill) */}
              <div className="my-0.5 relative z-10 flex justify-center shrink-0">
                <div className="bg-gradient-to-r from-[#BA5324] via-[#C25E2E] to-[#D36A38] text-white px-5 sm:px-6 py-1.5 rounded-full shadow-md border border-white/30 max-w-[85%]">
                  <span className="font-extrabold text-xs sm:text-sm tracking-wider uppercase truncate block">
                    {realPgName}
                  </span>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="relative z-10 my-0.5 flex items-center justify-center shrink-0">
                <div className="bg-white p-2.5 sm:p-3 rounded-2xl shadow-lg border border-orange-100 flex flex-col items-center justify-center relative">
                  <QRCodeCanvas
                    id={`complaint-qr-${propertyId}`}
                    value={portalUrl}
                    size={120}
                    fgColor="#1F1714"
                    bgColor="#FFFFFF"
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* 3-Step Instruction Sequence */}
              <div className="relative z-10 my-0.5 shrink-0">
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  {/* Step 1 */}
                  <div className="flex flex-col items-center flex-1 max-w-[80px]">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border border-orange-200 shadow-xs flex items-center justify-center relative mb-0.5">
                      <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C25E2E]" />
                      <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#C25E2E] text-white text-[7.5px] font-black flex items-center justify-center">
                        1
                      </span>
                    </div>
                    <span className="text-[7.5px] sm:text-[8px] font-bold text-[#1F1714] leading-tight">
                      Scan with Phone Camera
                    </span>
                  </div>

                  <span className="text-orange-500 font-black text-xs pb-2">›</span>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center flex-1 max-w-[80px]">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border border-orange-200 shadow-xs flex items-center justify-center relative mb-0.5">
                      <Smartphone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C25E2E]" />
                      <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#C25E2E] text-white text-[7.5px] font-black flex items-center justify-center">
                        2
                      </span>
                    </div>
                    <span className="text-[7.5px] sm:text-[8px] font-bold text-[#1F1714] leading-tight">
                      Enter Mobile Number
                    </span>
                  </div>

                  <span className="text-orange-500 font-black text-xs pb-2">›</span>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center flex-1 max-w-[80px]">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border border-orange-200 shadow-xs flex items-center justify-center relative mb-0.5">
                      <ClipboardCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C25E2E]" />
                      <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#C25E2E] text-white text-[7.5px] font-black flex items-center justify-center">
                        3
                      </span>
                    </div>
                    <span className="text-[7.5px] sm:text-[8px] font-bold text-[#1F1714] leading-tight">
                      Submit Your Issue
                    </span>
                  </div>
                </div>
              </div>

              {/* SLA Service Commitment Box */}
              <div className="relative z-10 my-0.5 bg-white/95 border border-orange-200/80 p-2 rounded-xl text-left flex items-center gap-2 shadow-xs shrink-0">
                <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
                  <Clock className="w-3 h-3 text-[#C25E2E]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8.5px] sm:text-[9px] font-extrabold text-[#1F1714]">
                    Fast • Simple • Direct Resolution
                  </p>
                  <p className="text-[7px] sm:text-[7.5px] text-[#6B5A51] leading-tight">
                    Your complaint goes directly to the property caretaker and management team.
                  </p>
                </div>
              </div>

              {/* Bottom Clean Branding */}
              <div className="relative z-10 pt-1.5 pb-1 shrink-0 text-center">
                <p className="text-[9px] sm:text-[10px] font-extrabold tracking-[0.16em] uppercase text-[#4A3B33] font-sans">
                  Powered by Tenopilot.com
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
              {/* Primary Download A4 PDF (Server-Rendered SSOT) */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#BA5324] to-[#C25E2E] hover:from-[#a8471c] hover:to-[#b05226] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <FileText className="w-4 h-4" />
                <span>{isGeneratingPdf ? "Downloading A4 PDF..." : "Download A4 Poster (PDF)"}</span>
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
    </>
  );
}
