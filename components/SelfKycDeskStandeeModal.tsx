"use client";

import React, { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  X,
  Camera,
  IdCard,
  ShieldCheck,
  Zap,
  Download,
  FileText,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { propertySettingsStore } from "@/constants/propertySettings";
import { toPng, toBlob } from "html-to-image";
import { jsPDF } from "jspdf";

interface SelfKycDeskStandeeModalProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
  propertyName?: string;
}

export function SelfKycDeskStandeeModal({
  propertyId,
  isOpen,
  onClose,
  propertyName = "Your Property",
}: SelfKycDeskStandeeModalProps) {
  const [portalUrl, setPortalUrl] = useState(`https://www.tenopilot.com/p/${propertyId}/self-kyc-checkin`);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
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

  // Preload background image as Base64 Data URL so html-to-image renders with zero CORS/cross-origin taint issues
  useEffect(() => {
    if (typeof window !== "undefined") {
      fetch("/images/self-kyc-poster-background.jpg")
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
    realPgName = settings?.propertyName || (propertyId === "sunshine-pg" ? "Sunshine Heights PG" : "Ramesh Residencies");
  }

  const cleanPgName = realPgName.replace(/[^a-zA-Z0-9_-]/g, "_");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const baseDomain = isLocal ? window.location.origin : "https://www.tenopilot.com";
      setPortalUrl(`${baseDomain}/p/${propertyId}/self-kyc-checkin`);
    }
  }, [propertyId]);

  if (!isOpen) return null;

  // Universal Cross-Platform Blob Downloader
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

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
      triggerBlobDownload(pdfBlob, `${cleanPgName}_Self_KYC_Standee_A4.pdf`);
    } catch (err: any) {
      console.error("Error generating standee PDF:", err);
      try {
        const dataUrl = await toPng(el, { pixelRatio: 2 });
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297);
        pdf.save(`${cleanPgName}_Self_KYC_Standee_A4.pdf`);
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
        triggerBlobDownload(blob, `${cleanPgName}_Self_KYC_Standee.png`);
      } else {
        const dataUrl = await toPng(el, { pixelRatio: 3 });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${cleanPgName}_Self_KYC_Standee.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      console.error("Error generating standee PNG:", err);
      try {
        const dataUrl = await toPng(el, { pixelRatio: 2 });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${cleanPgName}_Self_KYC_Standee.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackErr) {
        alert("Notice: Could not generate image. Please try downloading PDF instead.");
      }
    } finally {
      setIsGeneratingPng(false);
    }
  };

  return (
    <>
      {/* SCREEN MODAL VIEW */}
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:hidden animate-in fade-in overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-200 overflow-hidden my-auto flex flex-col md:flex-row max-h-[96vh] animate-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Column: Live A4 Poster Preview */}
          <div className="flex-1 bg-neutral-900/10 p-3 sm:p-6 overflow-y-auto flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
            {/* The Actual Scaled Poster Component with Photorealistic Scandinavian Interior Background */}
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
                  src="/images/self-kyc-poster-background.jpg"
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

              {/* 1. Top Authority Header: TenoPilot Brand & Roof Emblem */}
              <div className="pt-0.5 relative z-10 flex flex-col items-center justify-center shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="text-[#C25E2E] flex items-center justify-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 9.5V11H4V20H9V14H15V20H20V11H22V9.5L12 2Z" />
                    </svg>
                  </div>
                  <span className="font-black text-xs sm:text-sm tracking-[0.18em] uppercase text-[#1F1714]">
                    TenoPilot
                  </span>
                </div>
                <p className="text-[7px] sm:text-[8px] font-black tracking-[0.24em] uppercase text-[#6B5A51] mt-0.5">
                  Resident Experience
                </p>
              </div>

              {/* 2. Hero Headline */}
              <div className="my-0.5 relative z-10 shrink-0">
                <h1 className="text-2xl sm:text-[28px] font-black text-[#1F1714] tracking-tight leading-none">
                  Digital
                </h1>
                <h2 className="text-2xl sm:text-[28px] font-black text-[#C25E2E] tracking-tight leading-tight mt-0.5">
                  Self Check-In
                </h2>
              </div>

              {/* 3. Highlighted PG Name Badge (Cream Translucent Pill) */}
              <div className="my-0.5 relative z-10 flex flex-col items-center justify-center shrink-0">
                <div className="bg-[#FAF3EB]/90 backdrop-blur-sm px-4 sm:px-5 py-1 sm:py-1.5 rounded-full shadow-xs border border-[#E8DACB] max-w-[90%] flex items-center justify-center gap-1.5">
                  <span className="text-sm sm:text-base leading-none">🏨</span>
                  <span className="font-serif font-bold text-xs sm:text-sm text-[#241A15] tracking-wide truncate">
                    {realPgName}
                  </span>
                </div>
                <p className="text-[7.5px] sm:text-[8px] font-semibold text-[#786457] mt-0.5 tracking-wider">
                  Quick. Secure. Hassle-Free.
                </p>
              </div>

              {/* 4. Central QR Code Card with Corner Brackets & Terracotta Button */}
              <div className="relative z-10 my-0.5 flex flex-col items-center justify-center shrink-0">
                <div className="bg-white p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl shadow-xl border border-[#EADBCC] flex flex-col items-center justify-center relative">
                  {/* Subtle Terracotta Corner Accents */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#C25E2E] rounded-tl pointer-events-none" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#C25E2E] rounded-tr pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#C25E2E] rounded-bl pointer-events-none" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#C25E2E] rounded-br pointer-events-none" />

                  <QRCodeCanvas
                    id={`self-kyc-qr-${propertyId}`}
                    value={portalUrl}
                    size={130}
                    fgColor="#1F1714"
                    bgColor="#FFFFFF"
                    level="H"
                    includeMargin={false}
                  />

                  {/* "Scan to Start" Terracotta Action Pill */}
                  <div className="mt-2.5 bg-gradient-to-r from-[#B84E1F] via-[#C25E2E] to-[#CD6734] text-white px-4 sm:px-5 py-1 sm:py-1.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 border border-white/20">
                    <Camera className="w-3.5 h-3.5 text-white" />
                    <span className="text-[8.5px] sm:text-[9.5px] font-black tracking-widest uppercase text-white">
                      Scan to Start
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. 3-Feature Glassmorphic Pill Cards */}
              <div className="relative z-10 my-0.5 shrink-0 flex justify-center w-full px-1">
                <div className="bg-white/80 backdrop-blur-md border border-white/60 shadow-xs px-2.5 py-2 sm:py-2.5 rounded-2xl w-full max-w-[325px] flex items-center justify-around divide-x divide-[#E5D7CA]">
                  {/* Feature 1 */}
                  <div className="flex flex-col items-center flex-1 px-1">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FAECE1] border border-[#F2D7C3] flex items-center justify-center mb-1 text-[#C25E2E]">
                      <IdCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C25E2E]" />
                    </div>
                    <span className="text-[7.5px] sm:text-[8px] font-extrabold text-[#1F1714] leading-tight text-center">
                      Verify Your Identity
                    </span>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex flex-col items-center flex-1 px-1">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FAECE1] border border-[#F2D7C3] flex items-center justify-center mb-1 text-[#C25E2E]">
                      <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C25E2E]" />
                    </div>
                    <span className="text-[7.5px] sm:text-[8px] font-extrabold text-[#1F1714] leading-tight text-center">
                      Secure & Private
                    </span>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex flex-col items-center flex-1 px-1">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FAECE1] border border-[#F2D7C3] flex items-center justify-center mb-1 text-[#C25E2E]">
                      <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C25E2E]" />
                    </div>
                    <span className="text-[7.5px] sm:text-[8px] font-extrabold text-[#1F1714] leading-tight text-center">
                      Get Instant Approval
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. Bottom Clean Authority Footer */}
              <div className="relative z-10 pt-1 pb-0.5 shrink-0 text-center">
                <p className="text-[7.5px] sm:text-[8px] font-extrabold tracking-[0.16em] uppercase text-[#54443B] font-sans flex items-center justify-center gap-1.5">
                  <span>Zero App Download Required</span>
                  <span className="text-[#C25E2E]">•</span>
                  <span>Powered by TenoPilot.com</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Actions & Controls Panel */}
          <div className="w-full md:w-80 p-5 sm:p-6 flex flex-col justify-between space-y-6 bg-white">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Self-KYC Desk Standee</h3>
                  <p className="text-xs text-gray-500">Premium printable check-in QR poster</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Active Property Info Badge */}
              <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200/80 space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-orange-800">
                  Active Property Desk
                </span>
                <p className="font-extrabold text-sm text-gray-900">{realPgName}</p>
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={portalUrl}
                    className="w-full text-[11px] font-mono bg-white px-2 py-1 rounded border border-orange-200 text-gray-600 truncate select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="shrink-0 p-1 rounded bg-orange-100 hover:bg-orange-200 text-[#C25E2E] transition-colors"
                    title="Copy Link"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Warm Scandinavian boutique interior design</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dynamic property pill with elegant serif font</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>100% 1:1 match between Preview, PNG and PDF</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Ready for 4&quot; × 6&quot; acrylic desk stand or A4 framing</span>
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
                <span>{isGeneratingPdf ? "Downloading A4 PDF..." : "Download Standee (PDF)"}</span>
              </button>

              {/* Secondary Download High-Res PNG */}
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isGeneratingPng}
                className="w-full py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#C25E2E] font-bold text-xs flex items-center justify-center gap-2 border border-orange-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingPng ? "Rendering PNG..." : "Download Standee (PNG)"}</span>
              </button>

              {/* Test in New Tab Link */}
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 rounded-xl text-center text-gray-500 hover:text-gray-800 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>Open Registration Form in New Tab</span>
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
