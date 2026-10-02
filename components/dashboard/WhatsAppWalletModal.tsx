"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Sparkles,
  Zap,
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  X,
  Plus,
  RefreshCw,
  QrCode,
  Building2,
  Upload,
  Image as ImageIcon,
  Lock,
  ExternalLink,
  Eye,
  Trash2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  whatsappCreditStore,
  WHATSAPP_CREDIT_PACKAGES,
  WhatsAppCreditPackage,
  WhatsAppCreditTransaction,
} from "@/constants/whatsappCreditStore";
import { RazorpayModalMockup } from "@/components/dashboard/RazorpayModalMockup";
import { useAuth } from "@/providers/AuthProvider";

interface WhatsAppWalletModalProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
  onRechargeSuccess?: (newCredits: number) => void;
}

export function WhatsAppWalletModal({
  propertyId,
  isOpen,
  onClose,
  onRechargeSuccess,
}: WhatsAppWalletModalProps) {
  const { profile } = useAuth();
  const [credits, setCredits] = useState<number>(() => whatsappCreditStore.getCredits(propertyId));
  const [transactions, setTransactions] = useState<WhatsAppCreditTransaction[]>(() =>
    whatsappCreditStore.getTransactions(propertyId)
  );
  const [selectedPack, setSelectedPack] = useState<WhatsAppCreditPackage>(WHATSAPP_CREDIT_PACKAGES[1]);
  const [activeTab, setActiveTab] = useState<"RECHARGE" | "HISTORY">("RECHARGE");
  const [paymentChannel, setPaymentChannel] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Offline Verification State
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string | null>(null);
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [receiptNotes, setReceiptNotes] = useState<string>("");
  const [isSubmittingOffline, setIsSubmittingOffline] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any | null>(null);
  const [loadingPending, setLoadingPending] = useState(false);
  const [zoomedScreenshot, setZoomedScreenshot] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !propertyId) return;

    whatsappCreditStore.initFirebaseListener(propertyId);
    whatsappCreditStore.fetchWalletFromFirestore(propertyId);

    const updateState = () => {
      setCredits(whatsappCreditStore.getCredits(propertyId));
      setTransactions(whatsappCreditStore.getTransactions(propertyId));
    };

    updateState();
    const unsub = whatsappCreditStore.subscribe(updateState);
    return () => unsub();
  }, [isOpen, propertyId]);

  // Load pending offline verification if any
  const loadPendingRequest = async () => {
    if (!profile?.email && !profile?.uid) return;
    try {
      setLoadingPending(true);
      const url = `/api/subscription/pending?${profile.uid ? `userId=${profile.uid}&` : ""}${
        profile.email ? `email=${encodeURIComponent(profile.email)}` : ""
      }`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.hasPending && data.request) {
        setPendingRequest(data.request);
      } else {
        setPendingRequest(null);
      }
    } catch (err) {
      console.warn("Notice checking pending wallet recharge request:", err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPendingRequest();
    }
  }, [isOpen, profile?.email, profile?.uid]);

  if (!isOpen) return null;

  // Handle Image Upload & Compression
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (JPG, PNG, WebP).");
      return;
    }
    setScreenshotFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setScreenshotPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  // Handle Offline Form Submission
  const handleSubmitOfflineProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotPreview) {
      alert("Please attach your payment screenshot or UPI receipt before submitting.");
      return;
    }

    setIsSubmittingOffline(true);
    try {
      const combinedNotes = `UTR: ${utrNumber ? utrNumber.trim() : "Not provided"} • WhatsApp Pack: ${selectedPack.name} (+${selectedPack.credits} Credits) • ${receiptNotes}`.trim();

      const res = await fetch("/api/subscription/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile?.uid,
          customerEmail: profile?.email || "owner@tenopilot.com",
          customerName: profile?.displayName || "PG Owner",
          customerPhone: profile?.phone || "",
          propertyId,
          propertyName: "TenoPilot Property",
          plan: `WHATSAPP_PACK_${selectedPack.credits}`,
          amount: selectedPack.priceInr,
          paymentMode: "Offline UPI / Bank Transfer",
          screenshotData: screenshotPreview,
          notes: combinedNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessToast(`🎉 Submitted recharge request for ${selectedPack.name}! Verification usually completes in <15 mins.`);
        setScreenshotPreview(null);
        setScreenshotFileName(null);
        setUtrNumber("");
        setReceiptNotes("");
        await loadPendingRequest();
      } else {
        alert(data.message || "Failed to submit offline request.");
      }
    } catch (err: any) {
      console.error("Offline proof submission error:", err);
      alert("Network error submitting proof. Please try again.");
    } finally {
      setIsSubmittingOffline(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-in zoom-in-95 text-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#059669] text-white flex items-center justify-between relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3.5 z-10">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base sm:text-lg tracking-tight">WhatsApp Cloud Gateway</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-emerald-200 text-[10px] font-bold tracking-wider uppercase">
                    Automated Meta API
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 font-medium line-clamp-1">
                  Automated rent reminders, verified receipts & check-in notices
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-10 shrink-0"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Live Balance Banner & Navigation Tabs */}
          <div className="bg-[#f0fdf4] border-b border-emerald-100 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block leading-none">
                  Available Credits Balance
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-gray-900 font-mono tabular-nums">{credits}</span>
                  <span className="text-xs font-bold text-emerald-700">Messages Available</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab("RECHARGE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "RECHARGE"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Recharge Packs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("HISTORY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "HISTORY"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Usage History ({transactions.length})
              </button>
            </div>
          </div>

          {/* Success Toast */}
          {successToast && (
            <div className="mx-4 sm:mx-6 mt-4 p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {activeTab === "RECHARGE" ? (
              <>
                {/* Pending Verification Banner if existing request exists */}
                {pendingRequest && (
                  <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-4 h-4 animate-spin text-amber-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-amber-900">Offline Recharge Under Review</span>
                          <span className="px-2 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold uppercase">
                            Pending Verification
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Amount: <strong>₹{pendingRequest.amount}</strong> ({pendingRequest.plan?.replace("WHATSAPP_PACK_", "")} Credits) • Submitted: {new Date(pendingRequest.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {pendingRequest.screenshotUrl && (
                      <button
                        type="button"
                        onClick={() => setZoomedScreenshot(pendingRequest.screenshotUrl)}
                        className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-xl font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Slip</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 1. Package Selection Cards */}
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                    1. Select a WhatsApp Credit Package
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {WHATSAPP_CREDIT_PACKAGES.map((pack) => {
                      const isSelected = selectedPack.id === pack.id;
                      return (
                        <div
                          key={pack.id}
                          onClick={() => setSelectedPack(pack)}
                          className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20"
                              : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50"
                          }`}
                        >
                          {pack.popular && (
                            <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-2xs">
                              Popular
                            </span>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="font-bold text-xs text-gray-900">{pack.name}</h5>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md font-mono">
                                {pack.pricePerCredit}/msg
                              </span>
                            </div>

                            <div className="my-2">
                              <span className="text-2xl font-black text-gray-900 font-mono tabular-nums">
                                {pack.credits.toLocaleString("en-IN")}
                              </span>
                              <span className="text-xs text-gray-500 font-medium ml-1">Credits</span>
                            </div>

                            <p className="text-[11px] text-gray-500 font-medium">{pack.badge}</p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-100 flex items-baseline justify-between">
                            <span className="text-[11px] font-bold text-gray-400">Total Price:</span>
                            <span className="text-base font-extrabold text-gray-900 font-mono">
                              ₹{pack.priceInr.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Payment Channel Selector (Online Gateway vs Offline UPI QR) */}
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                    2. Choose Payment Channel
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentChannel("ONLINE")}
                      className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer text-left ${
                        paymentChannel === "ONLINE"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs"
                          : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${paymentChannel === "ONLINE" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                        <Zap className="w-4 h-4 fill-current" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold">Online Gateway (Razorpay)</span>
                        <span className="text-[10px] text-gray-500 font-normal">Instant credit activation via UPI / Card</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentChannel("OFFLINE")}
                      className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer text-left ${
                        paymentChannel === "OFFLINE"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs"
                          : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${paymentChannel === "OFFLINE" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold">Offline UPI / Bank Transfer</span>
                        <span className="text-[10px] text-gray-500 font-normal">Upload screenshot & UTR reference</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. Payment Execution Card */}
                {paymentChannel === "ONLINE" ? (
                  /* ONLINE GATEWAY FLOW */
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-emerald-50/40 border border-emerald-200/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                          Instant Online Recharge
                        </span>
                        <h5 className="text-sm font-black text-gray-900 mt-0.5">
                          {selectedPack.name} (+{selectedPack.credits.toLocaleString("en-IN")} WhatsApp Credits)
                        </h5>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          256-bit encrypted Razorpay Standard Gateway • Supports GPay, PhonePe, Paytm, Cards & NetBanking
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowRazorpayModal(true)}
                        className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 text-white font-black text-xs shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                      >
                        <Lock className="w-4 h-4 text-emerald-200" />
                        <span>Pay ₹{selectedPack.priceInr.toLocaleString("en-IN")} via Razorpay</span>
                      </button>
                    </div>

                    <div className="pt-3 border-t border-emerald-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-gray-600">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Instant automated credit to property wallet</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Official GST tax invoice receipt issued</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* OFFLINE UPI / BANK TRANSFER FLOW */
                  <div className="p-5 rounded-2xl bg-white border-2 border-emerald-200 shadow-sm space-y-5 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row items-start gap-5">
                      {/* Dynamic Payment QR Box */}
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-center shrink-0 w-full sm:w-44 flex flex-col items-center">
                        <div className="w-36 h-36 bg-white p-2 rounded-xl border border-gray-200 shadow-inner flex items-center justify-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                              `upi://pay?pa=tenopilot@ybl&pn=TenoPilot%20Technologies&am=${selectedPack.priceInr}&cu=INR&tn=WhatsApp_Credits_${selectedPack.credits}`
                            )}`}
                            alt="Payment QR"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-700 mt-2 block">
                          Scan with PhonePe / GPay / Paytm
                        </span>
                        <span className="text-xs font-black text-emerald-700 font-mono">
                          ₹{selectedPack.priceInr.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* Bank & UPI Details */}
                      <div className="space-y-3 flex-1 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Bank Account & UPI Details
                          </span>
                          <h5 className="font-bold text-gray-900 text-sm mt-0.5">
                            TenoPilot Technologies Private Limited
                          </h5>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div>
                            <span className="text-gray-400 block font-medium">UPI ID:</span>
                            <span className="font-mono font-bold text-gray-800 select-all">tenopilot@ybl</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-medium">Bank Name:</span>
                            <span className="font-bold text-gray-800">HDFC Bank</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-medium">Account Number:</span>
                            <span className="font-mono font-bold text-gray-800 select-all">50200084729104</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-medium">IFSC Code:</span>
                            <span className="font-mono font-bold text-gray-800 select-all">HDFC0001234</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-gray-500 leading-snug">
                          Make the payment of <strong>₹{selectedPack.priceInr}</strong> and submit the screenshot or 12-digit UTR below for verification.
                        </p>
                      </div>
                    </div>

                    {/* Screenshot & UTR Submission Form */}
                    <form onSubmit={handleSubmitOfflineProof} className="space-y-3.5 pt-3 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          Payment Screenshot / UPI Receipt *
                        </label>
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragOver(true);
                          }}
                          onDragLeave={() => setIsDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                            if (e.dataTransfer.files?.[0]) {
                              handleImageFile(e.dataTransfer.files[0]);
                            }
                          }}
                          className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer ${
                            isDragOver
                              ? "border-emerald-500 bg-emerald-50"
                              : screenshotPreview
                              ? "border-emerald-300 bg-emerald-50/30"
                              : "border-gray-200 hover:border-gray-300 bg-gray-50"
                          }`}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleImageFile(e.target.files[0]);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />

                          {screenshotPreview ? (
                            <div className="flex items-center justify-between gap-3 text-left">
                              <div className="flex items-center gap-3">
                                <img
                                  src={screenshotPreview}
                                  alt="Preview"
                                  className="w-12 h-12 rounded-lg object-cover border border-gray-200 shadow-2xs"
                                />
                                <div>
                                  <span className="text-xs font-bold text-gray-800 block truncate max-w-[200px]">
                                    {screenshotFileName || "screenshot.png"}
                                  </span>
                                  <span className="text-[10px] text-emerald-700 font-semibold">
                                    ✓ Image attached ready to verify
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setScreenshotPreview(null);
                                  setScreenshotFileName(null);
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="py-2 space-y-1">
                              <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                              <p className="text-xs font-bold text-gray-700">
                                Click to browse or drag payment screenshot here
                              </p>
                              <p className="text-[10px] text-gray-400">PNG, JPG, WebP up to 10MB</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1">
                            12-Digit UTR / Transaction Ref ID
                          </label>
                          <input
                            type="text"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value)}
                            placeholder="e.g. 786476913921"
                            maxLength={24}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-800 mb-1">
                            Additional Notes (Optional)
                          </label>
                          <input
                            type="text"
                            value={receiptNotes}
                            onChange={(e) => setReceiptNotes(e.target.value)}
                            placeholder="e.g. Paid via GPay from Ravi"
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingOffline || !screenshotPreview}
                        className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmittingOffline ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Submitting Verification Request...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Submit Proof for Admin Verification (₹{selectedPack.priceInr})</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              /* USAGE & TRANSACTION HISTORY TAB */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Recent Wallet Dispatches & Top-Ups
                  </h4>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Showing {transactions.length} entries
                  </span>
                </div>

                {transactions.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 text-gray-400 space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto opacity-40" />
                    <p className="text-xs font-bold text-gray-600">No transaction records yet</p>
                    <p className="text-[11px]">Your dispatch activities and top-ups will be recorded here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => {
                      const isCredit = tx.type === "PURCHASE" || tx.type === "STARTER_BONUS" || tx.amount > 0;
                      return (
                        <div
                          key={tx.id}
                          className="p-3.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all flex items-center justify-between gap-3 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isCredit
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {isCredit ? <Plus className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-gray-900 block truncate">
                                {tx.description}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(tx.timestamp).toLocaleString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {tx.recipientPhone && ` • To: ${tx.recipientPhone}`}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`font-mono font-black text-sm block ${
                                isCredit ? "text-emerald-700" : "text-gray-800"
                              }`}
                            >
                              {isCredit ? `+${tx.amount}` : `-${Math.abs(tx.amount)}`}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              Bal: {tx.balanceAfter}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 shrink-0">
            <span>Powered by TenoPilot Meta WhatsApp Cloud Engine</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-200 text-gray-700 font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* 💳 Authentic Razorpay Standard Gateway Mockup */}
      <RazorpayModalMockup
        isOpen={showRazorpayModal}
        onClose={() => setShowRazorpayModal(false)}
        plan={`WHATSAPP_PACK_${selectedPack.credits}`}
        amount={selectedPack.priceInr}
        credits={selectedPack.credits}
        propertyId={propertyId}
        itemDescription={`${selectedPack.name} (+${selectedPack.credits} WhatsApp Credits)`}
        customerEmail={profile?.email || "owner@tenopilot.com"}
        customerName={profile?.displayName || "PG Owner"}
        customerPhone={profile?.phone || "9876543210"}
        userId={profile?.uid}
        onSuccess={(details) => {
          setShowRazorpayModal(false);
          const newBal = whatsappCreditStore.getCredits(propertyId);
          setCredits(newBal);
          const pId = details?.paymentId || `pay_${Date.now()}`;
          setSuccessToast(`🎉 Payment Verified (${pId})! +${selectedPack.credits} credits added to your wallet.`);
          onRechargeSuccess?.(newBal);
        }}
      />

      {/* 🔍 Zoomed Screenshot Preview Modal */}
      {zoomedScreenshot && (
        <div
          className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setZoomedScreenshot(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] bg-white rounded-3xl p-2 overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setZoomedScreenshot(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedScreenshot}
              alt="Payment Slip Full Preview"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
