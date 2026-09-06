"use client";

import { useState } from "react";
import { X, ShieldCheck, CheckCircle2, Lock, Smartphone, CreditCard, Building2, Sparkles, RefreshCw, ArrowRight } from "lucide-react";

interface RazorpayModalMockupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plan: "PRO_MONTHLY" | "PRO_ANNUAL";
  amount: number;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  userId?: string;
}

export function RazorpayModalMockup({
  isOpen,
  onClose,
  onSuccess,
  plan,
  amount,
  customerEmail = "owner@sunshinepg.com",
  customerName = "PG Owner",
  customerPhone = "9876543210",
  userId,
}: RazorpayModalMockupProps) {
  const [activeTab, setActiveTab] = useState<"UPI" | "CARD" | "NETBANKING">("UPI");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");

  if (!isOpen) return null;

  const orderId = `order_RPZ_${Date.now().toString().slice(-7)}`;

  const handleSimulatePayment = async () => {
    setIsProcessing(true);

    // Simulate network processing with bank/gateway (1.2s)
    await new Promise((r) => setTimeout(r, 1200));

    const generatedPaymentId = `pay_RPZ_${Date.now().toString().slice(-8)}`;
    setPaymentId(generatedPaymentId);

    try {
      // Call backend activation route with Razorpay automated metadata
      const res = await fetch("/api/apex/activate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email: customerEmail,
          plan,
          durationDays: plan === "PRO_MONTHLY" ? 30 : 365,
          paymentMode: `Razorpay (${activeTab})`,
          amountPaid: amount,
          receiptNumber: generatedPaymentId,
          notes: `Razorpay Gateway Payment (Order: ${orderId}, Method: ${activeTab})`,
          activatedBy: "Razorpay Webhook (Automated Gateway)",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1800);
      }
    } catch (err) {
      console.error("Razorpay simulation error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 text-xs text-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Razorpay Brand Header */}
        <div className="bg-[#0c2340] text-white p-4 sm:p-5 flex items-center justify-between relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#3399cc]/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-base text-[#528ff0] shadow-inner">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white">TenoPilot Technologies</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-[9px] font-mono">
                  Verified Merchant
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {plan === "PRO_MONTHLY" ? "TenoPilot Pro (1 Month Renewal)" : "TenoPilot Pro (1 Year Plan)"}
              </p>
            </div>
          </div>

          <div className="text-right relative z-10 flex items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">Total Amount</span>
              <span className="text-lg font-black text-white font-mono">₹{amount.toLocaleString("en-IN")}.00</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isSuccess ? (
          /* Payment Success View */
          <div className="p-8 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-500/20 animate-in bounce-in">
              ✓
            </div>
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                Payment Successful
              </span>
              <h3 className="text-xl font-black text-slate-900 font-serif">Pro Plan Activated!</h3>
              <p className="text-xs text-slate-500">
                Your payment of ₹{amount.toLocaleString("en-IN")} was processed via Razorpay.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5 font-mono text-[11px] text-slate-600 max-w-sm mx-auto">
              <div className="flex justify-between">
                <span>Payment ID:</span>
                <strong className="text-slate-900">{paymentId}</strong>
              </div>
              <div className="flex justify-between">
                <span>Order ID:</span>
                <strong className="text-slate-900">{orderId}</strong>
              </div>
              <div className="flex justify-between">
                <span>Plan Duration:</span>
                <strong className="text-emerald-700">{plan === "PRO_MONTHLY" ? "+30 Days" : "+365 Days"} Stacked</strong>
              </div>
            </div>

            <p className="text-[11px] text-emerald-700 font-semibold animate-pulse">
              Unlocking your workspace and updating real-time countdown...
            </p>
          </div>
        ) : (
          /* Payment Methods & Simulator Form */
          <div className="p-5 sm:p-6 space-y-5 flex-1">
            {/* Sandbox Notice Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  ⚙️
                </span>
                <div>
                  <p className="font-bold text-blue-950 text-[11px]">Razorpay Payment Gateway Mockup</p>
                  <p className="text-[10px] text-blue-800">
                    Test automated gateway checkout & instant webhook activation.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-200 text-blue-900 text-[9px] font-black uppercase shrink-0">
                Test Mode
              </span>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("UPI")}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold cursor-pointer transition-all ${
                  activeTab === "UPI"
                    ? "bg-[#0c2340] text-white border-[#0c2340] shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI (Instant)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("CARD")}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold cursor-pointer transition-all ${
                  activeTab === "CARD"
                    ? "bg-[#0c2340] text-white border-[#0c2340] shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("NETBANKING")}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold cursor-pointer transition-all ${
                  activeTab === "NETBANKING"
                    ? "bg-[#0c2340] text-white border-[#0c2340] shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>NetBanking</span>
              </button>
            </div>

            {/* Tab 1: UPI Options */}
            {activeTab === "UPI" && (
              <div className="space-y-3 animate-in fade-in">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                  Select Preferred UPI App
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "gpay", name: "Google Pay", icon: "🟢" },
                    { id: "phonepe", name: "PhonePe", icon: "🟣" },
                    { id: "paytm", name: "Paytm UPI", icon: "🔵" },
                  ].map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedUpiApp(app.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        selectedUpiApp === app.id
                          ? "bg-blue-50/70 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-400/30"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="text-xl">{app.icon}</span>
                      <span className="text-[11px]">{app.name}</span>
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-between text-[11px]">
                  <span>Paying VPA: <strong>{customerPhone}@okhdfcbank</strong></span>
                  <span className="text-emerald-600 font-bold">Auto-Detected</span>
                </div>
              </div>
            )}

            {/* Tab 2: Cards Mockup */}
            {activeTab === "CARD" && (
              <div className="space-y-3 animate-in fade-in">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-[11px]">Card Number</label>
                  <input
                    type="text"
                    disabled
                    value="4242 •••• •••• 4242"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs text-slate-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Expiry</label>
                    <input
                      type="text"
                      disabled
                      value="12 / 28"
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">CVV</label>
                    <input
                      type="text"
                      disabled
                      value="•••"
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs text-slate-700"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: NetBanking Mockup */}
            {activeTab === "NETBANKING" && (
              <div className="space-y-2 animate-in fade-in">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                  Popular Indian Banks
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank"].map((bank, i) => (
                    <div
                      key={bank}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        i === 0 ? "bg-blue-50 border-blue-400 font-bold text-blue-900" : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <span>🏦</span>
                      <span className="text-[11px]">{bank}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>256-bit Encrypted • Razorpay Standard</span>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSimulatePayment}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing with Bank...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span>Simulate Payment (₹{amount.toLocaleString("en-IN")})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
