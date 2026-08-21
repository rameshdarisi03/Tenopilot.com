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
} from "lucide-react";
import {
  whatsappCreditStore,
  WHATSAPP_CREDIT_PACKAGES,
  WhatsAppCreditPackage,
  WhatsAppCreditTransaction,
} from "@/constants/whatsappCreditStore";

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
  const [credits, setCredits] = useState<number>(() => whatsappCreditStore.getCredits(propertyId));
  const [transactions, setTransactions] = useState<WhatsAppCreditTransaction[]>(() =>
    whatsappCreditStore.getTransactions(propertyId)
  );
  const [selectedPack, setSelectedPack] = useState<WhatsAppCreditPackage>(WHATSAPP_CREDIT_PACKAGES[1]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"RECHARGE" | "HISTORY">("RECHARGE");
  const [successToast, setSuccessToast] = useState<string | null>(null);

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

  if (!isOpen) return null;

  const handleSimulateRecharge = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newBal = whatsappCreditStore.addCredits(propertyId, selectedPack.credits, selectedPack.name);
    setCredits(newBal);
    setIsProcessing(false);
    setSuccessToast(`🎉 Successfully added +${selectedPack.credits} WhatsApp credits!`);
    onRechargeSuccess?.(newBal);

    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#059669] text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3.5 z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg tracking-tight">WhatsApp Cloud Gateway</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-emerald-200 text-[10px] font-bold tracking-wider uppercase">
                  Automated Meta API
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Send 1-click automated rent reminders, payment receipts & check-in invites
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Balance Banner */}
        <div className="bg-[#f0fdf4] border-b border-emerald-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Available Credits Balance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 font-mono tabular-nums">{credits}</span>
                <span className="text-xs font-bold text-emerald-700">Messages Available</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-200 shadow-2xs">
            <button
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

        {/* Success Alert */}
        {successToast && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "RECHARGE" ? (
            <>
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Select a WhatsApp Credit Package
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

              {/* Recharge Action Card */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h5 className="text-xs font-bold text-gray-900">
                    Recharge <span className="text-emerald-700 font-extrabold">{selectedPack.credits} Credits</span> ({selectedPack.name})
                  </h5>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Instant activation • No expiration • High deliverability via verified Meta Cloud API
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSimulateRecharge}
                  className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Pay ₹{selectedPack.priceInr} & Add Credits</span>
                    </>
                  )}
                </button>
              </div>

              {/* Highlights & Security */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">No WhatsApp Account Needed</span>
                    <span className="text-[11px] text-gray-500 block">
                      Messages dispatch automatically via TenoPilot's official Meta WhatsApp Cloud gateway.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-gray-800 block">1-Tap Bulk Reminders</span>
                    <span className="text-[11px] text-gray-500 block">
                      Select all unpaid tenants and notify them all with a single click in 5 seconds.
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Transaction & Delivery Logs
                </h4>
                <span className="text-[11px] text-gray-500 font-medium">
                  {transactions.length} total events
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-600">No message transactions recorded yet</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Automated WhatsApp reminders and receipts will appear here in real-time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {transactions.map((tx) => {
                    const isCreditAdd = tx.amount > 0;
                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 rounded-xl border border-gray-200 bg-white flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCreditAdd
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {isCreditAdd ? <Plus className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">{tx.description}</span>
                            <span className="text-[10px] text-gray-400 font-medium block">
                              {new Date(tx.timestamp).toLocaleString("en-IN")} • Status:{" "}
                              <span className="text-emerald-600 font-bold uppercase">{tx.status}</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono font-bold block ${
                              isCreditAdd ? "text-emerald-700" : "text-gray-900"
                            }`}
                          >
                            {isCreditAdd ? `+${tx.amount}` : `${tx.amount}`} Credits
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
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Powered by TenoPilot Meta WhatsApp Cloud Engine</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
