"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { useAuth } from "@/providers/AuthProvider";
import { evaluateSubscription, calculateStackedExpiry } from "@/lib/subscriptionEngine";
import { RazorpayModalMockup } from "@/components/dashboard/RazorpayModalMockup";
import {
  Sparkles,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  QrCode,
  Layers,
  FileText,
  Zap,
  Building2,
  ChevronRight,
  ExternalLink,
  Phone,
  HelpCircle,
  Lock,
  Upload,
  Image as ImageIcon,
  Check,
  X,
  RefreshCw,
  Eye,
  Trash2,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SubscriptionBillingPage() {
  const params = useParams();
  const propertyId = (params?.propertyId as string) || "sunshine-pg";
  const { profile } = useAuth();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"PRO_MONTHLY" | "PRO_ANNUAL">("PRO_MONTHLY");
  const [paymentChannel, setPaymentChannel] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);

  // Offline Verification State
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string | null>(null);
  const [receiptNotes, setReceiptNotes] = useState("");
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [isCancellingProof, setIsCancellingProof] = useState(false);

  // Pending Request Tracking
  const [pendingRequest, setPendingRequest] = useState<any | null>(null);
  const [loadingPending, setLoadingPending] = useState(true);
  const [zoomedScreenshot, setZoomedScreenshot] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);

  const sub = evaluateSubscription(profile);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch pending verification request if any
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
      console.warn("Notice checking pending subscription request:", err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    loadPendingRequest();
  }, [profile?.email, profile?.uid]);

  // 2. Fetch past subscription transactions for this customer
  useEffect(() => {
    async function loadTransactions() {
      if (!profile?.email) return;
      try {
        try {
          const qAdmin = query(
            collection(db, "platform_admin", "billing", "transactions"),
            where("customerEmail", "==", profile.email.toLowerCase().trim())
          );
          const snapAdmin = await getDocs(qAdmin);
          if (!snapAdmin.empty) {
            const list = snapAdmin.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setHistoryTransactions(list);
            return;
          }
        } catch (e) {
          // ignore and try subscription_transactions
        }

        const q = query(
          collection(db, "subscription_transactions"),
          where("customerEmail", "==", profile.email.toLowerCase().trim())
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setHistoryTransactions(list);
      } catch (err) {
        console.warn("Notice loading subscription transactions:", err);
      }
    }
    loadTransactions();
  }, [profile?.email]);

  // Handle Screenshot Selection
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerToast("⚠️ Please upload a valid image file (PNG, JPG, JPEG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      triggerToast("⚠️ File size exceeds 5MB. Please upload a smaller image.");
      return;
    }

    setScreenshotFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Offline Payment Proof for Manual Founder Approval
  const handleSubmitPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!screenshotPreview) {
      triggerToast("⚠️ Please upload your payment screenshot before proceeding.");
      return;
    }

    setIsSubmittingProof(true);

    try {
      const res = await fetch("/api/subscription/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile?.uid,
          customerEmail: profile?.email,
          customerName: profile?.displayName || "PG Owner",
          customerPhone: profile?.phone || "",
          propertyId,
          propertyName: "TenoPilot PG",
          plan: selectedPlan,
          amount: selectedPlan === "PRO_MONTHLY" ? 999 : 9990,
          paymentMode: "UPI / Bank Transfer (Offline)",
          screenshotData: screenshotPreview,
          notes: receiptNotes || "Payment screenshot submitted via client subscription portal",
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast("🎉 Payment proof submitted! Founder review typically takes under 15 minutes.");
        setScreenshotPreview(null);
        setScreenshotFileName(null);
        setReceiptNotes("");
        setPendingRequest(data.request);
      } else {
        triggerToast(`⚠️ Notice: ${data.message}`);
      }
    } catch (err: any) {
      triggerToast(`⚠️ Submission failed: ${err.message}`);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Cancel Pending Request to re-upload
  const handleCancelPendingRequest = async () => {
    if (!pendingRequest?.id) return;
    setIsCancellingProof(true);

    try {
      const res = await fetch(
        `/api/subscription/request?requestId=${pendingRequest.id}&userId=${profile?.uid || ""}&email=${encodeURIComponent(
          profile?.email || ""
        )}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        triggerToast("Request cancelled. You can now submit a new payment proof.");
        setPendingRequest(null);
      } else {
        triggerToast(`⚠️ Could not cancel: ${data.message}`);
      }
    } catch (err: any) {
      triggerToast(`⚠️ Error: ${err.message}`);
    } finally {
      setIsCancellingProof(false);
    }
  };

  const proFeatures = [
    "Unlimited Tenants & Multi-Bed Management",
    "Dual-Ledger Accounting (Rent vs Security Deposit)",
    "1-Tap WhatsApp Cloud & Official Email Reminders",
    "Dynamic UPI QR Code Generation per Room/Bed",
    "Instant E-Receipt Auto-Dispatch with PDF Invoices",
    "Instant Multi-Property Portfolio Switching",
    "24/7 Dedicated Priority Phone & WhatsApp Support",
  ];

  return (
    <div className="flex h-screen bg-[#fff8f6] text-[#201a17] overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <PropertySidebar
        propertyId={propertyId}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#fff8f6]">
        <PropertyHeader
          title="Subscription & Billing Hub"
          propertyId={propertyId}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        <div className="p-4 sm:p-8 space-y-8 max-w-[1280px] mx-auto w-full pb-28">
          {/* Header Banner */}
          <div className="space-y-1 border-b border-[#d7c2b9]/40 pb-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/15 text-[#964407] px-2.5 py-0.5 rounded-full border border-amber-500/30">
                OFFICIAL SUBSCRIPTION HUB 💎
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Live Status
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#201a17]">
              Subscription & Plan Management
            </h1>
            <p className="text-xs text-gray-500">
              Manage your Pro subscription, choose between Instant Online Gateway (Razorpay) or Direct Offline UPI, and extend your workspace.
            </p>
          </div>

          {/* ⏳ PENDING VERIFICATION NOTICE CARD (Rendered if customer has an offline proof under review) */}
          {pendingRequest && (
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-amber-100/40 border-2 border-amber-300 shadow-md animate-in fade-in space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-amber-500/20 animate-pulse">
                    ⏳
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black text-[10px] uppercase tracking-wider">
                        Verification In Progress
                      </span>
                      <span className="text-[11px] font-mono text-gray-500">
                        Request ID: <strong>{pendingRequest.id}</strong>
                      </span>
                    </div>
                    <h3 className="text-base font-black text-gray-900 font-serif">
                      Your Payment Screenshot is Under Review
                    </h3>
                    <p className="text-xs text-gray-700 leading-relaxed max-w-2xl">
                      We have safely received your proof for <strong>{pendingRequest.plan === "PRO_MONTHLY" ? "Pro Monthly (₹999)" : "Pro Annual (₹9,990)"}</strong>. Our founder team verifies transactions directly with bank records. Your workspace will automatically unlock immediately upon approval.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                  <a
                    href={`https://wa.me/919876543210?text=${encodeURIComponent(
                      `Hi Ramesh, I have submitted payment proof for TenoPilot Pro (${pendingRequest.plan}) for my PG. Request ID: ${pendingRequest.id}. Please verify.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>📱 Priority WhatsApp Ping</span>
                  </a>

                  <button
                    type="button"
                    disabled={isCancellingProof}
                    onClick={handleCancelPendingRequest}
                    className="text-[11px] text-gray-500 hover:text-rose-600 underline font-medium cursor-pointer transition-colors"
                  >
                    {isCancellingProof ? "Cancelling..." : "Cancel & Re-Upload Proof"}
                  </button>
                </div>
              </div>

              {/* Uploaded Proof Preview Bar */}
              {pendingRequest.screenshotUrl && (
                <div className="pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setZoomedScreenshot(pendingRequest.screenshotUrl)}
                      className="relative w-16 h-12 rounded-xl bg-gray-200 border border-amber-300 overflow-hidden cursor-pointer hover:opacity-90 shadow-2xs group"
                      title="Click to zoom screenshot"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pendingRequest.screenshotUrl}
                        alt="Payment Proof"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-[11px]">Payment Proof Attached</p>
                      <p className="text-[10px] text-gray-500">
                        Submitted: {new Date(pendingRequest.submittedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} • Click thumbnail to inspect
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-900 font-mono text-[10px] font-bold">
                    Pending Founder Approval
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE PLAN STATUS CARD */}
          <div
            className={`p-5 sm:p-6 rounded-3xl border transition-all shadow-xs ${
              sub.status === "ACTIVE_PRO"
                ? "bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 border-emerald-500/30"
                : sub.inGracePeriod
                ? "bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30 border-amber-500/40"
                : sub.isPreExpiry
                ? "bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/30 border-blue-500/30"
                : "bg-gradient-to-br from-amber-50/60 via-white to-orange-50/20 border-amber-400/30"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide border flex items-center gap-1.5 shadow-2xs ${
                      sub.status === "ACTIVE_PRO"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : sub.inGracePeriod
                        ? "bg-amber-100 text-amber-900 border-amber-400 animate-pulse"
                        : sub.isPreExpiry
                        ? "bg-blue-100 text-blue-900 border-blue-300"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    {sub.inGracePeriod ? (
                      <Clock className="w-3 h-3" />
                    ) : sub.isPro ? (
                      <ShieldCheck className="w-3 h-3" />
                    ) : (
                      <Zap className="w-3 h-3 text-[#c2652a]" />
                    )}
                    <span>
                      {sub.status === "ACTIVE_PRO"
                        ? "💎 Pro Monthly Active"
                        : sub.inGracePeriod
                        ? `⏳ 7-Day Pro Grace (${sub.graceDaysRemaining}d Left)`
                        : sub.isPreExpiry
                        ? `💎 Pro (Renews in ${sub.daysRemaining}d)`
                        : `⚡ 10-Day Free Express Trial (${sub.daysRemaining === 0 ? "Ends Today" : `${sub.daysRemaining}d Left`})`}
                    </span>
                  </span>

                  <span className="text-[11px] font-mono text-gray-500">
                    Cycle Validity: <strong>{sub.expiryDateFormatted}</strong>
                  </span>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed">
                  {sub.inGracePeriod
                    ? `Your Pro cycle completed on ${sub.expiryDateFormatted}. All operations remain active during your 7-day grace period.`
                    : sub.isPreExpiry
                    ? `Your Pro subscription will renew on ${sub.expiryDateFormatted}. Early renewals seamlessly stack +30 days without losing current days.`
                    : sub.isPro
                    ? `Enjoy uninterrupted access to automated WhatsApp reminders, verified email dispatches, and multi-bed management.`
                    : `You have full access to explore TenoPilot features. Upgrade to Pro (₹999/mo) to unlock automated multi-channel batch reminders.`}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="#payment-options"
                  className="px-5 py-2.5 rounded-xl bg-[#201a17] hover:bg-[#342924] text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{sub.isPro ? "Extend / Stack Renewal" : "Upgrade to Pro (₹999)"}</span>
                </a>
              </div>
            </div>
          </div>

          {/* PLAN SELECTION CARDS */}
          <div className="space-y-4" id="payment-options">
            <div>
              <h3 className="text-lg font-black text-[#201a17]">1. Choose Your Plan</h3>
              <p className="text-xs text-gray-500">
                Select your billing frequency. Early renewals stack seamlessly onto your current days.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Plan 1: Pro Monthly */}
              <div
                onClick={() => setSelectedPlan("PRO_MONTHLY")}
                className={`p-6 sm:p-7 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedPlan === "PRO_MONTHLY"
                    ? "bg-white border-[#c2652a] shadow-md ring-2 ring-[#c2652a]/20"
                    : "bg-white/60 border-[#d7c2b9]/60 hover:border-[#c2652a]/50"
                }`}
              >
                {selectedPlan === "PRO_MONTHLY" && (
                  <span className="absolute -top-3 right-6 bg-[#c2652a] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-xs">
                    SELECTED
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-base text-[#201a17]">Pro Monthly Plan</h4>
                      <p className="text-[11px] text-gray-500">Flexible 30-day recurring subscription</p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 text-[#c2652a]">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#201a17]">₹999</span>
                    <span className="text-xs text-gray-500 font-bold">/ Month</span>
                  </div>

                  <ul className="space-y-2 text-xs text-gray-600 pt-2">
                    {proFeatures.slice(0, 5).map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                      selectedPlan === "PRO_MONTHLY"
                        ? "bg-[#201a17] text-white shadow-xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {selectedPlan === "PRO_MONTHLY" ? "✓ Plan Selected" : "Select Monthly (₹999)"}
                  </button>
                </div>
              </div>

              {/* Plan 2: Pro Annual */}
              <div
                onClick={() => setSelectedPlan("PRO_ANNUAL")}
                className={`p-6 sm:p-7 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedPlan === "PRO_ANNUAL"
                    ? "bg-white border-[#c2652a] shadow-md ring-2 ring-[#c2652a]/20"
                    : "bg-white/60 border-[#d7c2b9]/60 hover:border-[#c2652a]/50"
                }`}
              >
                <span className="absolute -top-3 right-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-xs">
                  SAVE ₹1,998 (2 MONTHS FREE) 🏆
                </span>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-base text-[#201a17]">Pro Annual Plan</h4>
                      <p className="text-[11px] text-gray-500">365 days uninterrupted peace of mind</p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#201a17]">₹9,990</span>
                    <span className="text-xs text-gray-500 font-bold">/ Year (₹832/mo)</span>
                  </div>

                  <ul className="space-y-2 text-xs text-gray-600 pt-2">
                    {proFeatures.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                      selectedPlan === "PRO_ANNUAL"
                        ? "bg-[#201a17] text-white shadow-xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {selectedPlan === "PRO_ANNUAL" ? "✓ Plan Selected" : "Select Annual (₹9,990)"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* DUAL PAYMENT METHOD HUB: ONLINE (RAZORPAY) vs OFFLINE (PROOF APPROVAL) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#d7c2b9]/60 shadow-xs space-y-6">
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-black text-[#201a17] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#c2652a]" />
                  <span>2. Select Payment Method & Activate</span>
                </h3>
                <span className="text-[11px] font-bold text-gray-500">
                  Total Due: <strong className="text-slate-900 font-mono text-xs">₹{selectedPlan === "PRO_MONTHLY" ? "999" : "9,990"}</strong>
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose between Instant Automated Activation via Online Gateway (Razorpay) or Direct Bank/UPI Transfer with manual proof verification.
              </p>
            </div>

            {/* Payment Channel Selector Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentChannel("ONLINE")}
                className={`p-4 rounded-2xl border-2 flex items-start gap-3 transition-all cursor-pointer text-left ${
                  paymentChannel === "ONLINE"
                    ? "bg-gradient-to-br from-blue-50/60 to-white border-blue-600 shadow-sm ring-2 ring-blue-500/20"
                    : "bg-slate-50/50 border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  paymentChannel === "ONLINE" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-200 text-slate-700"
                }`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900">Online Gateway (Razorpay)</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                      Instant ⚡
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    UPI, Cards, NetBanking. Automated activation in 10 seconds.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentChannel("OFFLINE")}
                className={`p-4 rounded-2xl border-2 flex items-start gap-3 transition-all cursor-pointer text-left ${
                  paymentChannel === "OFFLINE"
                    ? "bg-gradient-to-br from-amber-50/60 to-white border-amber-600 shadow-sm ring-2 ring-amber-500/20"
                    : "bg-slate-50/50 border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  paymentChannel === "OFFLINE" ? "bg-amber-600 text-white shadow-sm" : "bg-slate-200 text-slate-700"
                }`}>
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900">Direct Offline UPI / Bank</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase">
                      Manual Approval
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Scan QR, upload screenshot. Verified & approved by founder.
                  </p>
                </div>
              </button>
            </div>

            {/* CHANNEL 1: ONLINE GATEWAY (RAZORPAY MOCKUP) */}
            {paymentChannel === "ONLINE" && (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-[#0c2340] text-white space-y-5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest block">
                      RECOMMENDED FOR FASTEST ACCESS
                    </span>
                    <h4 className="text-xl font-black text-white font-serif">
                      Instant Automated Activation via Razorpay
                    </h4>
                    <p className="text-xs text-slate-300 max-w-lg">
                      Pay securely with Google Pay, PhonePe, Paytm, RuPay, Visa, Mastercard, or NetBanking. Instant webhook verification unlocks your Pro plan automatically.
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-white font-mono">
                      ₹{selectedPlan === "PRO_MONTHLY" ? "999" : "9,990"}
                    </span>
                    <span className="text-xs text-slate-400 block font-sans">
                      {selectedPlan === "PRO_MONTHLY" ? "30 Days Access" : "365 Days Access"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>256-Bit SSL Encrypted</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                    <span>Zero Manual Wait Time</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Official GST Invoice Generated</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRazorpayModal(true)}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 via-[#3399cc] to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Pay ₹{selectedPlan === "PRO_MONTHLY" ? "999" : "9,990"} via Razorpay Gateway (Instant)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* CHANNEL 2: OFFLINE UPI / BANK TRANSFER (MANUAL PROOF APPROVAL) */}
            {paymentChannel === "OFFLINE" && (
              <div className="space-y-5 animate-in fade-in">
                {/* Official Bank / VPA Details */}
                <div className="p-4 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9]/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">OFFICIAL UPI ID / VPA</span>
                    <p className="font-mono font-black text-sm text-[#201a17]">
                      tenopilot@icici <span className="text-gray-400 font-normal font-sans">(or 9876543210@paytm)</span>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Scan or pay <strong>{selectedPlan === "PRO_MONTHLY" ? "₹999" : "₹9,990"}</strong> from any UPI app.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">DIRECT FOUNDER WHATSAPP</span>
                    <p className="font-mono font-bold text-sm text-emerald-700">
                      +91 98765 43210
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Have questions or need offline invoice? WhatsApp founder directly.
                    </p>
                  </div>
                </div>

                {/* Proof Upload & Submission Form */}
                <form onSubmit={handleSubmitPaymentProof} className="space-y-4 text-xs">
                  <div className="space-y-2">
                    <label className="block font-bold text-gray-800 text-xs flex items-center justify-between">
                      <span>Upload Payment Screenshot (Receipt / UTR) *</span>
                      <span className="text-[10px] text-gray-500 font-normal">PNG, JPG, WebP up to 5MB</span>
                    </label>

                    {screenshotPreview ? (
                      /* Preview Box */
                      <div className="p-4 rounded-2xl bg-slate-50 border-2 border-emerald-300 flex items-center justify-between gap-3 animate-in zoom-in-95">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={screenshotPreview}
                            alt="Screenshot Preview"
                            className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs cursor-pointer"
                            onClick={() => setZoomedScreenshot(screenshotPreview)}
                          />
                          <div>
                            <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>{screenshotFileName || "payment_screenshot.jpg"}</span>
                            </p>
                            <p className="text-[10px] text-emerald-700 font-medium">
                              Ready for verification. Click thumbnail to zoom.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setScreenshotPreview(null);
                            setScreenshotFileName(null);
                          }}
                          className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                          title="Remove screenshot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      /* Dropzone */
                      <label className="border-2 border-dashed border-gray-300 hover:border-[#c2652a] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-white group">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 group-hover:bg-amber-100 text-[#c2652a] flex items-center justify-center mb-2 transition-colors">
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-gray-800 text-xs">
                          Click to upload payment screenshot
                        </span>
                        <span className="text-[11px] text-gray-500 mt-0.5">
                          Drag and drop screenshot from GPay, PhonePe, Paytm, or net banking
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-gray-700">
                      Payment Remarks / Account Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={receiptNotes}
                      onChange={(e) => setReceiptNotes(e.target.value)}
                      placeholder="e.g. Paid via GPay from Ramesh account (UTR: 20260906...)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-[#c2652a]"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Reviewed & approved by founder. Turnaround typically under 15 minutes.</span>
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmittingProof || !screenshotPreview}
                      className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#201a17] hover:bg-[#342924] text-white font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSubmittingProof ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting Proof for Review...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Proceed for Approval 🚀</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* PAYMENT HISTORY & RECEIPTS TABLE */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#d7c2b9]/60 shadow-xs space-y-4">
            <div>
              <h3 className="text-lg font-black text-[#201a17]">Billing & Invoices History</h3>
              <p className="text-xs text-gray-500">
                Official transaction audit log of all completed renewals and plan activations.
              </p>
            </div>

            {historyTransactions.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-1 bg-[#fff8f6] rounded-2xl border border-dashed border-[#d7c2b9]/60">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-600">No Past Invoices Found</p>
                <p className="text-[11px] text-gray-400">Your completed renewals and digital invoices will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#d7c2b9]/60 text-gray-500 text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Receipt / Txn ID</th>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d7c2b9]/30">
                    {historyTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-3 text-gray-600 font-mono text-[11px]">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-GB") : "Recent"}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-gray-900">
                          {tx.receiptNumber || tx.id}
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-800">
                          {tx.plan === "PRO_ANNUAL" ? "Pro Annual" : "Pro Monthly"}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {tx.paymentMode || "UPI"}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-gray-900">
                          ₹{Number(tx.amountPaid || 999).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RAZORPAY GATEWAY CHECKOUT MODAL MOCKUP */}
      <RazorpayModalMockup
        isOpen={showRazorpayModal}
        onClose={() => setShowRazorpayModal(false)}
        onSuccess={() => {
          setShowRazorpayModal(false);
          triggerToast("🎉 Instant activation verified! Pro plan extended.");
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }}
        plan={selectedPlan}
        amount={selectedPlan === "PRO_MONTHLY" ? 999 : 9990}
        customerEmail={profile?.email}
        customerName={profile?.displayName || "PG Owner"}
        customerPhone={profile?.phone || "9876543210"}
        userId={profile?.uid}
      />

      {/* SCREENSHOT ZOOM MODAL */}
      {zoomedScreenshot && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in"
          onClick={() => setZoomedScreenshot(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomedScreenshot(null)}
              className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/40 flex items-center justify-center cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedScreenshot}
              alt="Payment Proof Full View"
              className="max-h-[80vh] w-auto rounded-2xl shadow-2xl object-contain border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
