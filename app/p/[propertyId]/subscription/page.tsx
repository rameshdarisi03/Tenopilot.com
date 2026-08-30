"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PropertySidebar } from "@/components/dashboard/PropertySidebar";
import { PropertyHeader } from "@/components/dashboard/PropertyHeader";
import { useAuth } from "@/providers/AuthProvider";
import { evaluateSubscription, calculateStackedExpiry } from "@/lib/subscriptionEngine";
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
  const [paymentMode, setPaymentMode] = useState<"UPI" | "BANK" | "CASH">("UPI");
  const [utrNumber, setUtrNumber] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);

  const sub = evaluateSubscription(profile);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch past subscription transactions for this customer
  useEffect(() => {
    async function loadTransactions() {
      if (!profile?.email) return;
      try {
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

  const handleSelfRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/apex/activate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile?.uid,
          email: profile?.email,
          plan: selectedPlan,
          durationDays: selectedPlan === "PRO_MONTHLY" ? 30 : 365,
          paymentMode: paymentMode,
          amountPaid: selectedPlan === "PRO_MONTHLY" ? 999 : 9990,
          receiptNumber: utrNumber || `ONLINE-${Date.now().toString().slice(-6)}`,
          notes: receiptNotes || `Self-Service Renewal submitted by property owner`,
          activatedBy: `Self-Pay (${profile?.displayName || profile?.email})`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        triggerToast("🎉 Renewal successfully confirmed! Your Pro plan has been seamlessly extended.");
        setUtrNumber("");
        setReceiptNotes("");
        // Reload after 1.5s
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        triggerToast(`⚠️ Renewal notice: ${data.message}`);
      }
    } catch (err: any) {
      triggerToast(`⚠️ Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const proFeatures = [
    "Unlimited Tenants & Multi-Bed Management",
    "Dual-Ledger Accounting (Rent vs Security Deposit)",
    "Automated WhatsApp Payment Receipts & Rent Invoices",
    "FastTrack AI 1-Click OCR Migration Engine",
    "Police Verification & Digital KYC Register",
    "7-Day Trusted Pro Grace Period on Every Cycle",
    "Instant Multi-Property Portfolio Switching",
    "24/7 Dedicated Priority Phone & WhatsApp Support",
  ];

  return (
    <div className="flex h-screen bg-[#fff8f6] text-[#201a17] overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-3">
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
              Manage your Pro subscription, view upcoming renewals, download past receipts, and seamlessly extend your workspace.
            </p>
          </div>

          {/* SINGLE MINIMAL ACTIVE PLAN STATUS CARD */}
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
                        : `⚡ 14-Day Free Express Trial (${sub.daysRemaining}d Left)`}
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
                    ? `Your Pro plan renews in ${sub.daysRemaining} days. Early renewals stack automatically onto your remaining days.`
                    : sub.isPro
                    ? `You are enjoying full TenoPilot Pro power with unlimited WhatsApp reminders and automated dual-ledger computing.`
                    : `You have 100% full access to all core modules. (Automated WhatsApp & Email reminders are locked during trial and unlock on Pro).`}
                </p>

                <p className="text-[11px] text-[#964407] font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Early renewals stack seamlessly onto your expiry date — zero lost days.</span>
                </p>
              </div>

              {/* Action Button */}
              <div className="shrink-0 w-full sm:w-auto">
                <a
                  href="#renewal-section"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#964407] text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {sub.inGracePeriod
                      ? "Renew Pro (₹999/mo)"
                      : sub.isPreExpiry
                      ? "Renew Early (Stack 30d)"
                      : sub.isPro
                      ? "Extend Plan (+30d)"
                      : "Upgrade to Pro (₹999/mo)"}
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* PLAN COMPARISON CARDS */}
          <div className="space-y-4" id="renewal-section">
            <div>
              <h3 className="text-lg font-black text-[#201a17]">Choose Your Pro Subscription Plan</h3>
              <p className="text-xs text-gray-500">
                Select your preferred billing cycle to unlock automated WhatsApp and email reminders.
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

          {/* 🔍 FREE TRIAL VS PRO PLAN TRANSPARENCY MATRIX */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#d7c2b9]/60 shadow-xs space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#964407] bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  FULL TRANSPARENCY MATRIX 🔍
                </span>
                <h3 className="text-lg font-black text-[#201a17] mt-1.5">
                  14-Day Free Express Trial vs. Pro Plan Comparison
                </h3>
                <p className="text-xs text-gray-500">
                  Everything you get in your trial account versus unlocking automated WhatsApp & email power in TenoPilot Pro.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-[#201a17]">
                    <th className="py-3 px-4 font-black uppercase text-[11px] text-gray-500">Capabilities</th>
                    <th className="py-3 px-4 font-black text-xs text-amber-900 bg-amber-50/60 rounded-t-xl w-56 text-center">
                      ⚡ 14-Day Free Trial
                    </th>
                    <th className="py-3 px-4 font-black text-xs text-emerald-900 bg-emerald-50/60 rounded-t-xl w-56 text-center">
                      💎 Pro Plan (₹999/mo)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-800">
                      Duration & Validity
                    </td>
                    <td className="py-3 px-4 text-center text-gray-600 bg-amber-50/20 font-medium">
                      14 Days Full Trial Access
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/20">
                      Unlimited Recurring (30d / 365d)
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-800">
                      Tenant & Bed Capacity
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-800 bg-amber-50/20">
                      ✅ Unlimited Tenants, Rooms & Beds
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/20">
                      ✅ Unlimited Tenants, Rooms & Beds
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-800">
                      Dual-Ledger Accounting Engine
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-800 bg-amber-50/20">
                      ✅ Rent vs Security Deposit + Pro-Rata
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/20">
                      ✅ Rent vs Security Deposit + Pro-Rata
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-800">
                      FastTrack AI 1-Click OCR Migration
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-800 bg-amber-50/20">
                      ✅ Full AI OCR Ingestion
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/20">
                      ✅ Full AI OCR Ingestion
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-800">
                      Digital Police Verification & KYC Vault
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-800 bg-amber-50/20">
                      ✅ Full Legal Register & Storage
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/20">
                      ✅ Full Legal Register & Storage
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-800">
                      Multi-Branch Receptionist Accounts (6-Digit PIN)
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-800 bg-amber-50/20">
                      ✅ Unlimited Staff & PIN Security
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/20">
                      ✅ Unlimited Staff & PIN Security
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50/60 transition-colors bg-amber-50/30">
                    <td className="py-3.5 px-4 font-bold text-amber-950 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Automated WhatsApp & Email Reminders</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-800 bg-amber-100/50">
                      🔒 Locked (Exclusive to Pro Plan)
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-emerald-800 bg-emerald-100/60">
                      ✅ Unlimited Instant WhatsApp Dispatches
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-800">
                      7-Day Trusted Pro Grace Period
                    </td>
                    <td className="py-3 px-4 text-center text-gray-400 bg-amber-50/20">
                      ❌ None (Trial ends on Day 14)
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/20">
                      ✅ 7 Days Uninterrupted Grace Every Month
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-800">
                      Support Level
                    </td>
                    <td className="py-3 px-4 text-center text-gray-600 bg-amber-50/20">
                      Standard Support
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 bg-emerald-50/20">
                      24/7 Priority WhatsApp & Founder Call
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SELF-PAYMENT / RENEWAL SUBMISSION FORM */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#d7c2b9]/60 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-black text-[#201a17] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#c2652a]" />
                <span>Complete Renewal & Instant Activation</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Pay via your preferred UPI app or Bank Transfer and record your transaction for instant verification.
              </p>
            </div>

            {/* Payment Mode Selector */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setPaymentMode("UPI")}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs border flex items-center gap-2 transition-all cursor-pointer ${
                  paymentMode === "UPI"
                    ? "bg-[#201a17] text-white border-[#201a17]"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>UPI / QR Code (GPay / PhonePe / Paytm)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode("BANK")}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs border flex items-center gap-2 transition-all cursor-pointer ${
                  paymentMode === "BANK"
                    ? "bg-[#201a17] text-white border-[#201a17]"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <Building2 className="w-4 h-4 text-blue-500" />
                <span>Bank Transfer (IMPS / NEFT)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode("CASH")}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs border flex items-center gap-2 transition-all cursor-pointer ${
                  paymentMode === "CASH"
                    ? "bg-[#201a17] text-white border-[#201a17]"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Cash In-Hand / In-Person</span>
              </button>
            </div>

            {/* Payment Details Box */}
            <div className="p-4 rounded-2xl bg-[#fff8f6] border border-[#d7c2b9]/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">OFFICIAL UPI ID / VPA</span>
                <p className="font-mono font-black text-sm text-[#201a17]">
                  tenopilot@icici <span className="text-gray-400 font-normal font-sans">(or 9876543210@paytm)</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  Pay <strong>{selectedPlan === "PRO_MONTHLY" ? "₹999" : "₹9,990"}</strong> from any UPI app.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">DIRECT FOUNDER WHATSAPP</span>
                <p className="font-mono font-bold text-sm text-emerald-700">
                  +91 98765 43210
                </p>
                <p className="text-[11px] text-gray-500">
                  Send payment screenshot directly for 60-second priority verification.
                </p>
              </div>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSelfRenewalSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-gray-700">
                    UPI Reference / UTR Number / Receipt Tag *
                  </label>
                  <input
                    type="text"
                    required
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. UTR202608304918 or CASH-REC-01"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 font-mono text-xs focus:ring-2 focus:ring-[#c2652a]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-gray-700">
                    Payment Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    placeholder="e.g. Paid via GPay from Ramesh account"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-[#c2652a]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Instant automated activation & transaction logging.</span>
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl bg-[#201a17] hover:bg-[#342924] text-white font-black text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Confirm Renewal & Extend Plan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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
                <p className="font-bold text-xs text-gray-700">No Past Invoices Found</p>
                <p className="text-[11px] text-gray-500">Your future subscription receipts will automatically be archived here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 text-[10px] uppercase font-black tracking-wider">
                      <th className="py-3 px-4">Receipt / UTR #</th>
                      <th className="py-3 px-4">Plan Description</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          {tx.receiptNumber || tx.id}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-800">
                          {tx.plan === "PRO_ANNUAL" ? "Pro Annual Plan (365 Days)" : "Pro Monthly Plan (30 Days)"}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          ₹{(tx.amountPaid || 999).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-600">
                          {tx.paymentMode || "UPI"}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 font-mono">
                          {new Date(tx.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ {tx.status || "COMPLETED"}
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
    </div>
  );
}
