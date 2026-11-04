"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Upload,
  ShieldCheck,
  AlertCircle,
  Phone,
  ArrowRight,
  Camera,
  X,
} from "lucide-react";
import { compressImageToDataUrl } from "@/utils/imageCompression";
import { doc, setDoc } from "firebase/firestore";
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

  // Proof Submission Form State
  const [tenantNote, setTenantNote] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedSizeKb, setCompressedSizeKb] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Quick PDF Download Redirections
  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "receipt" || rawToken === "receipt") {
      const q = new URLSearchParams(searchParams);
      q.set("download", "true");
      window.location.href = `/api/receipt/pdf?${q.toString()}`;
      return;
    }
    if (viewParam === "agreement" || rawToken === "agreement") {
      const q = new URLSearchParams(searchParams);
      q.set("download", "true");
      window.location.href = `/api/agreement/pdf?${q.toString()}`;
      return;
    }
  }, [searchParams, rawToken]);

  // Decode Token on Mount
  useEffect(() => {
    let resolved: DecodedPaymentDetails | null = null;

    if (rawToken) {
      try {
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
    }
    setLoading(false);
  }, [rawToken, searchParams]);

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

    if (!screenshotDataUrl) {
      setSubmitError("⚠️ Please attach your payment screenshot to submit proof.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const proofId = `proof_${Date.now()}`;
      const nowIso = new Date().toISOString();
      const effectiveAmount = details.amount;

      const proofDoc = {
        id: proofId,
        propertyId: details.propertyId,
        propertyName: details.propertyName,
        tenantId: details.tenantId,
        tenantName: details.tenantName,
        roomNumber: details.roomNumber,
        originalDueAmount: details.amount,
        reportedAmount: effectiveAmount,
        isPartial: false,
        remainingBalance: 0,
        utrNumber: "Screenshot Attached",
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
            amount: effectiveAmount,
            utrNumber: "Screenshot Attached",
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
          <p className="text-xs font-bold text-gray-600">Loading payment verification portal...</p>
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
            This payment link is either expired or missing rent details. Please check your latest WhatsApp rent reminder or contact your PG desk.
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
            <span>Direct Payment Verification</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4 pt-4">
        {/* 🏢 Accommodation & Bill Summary Card */}
        <div className="bg-white p-5 rounded-3xl border border-[#d7c2b9]/60 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#c2652a]">
                Payment Verification
              </span>
              <h1 className="font-serif font-bold text-base sm:text-lg text-gray-900 mt-0.5">
                {details.propertyName}
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {details.tenantName} • <span className="font-bold text-gray-700">{details.roomNumber}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-gray-400 block">Payable Rent</span>
              <div className="font-mono font-black text-xl text-gray-900 mt-0.5">
                ₹{details.amount.toLocaleString("en-IN")}
              </div>
              {details.dueDate && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block mt-1">
                  Due: {details.dueDate}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 📸 Hyper-Minimal, Laser-Focused Upload Form (Zero Fluff) */}
        {!isSubmitted ? (
          <form onSubmit={handleSubmitProof} className="bg-white p-5 sm:p-6 rounded-3xl border border-[#d7c2b9]/60 shadow-sm space-y-4">
            <div>
              <h2 className="font-serif font-bold text-sm sm:text-base text-gray-900">
                Upload Payment Screenshot
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Attach your payment confirmation to verify your rent payment and generate your digital receipt.
              </p>
            </div>

            {submitError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Screenshot Dropzone */}
            <div>
              <input
                type="file"
                accept="image/*"
                id="screenshot-input"
                className="hidden"
                onChange={handleScreenshotChange}
              />
              {screenshotDataUrl ? (
                <div className="relative rounded-2xl border border-emerald-300 bg-emerald-50/50 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-emerald-300 bg-gray-950 shrink-0 shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshotDataUrl}
                        alt="Uploaded proof"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-bold text-xs text-emerald-950 truncate block">
                          {screenshotFileName || "Screenshot Attached"}
                        </span>
                      </div>
                      {compressedSizeKb && (
                        <span className="text-[10px] text-emerald-700 font-mono block mt-0.5">
                          ✓ Optimized ({compressedSizeKb} KB)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <label
                      htmlFor="screenshot-input"
                      className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 cursor-pointer shadow-2xs"
                    >
                      Change
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotDataUrl(null);
                        setScreenshotFileName(null);
                        setCompressedSizeKb(null);
                      }}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                      title="Remove screenshot"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="screenshot-input"
                  className={`w-full py-8 px-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all ${
                    isCompressing
                      ? "border-[#c2652a] bg-orange-50/30"
                      : "border-gray-300 hover:border-[#c2652a] bg-gray-50/50 hover:bg-orange-50/20"
                  }`}
                >
                  {isCompressing ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                      <div className="w-4 h-4 border-2 border-[#c2652a] border-t-transparent rounded-full animate-spin" />
                      <span>Optimizing screenshot...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-orange-100/80 text-[#c2652a] flex items-center justify-center shadow-xs">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-bold text-gray-800 block">
                          Tap to select screenshot or take photo
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          Google Pay • PhonePe • Paytm • CRED • BHIM • Net Banking
                        </span>
                      </div>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* Optional Remark Input */}
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:ring-1 focus:ring-[#c2652a] bg-white"
              />
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isCompressing || !screenshotDataUrl}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#c2652a] hover:bg-[#964407] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Management...</span>
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
                Thank you, <strong>{details.tenantName}</strong>. Your payment screenshot for <strong>{details.propertyName}</strong> has been received by management.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Accommodation:</span>
                <span className="font-bold text-gray-800">{details.propertyName} ({details.roomNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-mono font-bold text-emerald-800">₹{details.amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verification Status:</span>
                <span className="font-bold text-amber-700">⏳ Awaiting Verification</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400">
              Your official verified receipt will be delivered directly to your WhatsApp once reviewed.
            </p>
          </div>
        )}

        {/* 📞 Universal Bottom Action Bar: Contact PG Reception */}
        {details.propertyPhone && (
          <div className="text-center pt-2">
            <a
              href={`tel:${details.propertyPhone}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#d7c2b9]/60 hover:border-[#c2652a] text-xs font-bold text-gray-700 hover:text-[#c2652a] shadow-2xs transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-[#c2652a]" />
              <span>Need help? Call PG Reception ({details.propertyPhone})</span>
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
