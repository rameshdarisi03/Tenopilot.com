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
  Download,
  FileText,
  Sparkles,
  Clock,
  ZoomIn,
} from "lucide-react";
import { compressImageToDataUrl } from "@/utils/imageCompression";
import { doc, setDoc, onSnapshot, collection } from "firebase/firestore";
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

  // Real-time Submitted Proof & Recent Payments State
  const [existingProof, setExistingProof] = useState<{
    id: string;
    screenshotUrl?: string | null;
    tenantNote?: string | null;
    createdAt?: string;
    status: "PENDING_VERIFICATION" | "APPROVED" | "REJECTED";
  } | null>(null);
  const [recentPayments, setRecentPayments] = useState<
    { id: string; amount: number; date: string; mode?: string; month?: string }[]
  >([]);
  const [allowReupload, setAllowReupload] = useState(false);
  const [zoomedScreenshot, setZoomedScreenshot] = useState<string | null>(null);

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

  // Real-time Firestore sync for last 2 payments and active pending proof
  useEffect(() => {
    if (!details || !db || !details.propertyId || !details.tenantId) return;

    // 1. Listen for occupant document to display last 2 non-voided payments (never locks upload)
    const unsubOccupant = onSnapshot(
      doc(db, "properties", details.propertyId, "occupants", details.tenantId),
      (docSnap) => {
        if (docSnap.exists()) {
          const occData = docSnap.data();
          const history = occData.paymentHistory;
          if (Array.isArray(history) && history.length > 0) {
            const lastTwo = history
              .filter((h: any) => h && h.status !== "VOIDED" && Number(h.amount || 0) > 0)
              .slice(0, 2)
              .map((h: any, idx: number) => ({
                id: h.id || `pay_${idx}`,
                amount: Number(h.amount || 0),
                date: h.date || "Recorded",
                mode: h.mode || "UPI / Digital",
                month: h.month || "",
              }));
            setRecentPayments(lastTwo);
          } else {
            setRecentPayments([]);
          }
        }
      },
      (err) => console.warn("Notice checking occupant payment history:", err)
    );

    // 2. Listen for tenant's reported proofs subcollection (show pending proof until approved/rejected)
    const unsubProofs = onSnapshot(
      collection(db, "properties", details.propertyId, "tenants", details.tenantId, "reported_proofs"),
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          docs.sort((a: any, b: any) => ((b.createdAt as string) || "").localeCompare((a.createdAt as string) || ""));
          const latestProof: any = docs[0];

          if (latestProof && latestProof.status === "PENDING_VERIFICATION") {
            setExistingProof({
              id: latestProof.id,
              screenshotUrl: latestProof.screenshotUrl,
              tenantNote: latestProof.tenantNote,
              createdAt: latestProof.createdAt,
              status: latestProof.status,
            });
          } else {
            // Once approved or rejected, clear pending state so tenant can upload next installment anytime
            setExistingProof(null);
            setIsSubmitted(false);
          }
        } else {
          setExistingProof(null);
        }
      },
      (err) => console.warn("Notice checking tenant proofs:", err)
    );

    return () => {
      unsubOccupant();
      unsubProofs();
    };
  }, [details]);

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

      setExistingProof({
        id: proofId,
        screenshotUrl: screenshotDataUrl || null,
        tenantNote: tenantNote.trim() || null,
        createdAt: nowIso,
        status: "PENDING_VERIFICATION",
      });
      setIsSubmitted(true);
      setAllowReupload(false);
      setScreenshotDataUrl(null);
      setScreenshotFileName(null);
      setCompressedSizeKb(null);
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
              {existingProof || isSubmitted ? (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-block mt-1">
                  ⏳ Verification Pending
                </span>
              ) : details.dueDate ? (
                <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200 inline-block mt-1">
                  Due: {details.dueDate}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* 🧾 Compact Recent Payments (Last 2) */}
        {recentPayments.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recent Payments (Last {recentPayments.length})</span>
              </span>
              <span className="text-[10px] text-gray-400 font-medium">Recorded in ledger</span>
            </div>
            <div className="divide-y divide-gray-100">
              {recentPayments.map((pay) => (
                <div key={pay.id} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-bold text-gray-800">{pay.date}</span>
                    {pay.mode && (
                      <span className="text-[11px] text-gray-500 ml-1.5 truncate">• {pay.mode}</span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-emerald-700 shrink-0">
                    ₹{pay.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

            {/* 📸 Case A: Existing Screenshot Submitted (Keep Attached with Option to Change) */}
            {(existingProof || isSubmitted) && !allowReupload ? (
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-amber-200 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                      ⏳ Awaiting Owner Verification
                    </span>
                    <h2 className="font-serif font-bold text-base text-gray-900 mt-1.5 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#c2652a]" />
                      <span>Payment Screenshot Attached</span>
                    </h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Your proof has been submitted to management. You can review or change this screenshot before approval.
                    </p>
                  </div>
                </div>

                {/* Screenshot Display */}
                {existingProof?.screenshotUrl ? (
                  <div className="space-y-2">
                    <div
                      onClick={() => setZoomedScreenshot(existingProof.screenshotUrl || null)}
                      className="relative group rounded-2xl overflow-hidden border border-gray-200 bg-gray-950 shadow-inner max-h-64 flex items-center justify-center cursor-pointer hover:opacity-95 transition-all"
                      title="Tap to enlarge"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={existingProof.screenshotUrl}
                        alt="Submitted Payment Proof"
                        className="max-h-60 w-auto object-contain"
                      />
                      <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/75 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                        <ZoomIn className="w-3 h-3" />
                        <span>Tap to Enlarge</span>
                      </div>
                    </div>

                    {existingProof.tenantNote && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Your Note</span>
                        <p className="text-gray-800 font-medium mt-0.5">&ldquo;{existingProof.tenantNote}&rdquo;</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-300 text-center text-xs text-gray-500">
                    Payment screenshot attached • Management notified
                  </div>
                )}

                {/* Change Screenshot Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAllowReupload(true);
                      if (existingProof?.tenantNote) setTenantNote(existingProof.tenantNote);
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-xs font-bold text-[#c2652a] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Change Screenshot / Re-upload Proof</span>
                  </button>
                </div>
              </div>
            ) : (
              /* 📸 Case B: Screenshot Upload Form (New or Replacement) */
              <form onSubmit={handleSubmitProof} className="bg-white p-5 sm:p-6 rounded-3xl border border-[#d7c2b9]/60 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#c2652a]" />
                      <span>{allowReupload ? "Replace Payment Screenshot" : "Upload Payment Screenshot"}</span>
                    </h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {allowReupload
                        ? "Select a new screenshot to replace your previously submitted proof."
                        : "Attach your UPI payment confirmation screenshot to verify your rent payment."}
                    </p>
                  </div>
                  {allowReupload && existingProof && (
                    <button
                      type="button"
                      onClick={() => {
                        setAllowReupload(false);
                        setScreenshotDataUrl(null);
                        setScreenshotFileName(null);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
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
                      <span>{allowReupload ? "Update Payment Proof" : "Submit Payment Proof"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

        {/* 🔍 Fullscreen Image Lightbox Modal for Tenant */}
        {zoomedScreenshot && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
            onClick={() => setZoomedScreenshot(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomedScreenshot}
                alt="Enlarged Proof"
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setZoomedScreenshot(null)}
                className="absolute -top-10 right-0 text-white font-bold text-xs flex items-center gap-1 hover:text-orange-300"
              >
                <X className="w-5 h-5" />
                <span>Close Fullscreen</span>
              </button>
            </div>
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
