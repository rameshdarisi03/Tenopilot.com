"use client";

import { useState, useEffect } from "react";
import { PaymentHistoryItem, Occupant } from "@/constants/mockOccupants";
import { PropertySettingsData } from "@/constants/propertySettings";
import { generateReceiptNumber } from "@/lib/invoiceNumberEngine";
import { 
  Ban, 
  RotateCcw, 
  AlertTriangle, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Lock,
  ArrowRight
} from "lucide-react";

export interface VoidReceiptModalProps {
  isOpen: boolean;
  receipt: PaymentHistoryItem | null;
  occupant: Occupant | null;
  propertySettings: PropertySettingsData;
  propertyId: string;
  userProfile?: any;
  onClose: () => void;
  onSuccess: (updatedHistory: PaymentHistoryItem[], replacementReceipt?: PaymentHistoryItem) => void;
}

const COMMON_REASONS = [
  "Wrong billing amount entered",
  "Credited to wrong resident",
  "Duplicate entry / double recorded",
  "Incorrect rent or deposit split",
  "Wrong payment channel recorded",
];

export function VoidReceiptModal({
  isOpen,
  receipt,
  occupant,
  propertySettings,
  propertyId,
  userProfile,
  onClose,
  onSuccess,
}: VoidReceiptModalProps) {
  const [actionType, setActionType] = useState<"REPLACE" | "VOID_ONLY">("REPLACE");
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [correctedAmount, setCorrectedAmount] = useState<number>(0);
  const [correctedMode, setCorrectedMode] = useState<string>("UPI");
  const [securityPin, setSecurityPin] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (receipt) {
      setCorrectedAmount(receipt.amount || 0);
      setCorrectedMode(receipt.mode?.includes("Cash") ? "Cash" : receipt.mode?.includes("Bank") ? "Bank Transfer" : "UPI");
      setReason(COMMON_REASONS[0]);
      setCustomReason("");
      setSecurityPin("");
      setError("");
      setActionType("REPLACE");
    }
  }, [receipt]);

  if (!isOpen || !receipt || !occupant) return null;

  const effectiveReason = customReason.trim() ? customReason.trim() : reason;
  const userPin = userProfile?.securityPin;
  const requiresPin = Boolean(userPin && String(userPin).length >= 4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!effectiveReason) {
      setError("Please select or enter a cancellation reason.");
      return;
    }

    if (actionType === "REPLACE") {
      if (!correctedAmount || correctedAmount <= 0) {
        setError("Please enter a valid corrected billing amount greater than 0.");
        return;
      }
    }

    if (requiresPin) {
      if (!securityPin || securityPin.trim() !== String(userPin).trim()) {
        setError("Incorrect security MPIN. Please enter your valid 6-digit MPIN.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const staffName = userProfile?.displayName || userProfile?.name || "Property Manager";
      const staffRole = userProfile?.role === "master_admin" ? "Master Admin" : "Manager";

      let replacementReceipt: PaymentHistoryItem | undefined = undefined;
      let nextReceiptNo = "";

      if (actionType === "REPLACE") {
        // Generate next sequence number for replacement
        nextReceiptNo = generateReceiptNumber(propertySettings, {
          date: receipt.date || new Date(),
          propertyId,
          additionalExistingReceipts: [receipt.receiptNo],
        });

        // Determine itemized split if original had it
        let rentPart = receipt.rentAmount;
        let depositPart = receipt.depositAmount;
        if (receipt.month.toLowerCase().includes("deposit")) {
          depositPart = correctedAmount;
          rentPart = 0;
        } else if (receipt.rentAmount !== undefined && (receipt.depositAmount === undefined || receipt.depositAmount === 0)) {
          rentPart = correctedAmount;
          depositPart = 0;
        }

        replacementReceipt = {
          id: `rcpt_repl_${Date.now()}`,
          receiptNo: nextReceiptNo,
          month: receipt.month,
          date: receipt.date,
          amount: correctedAmount,
          rentAmount: rentPart,
          depositAmount: depositPart,
          parkingAmount: receipt.parkingAmount,
          mode: correctedMode,
          paidTo: receipt.paidTo,
          status: "PAID",
          replacesReceiptNo: receipt.receiptNo,
          screenshotUrl: receipt.screenshotUrl,
          proofId: receipt.proofId,
          collectedBy: {
            id: userProfile?.uid,
            name: staffName,
            role: staffRole,
            email: userProfile?.email,
          },
        };
      }

      // Mark the original receipt as VOIDED in place
      const existingHistory = occupant.paymentHistory || [];
      const updatedHistory = existingHistory.map((item) => {
        if (item.id === receipt.id || item.receiptNo === receipt.receiptNo) {
          return {
            ...item,
            status: "VOIDED" as const,
            voidReason: effectiveReason,
            voidedAt: nowIso,
            voidedBy: {
              id: userProfile?.uid,
              name: staffName,
              role: staffRole,
            },
            replacedByReceiptNo: nextReceiptNo || undefined,
          };
        }
        return item;
      });

      const finalHistory = replacementReceipt
        ? [replacementReceipt, ...updatedHistory]
        : updatedHistory;

      onSuccess(finalHistory, replacementReceipt);
      onClose();
    } catch (err: any) {
      console.error("Error voiding receipt:", err);
      setError(err?.message || "Failed to update receipt. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in select-none">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-lg w-full overflow-hidden my-auto animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Void & Correct Receipt</h3>
              <p className="text-[11px] font-mono font-semibold text-gray-500">
                {receipt.receiptNo} • ₹{receipt.amount.toLocaleString("en-IN")} • {occupant.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          
          {/* Audit Notice */}
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-amber-900 flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[11px]">Audit Safe Ledger Rule:</p>
              <p className="text-[11px] text-amber-800">
                Voided bills are never deleted; they are kept in internal records for accounting compliance. <strong>Cancelled receipts are never sent to residents.</strong>
              </p>
            </div>
          </div>

          {/* Action Switcher: Replace vs Void Only */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/80 rounded-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => setActionType("REPLACE")}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                actionType === "REPLACE"
                  ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Correct & Re-issue</span>
            </button>
            <button
              type="button"
              onClick={() => setActionType("VOID_ONLY")}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                actionType === "VOID_ONLY"
                  ? "bg-white text-rose-700 shadow-xs border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Ban className="w-3.5 h-3.5 text-rose-600" />
              <span>Void Only (Cancel)</span>
            </button>
          </div>

          {/* If REPLACE: Corrected Amount & Mode */}
          {actionType === "REPLACE" && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 text-xs">New Corrected Payment Details:</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Generates replacement bill</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1">
                    Correct Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={correctedAmount || ""}
                    onChange={(e) => setCorrectedAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white font-mono font-bold text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter correct amount"
                  />
                  <span className="text-[10px] text-gray-500 block mt-0.5">
                    Original was: ₹{receipt.amount.toLocaleString("en-IN")}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={correctedMode}
                    onChange={(e) => setCorrectedMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-semibold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="UPI">UPI Transfer</option>
                    <option value="Cash">Cash at Desk</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Reason for Cancellation (Mandatory) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-800">
              Reason for Cancellation *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setReason(r);
                    setCustomReason("");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                    reason === r && !customReason
                      ? "bg-rose-100 text-rose-800 border-rose-300 font-bold"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Or type specific reason (e.g. resident paid only partial rent)..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-rose-400 mt-1"
            />
          </div>

          {/* Security MPIN Check if configured */}
          {requiresPin && (
            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5">
              <label className="block text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-700" />
                <span>Enter 6-Digit MPIN to Authorize</span>
              </label>
              <input
                type="password"
                maxLength={6}
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-mono font-bold text-center tracking-widest text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <span className="text-[10px] text-gray-500 block text-center">
                Security check: Prevents unauthorized staff ledger tampering
              </span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 transition-colors cursor-pointer text-center text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-2.5 rounded-xl text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs ${
                actionType === "REPLACE"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800"
                  : "bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800"
              }`}
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : actionType === "REPLACE" ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Void & Re-issue (₹{correctedAmount.toLocaleString("en-IN")})</span>
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4" />
                  <span>Confirm Void Only</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
