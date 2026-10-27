"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  QrCode,
  Smartphone,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  Building2,
  Clock,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Phone,
  ArrowRight,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { compressImageToDataUrl } from "@/utils/imageCompression";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TenoPilotLogo } from "@/components/TenoPilotLogo";

interface DecodedPaymentDetails {
  propertyId: string;
  propertyName: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  amount: number;
  dueDate?: string;
  upiId: string;
  partnerId?: string;
  partnerName?: string;
  partnerPhone?: string;
  propertyPhone?: string;
}

export default function TenantPaymentBridgePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawToken = (params?.token as string) || "";

  const [details, setDetails] = useState<DecodedPaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Proof Submission Form State
  const [reportedAmount, setReportedAmount] = useState<number>(0);
  const [utrNumber, setUtrNumber] = useState("");
  const [tenantNote, setTenantNote] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedSizeKb, setCompressedSizeKb] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showQrExpanded, setShowQrExpanded] = useState(false);

  // Decode Token on Mount
  useEffect(() => {
    let resolved: DecodedPaymentDetails | null = null;

    if (rawToken) {
      try {
        // 1. Try decoding Base64 / Base64URL string
        const base64 = rawToken.replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const parsed = JSON.parse(jsonStr);
        if (parsed.p && parsed.a) {
          resolved = {
            propertyId: parsed.p,
            propertyName: parsed.pn || "PG Accommodation",
            tenantId: parsed.t || "tenant_direct",
            tenantName: parsed.n || "Resident",
            roomNumber: parsed.r || "Standard Room",
            amount: Number(parsed.a) || 0,
            dueDate: parsed.d || "Current Cycle",
            upiId: parsed.u || "rameshdarisi@okhdfcbank",
            partnerId: parsed.pid || "default_partner",
            partnerName: parsed.pname || parsed.pn || "Property Owner",
            partnerPhone: parsed.ph || "",
            propertyPhone: parsed.pph || parsed.ph || "",
          };
        }
      } catch (e) {
        console.warn("Base64 token decode notice:", e);
      }
    }

    // Fallback: Check Query Parameters
    if (!resolved) {
      const qProp = searchParams.get("p") || searchParams.get("propertyId") || "sunshine-pg";
      const qName = searchParams.get("n") || searchParams.get("tenantName") || "Resident";
      const qRoom = searchParams.get("r") || searchParams.get("room") || "Room Stay";
      const qAmt = Number(searchParams.get("a") || searchParams.get("amount") || 0);
      const qUpi = searchParams.get("u") || searchParams.get("upi") || "rameshdarisi@okhdfcbank";
      const qDue = searchParams.get("d") || searchParams.get("due") || "5th of this month";
      const qPartner = searchParams.get("pn") || searchParams.get("partner") || "PG Management";
      const qPhone = searchParams.get("ph") || searchParams.get("phone") || "";

      if (qAmt > 0) {
        resolved = {
          propertyId: qProp,
          propertyName: searchParams.get("propName") || "Sunshine PG & Living",
          tenantId: searchParams.get("t") || "tenant_01",
          tenantName: qName,
          roomNumber: qRoom,
          amount: qAmt,
          dueDate: qDue,
          upiId: qUpi,
          partnerName: qPartner,
          partnerPhone: qPhone,
        };
      }
    }

    if (resolved) {
      setDetails(resolved);
      setReportedAmount(resolved.amount);
    }
    setLoading(false);
  }, [rawToken, searchParams]);

  // Construct NPCI Standard UPI Intent String
  const upiIntentString = useMemo(() => {
    if (!details) return "";
    const cleanUpi = details.upiId.trim();
    const cleanAmt = details.amount;
    const cleanPayee = encodeURIComponent(details.partnerName || details.propertyName || "PG Management");
    const cleanNote = encodeURIComponent(`Rent ${details.roomNumber} - ${details.tenantName}`);
    return `upi://pay?pa=${cleanUpi}&pn=${cleanPayee}&am=${cleanAmt}&cu=INR&tn=${cleanNote}`;
  }, [details]);

  // Specific App Deep Link URLs
  const phonePeUrl = useMemo(() => {
    if (!upiIntentString) return "";
    return `phonepe://upi/pay?${upiIntentString.replace("upi://pay?", "")}`;
  }, [upiIntentString]);

  const gPayUrl = useMemo(() => {
    if (!upiIntentString) return "";
    return `tez://upi/pay?${upiIntentString.replace("upi://pay?", "")}`;
  }, [upiIntentString]);

  const paytmUrl = useMemo(() => {
    if (!upiIntentString) return "";
    return `paytmmp://upi/pay?${upiIntentString.replace("upi://pay?", "")}`;
  }, [upiIntentString]);

  const handleCopyUpi = () => {
    if (!details?.upiId) return;
    navigator.clipboard.writeText(details.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Handle Screenshot Upload with Automatic Client-Side Compression
  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScreenshotFileName(file.name);
    setIsCompressing(true);
    try {
      const result = await compressImageToDataUrl(file, 1200, 0.78);
      setScreenshotDataUrl(result.dataUrl);
      setCompressedSizeKb(result.compressedSizeKb);
    } catch (err) {
      console.warn("Image compression notice:", err);
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  // Handle Proof Submission
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details) return;

    if (!screenshotDataUrl && !utrNumber.trim()) {
      setSubmitError("⚠️ Please enter your 12-digit UPI UTR number or attach a payment screenshot.");
      return;
    }

    if (reportedAmount <= 0) {
      setSubmitError("⚠️ Please enter a valid amount paid.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const proofId = `proof_${Date.now()}`;
      const nowIso = new Date().toISOString();

      const proofDoc = {
        id: proofId,
        propertyId: details.propertyId,
        propertyName: details.propertyName,
        tenantId: details.tenantId,
        tenantName: details.tenantName,
        roomNumber: details.roomNumber,
        originalDueAmount: details.amount,
        reportedAmount: Number(reportedAmount),
        isPartial: Number(reportedAmount) < details.amount,
        remainingBalance: Math.max(0, details.amount - Number(reportedAmount)),
        utrNumber: utrNumber.trim(),
        screenshotUrl: screenshotDataUrl || null,
        tenantNote: tenantNote.trim() || null,
        partnerId: details.partnerId || "",
        partnerName: details.partnerName || "Partner",
        partnerPhone: details.partnerPhone || "",
        upiId: details.upiId,
        status: "PENDING_VERIFICATION",
        createdAt: nowIso,
        submittedAtFormatted: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      };

      // 1. Save in Cloud Firestore
      if (db) {
        await setDoc(doc(db, "properties", details.propertyId, "payment_proofs", proofId), proofDoc, { merge: true });
        // Also save indexed under tenant document
        await setDoc(
          doc(db, "properties", details.propertyId, "tenants", details.tenantId, "reported_proofs", proofId),
          proofDoc,
          { merge: true }
        );
      }

      // 2. Trigger targeted WhatsApp ping to the specific partner's phone
      const targetPhone = details.partnerPhone || details.propertyPhone;
      try {
        fetch("/api/payment-proof/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proofId,
            propertyId: details.propertyId,
            propertyName: details.propertyName,
            partnerPhone: targetPhone,
            partnerName: details.partnerName,
            tenantName: details.tenantName,
            roomNumber: details.roomNumber,
            amount: Number(reportedAmount),
            utrNumber: utrNumber.trim() || "Screenshot Attached",
            upiId: details.upiId,
          }),
        }).catch(() => {});
      } catch {}

      setIsSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to submit payment proof. Please try again or share directly on WhatsApp.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff8f6] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#c2652a] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-gray-600">Loading secure payment bridge...</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-[#fff8f6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-3xl border border-gray-200 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-bold text-lg text-gray-900">Payment Link Expired or Invalid</h2>
          <p className="text-xs text-gray-500">
            This payment token is either expired or missing rent details. Please check your latest WhatsApp rent reminder or contact your PG desk.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8f6] text-gray-900 pb-12 selection:bg-orange-100 selection:text-[#964407]">
      {/* 🛡️ Secure Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#d7c2b9]/40 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TenoPilotLogo size="sm" showWordmark={false} />
            <span className="font-serif font-black text-sm text-[#201a17]">TenoPilot Pay</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Direct Bank Transfer</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4 pt-4">
        {/* 🏢 Accommodation & Bill Summary Card */}
        <div className="bg-white p-5 rounded-3xl border border-[#d7c2b9]/60 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#c2652a]">
                Accommodation Rent Due
              </span>
              <h1 className="font-serif font-bold text-base text-gray-900 mt-0.5">{details.propertyName}</h1>
              <p className="text-xs text-gray-500 font-medium">
                {details.tenantName} • <span className="font-bold text-gray-700">{details.roomNumber}</span>
              </p>
            </div>
            {details.dueDate && (
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-gray-400 block">Due Date</span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block mt-0.5">
                  {details.dueDate}
                </span>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-orange-50/70 via-white to-amber-50/70 p-4 rounded-2xl border border-orange-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-500 block">Total Payable Amount</span>
              <div className="font-mono font-black text-2xl text-gray-900 mt-0.5">
                ₹{details.amount.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
                Zero Surcharge ₹0
              </span>
              <p className="text-[10px] text-gray-500 mt-1">Direct Bank Settlement</p>
            </div>
          </div>
        </div>

        {/* 🚀 1-Tap UPI Apps Launcher (Mobile First UX) */}
        {!isSubmitted && (
          <div className="bg-white p-5 rounded-3xl border border-[#d7c2b9]/60 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-100 text-[#c2652a]">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-sm text-gray-900">1-Tap Direct UPI Apps</h3>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">Pre-filled Amount</span>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              Tap any app below to open directly with <strong>₹{details.amount.toLocaleString("en-IN")}</strong> and owner UPI ID pre-filled:
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* PhonePe */}
              <a
                href={phonePeUrl}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-900 font-bold text-xs shadow-2xs active:scale-95 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  Pe
                </div>
                <div className="min-w-0">
                  <span className="block truncate">PhonePe</span>
                  <span className="text-[9px] text-purple-600 font-medium">1-Tap Pay</span>
                </div>
              </a>

              {/* Google Pay */}
              <a
                href={gPayUrl}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-900 font-bold text-xs shadow-2xs active:scale-95 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  G
                </div>
                <div className="min-w-0">
                  <span className="block truncate">Google Pay</span>
                  <span className="text-[9px] text-blue-600 font-medium">1-Tap Pay</span>
                </div>
              </a>

              {/* Paytm */}
              <a
                href={paytmUrl}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-sky-50 hover:bg-sky-100/80 border border-sky-200 text-sky-900 font-bold text-xs shadow-2xs active:scale-95 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-sky-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs shrink-0">
                  Pay
                </div>
                <div className="min-w-0">
                  <span className="block truncate">Paytm</span>
                  <span className="text-[9px] text-sky-600 font-medium">1-Tap Pay</span>
                </div>
              </a>

              {/* Any Other UPI App */}
              <a
                href={upiIntentString}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-orange-50 hover:bg-orange-100/80 border border-orange-200 text-orange-950 font-bold text-xs shadow-2xs active:scale-95 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-[#c2652a] text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  ⚡
                </div>
                <div className="min-w-0">
                  <span className="block truncate">Any UPI App</span>
                  <span className="text-[9px] text-[#c2652a] font-medium">BHIM / Cred</span>
                </div>
              </a>
            </div>

            {/* UPI ID Details + Copy Action */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-gray-400 block">Receiving UPI ID</span>
                <span className="font-mono font-bold text-gray-800 text-[11px] block truncate">{details.upiId}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUpi ? "Copied!" : "Copy UPI"}</span>
              </button>
            </div>

            {/* Expandable Desktop QR Code */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowQrExpanded(!showQrExpanded)}
                className="w-full text-center text-[11px] font-bold text-[#c2652a] hover:underline flex items-center justify-center gap-1 cursor-pointer py-1"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQrExpanded ? "Hide Dynamic QR Code" : "Show Dynamic QR Code (Scan to Pay)"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showQrExpanded ? "rotate-180" : ""}`} />
              </button>

              {showQrExpanded && (
                <div className="pt-3 pb-2 text-center space-y-2 animate-in fade-in zoom-in-95">
                  <div className="p-3 bg-white rounded-2xl border-2 border-gray-900 inline-block shadow-md">
                    <QRCodeCanvas value={upiIntentString} size={180} level="M" />
                  </div>
                  <p className="text-[10px] text-gray-500">Scan using any UPI app on your phone</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 📝 Self-Report Payment Proof Form */}
        {!isSubmitted ? (
          <form onSubmit={handleSubmitProof} className="bg-white p-5 rounded-3xl border border-[#d7c2b9]/60 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-sm text-gray-900">Payment Completed? Submit Proof</h3>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Enter your 12-digit UTR or attach your payment screenshot for immediate official PDF receipt generation.
              </p>
            </div>

            {submitError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Actual Amount Paid (Allows Partial Payment Reporting) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Amount Paid (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={reportedAmount || ""}
                  onChange={(e) => setReportedAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-sm text-gray-900 focus:ring-1 focus:ring-[#c2652a] bg-white"
                  placeholder="e.g. 12500"
                />
                {reportedAmount > 0 && reportedAmount < details.amount && (
                  <p className="text-[10px] text-amber-700 font-bold mt-1">
                    🟡 Partial Payment: ₹{(details.amount - reportedAmount).toLocaleString("en-IN")} will remain as pending balance.
                  </p>
                )}
              </div>

              {/* 12-Digit UPI Transaction / UTR Number */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  12-Digit UPI Reference / UTR Number
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                  placeholder="e.g. 412894102931"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a] bg-white tracking-wider"
                />
                <p className="text-[10px] text-gray-400 mt-1">Found in your GPay / PhonePe payment success details</p>
              </div>

              {/* Screenshot Uploader */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Payment Screenshot (Optional if UTR provided)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    id="screenshot-input"
                    className="hidden"
                    onChange={handleScreenshotChange}
                  />
                  <label
                    htmlFor="screenshot-input"
                    className={`w-full p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      screenshotDataUrl
                        ? "border-emerald-400 bg-emerald-50/50"
                        : "border-gray-300 hover:border-[#c2652a] bg-gray-50/50"
                    }`}
                  >
                    {isCompressing ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                        <div className="w-4 h-4 border-2 border-[#c2652a] border-t-transparent rounded-full animate-spin" />
                        <span>Compressing image...</span>
                      </div>
                    ) : screenshotDataUrl ? (
                      <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="truncate max-w-[200px]">{screenshotFileName || "Screenshot Attached"}</span>
                        <span className="text-[10px] text-emerald-600 font-mono">({compressedSizeKb} KB)</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-xs font-bold text-gray-700">Tap to upload GPay / PhonePe screenshot</span>
                        <span className="text-[10px] text-gray-400">JPG, PNG, WebP automatically optimized</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Optional Note */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Remark / Note (Optional)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={tenantNote}
                  onChange={(e) => setTenantNote(e.target.value)}
                  placeholder="e.g. Paid from brother's account Rahul"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a] bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#c2652a] to-amber-600 hover:from-[#964407] hover:to-amber-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Notifying Management...</span>
                </>
              ) : (
                <>
                  <span>Submit Payment Proof</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* ✅ Submission Success Confirmation View */
          <div className="bg-white p-6 rounded-3xl border border-emerald-300 shadow-md text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                Proof Acknowledged
              </span>
              <h2 className="font-serif font-bold text-lg text-gray-900 mt-0.5">Payment Proof Submitted!</h2>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Thank you, <strong>{details.tenantName}</strong>. Your payment of <strong>₹{reportedAmount.toLocaleString("en-IN")}</strong> has been submitted to management for instant verification.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Accommodation:</span>
                <span className="font-bold text-gray-800">{details.propertyName} ({details.roomNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Reported:</span>
                <span className="font-mono font-bold text-emerald-800">₹{reportedAmount.toLocaleString("en-IN")}</span>
              </div>
              {utrNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Reference / UTR:</span>
                  <span className="font-mono font-bold text-gray-800">{utrNumber}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-400">
              Your official PDF rent receipt will be automatically delivered to your WhatsApp once verified by the PG management.
            </p>
          </div>
        )}

        {/* 📞 Contact PG Reception Call Button */}
        {details.propertyPhone && (
          <div className="text-center pt-2">
            <a
              href={`tel:${details.propertyPhone}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c2652a] hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Need help? Call PG Reception ({details.propertyPhone})</span>
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
