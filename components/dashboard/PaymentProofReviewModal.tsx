"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  CreditCard,
  User,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldAlert,
  ZoomIn,
} from "lucide-react";

export interface PaymentProofRecord {
  id: string;
  propertyId: string;
  propertyName?: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  originalDueAmount: number;
  reportedAmount: number;
  isPartial?: boolean;
  remainingBalance?: number;
  utrNumber?: string;
  screenshotUrl?: string | null;
  tenantNote?: string | null;
  partnerId?: string;
  partnerName?: string;
  partnerPhone?: string;
  upiId?: string;
  status: "PENDING_VERIFICATION" | "APPROVED" | "REJECTED";
  createdAt: string;
  submittedAtFormatted?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

interface PaymentProofReviewModalProps {
  proof: PaymentProofRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onProceedToCollect: (proof: PaymentProofRecord, overrideAmount?: number, receivingAccount?: string) => void;
  onApproveAndCollect?: (proof: PaymentProofRecord, approvedAmount: number, receivingAccount: string) => Promise<void>;
  onRejectProof: (proofId: string, reason: string) => Promise<void>;
  paymentAccounts?: { id?: string; name: string }[];
  isApproving?: boolean;
}

export function PaymentProofReviewModal({
  proof,
  isOpen,
  onClose,
  onProceedToCollect,
  onApproveAndCollect,
  onRejectProof,
  paymentAccounts = [],
  isApproving = false,
}: PaymentProofReviewModalProps) {
  const [copiedUtr, setCopiedUtr] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [isEditingAmount, setIsEditingAmount] = useState(false);

  // Sync initial state whenever proof changes
  React.useEffect(() => {
    if (proof) {
      const baseAmt = proof.reportedAmount || proof.originalDueAmount || 0;
      setApprovedAmount(baseAmt);
      const acc = proof.partnerName || (paymentAccounts.length > 0 ? paymentAccounts[0].name : "PG Account");
      setSelectedAccount(acc);
      setShowRejectBox(false);
      setRejectReason("");
      setIsEditingAmount(false);
    }
  }, [proof, paymentAccounts]);

  if (!isOpen || !proof) return null;

  const handleCopyUtr = () => {
    if (!proof.utrNumber) return;
    navigator.clipboard.writeText(proof.utrNumber);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2000);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please enter a reason for rejecting this payment proof.");
      return;
    }
    setIsRejecting(true);
    try {
      await onRejectProof(proof.id, rejectReason.trim());
      setShowRejectBox(false);
      onClose();
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/60 via-white to-amber-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#c2652a] flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-gray-900">
                  Review Payment Proof
                </h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  proof.status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : proof.status === "REJECTED"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-300 animate-pulse"
                }`}>
                  {proof.status === "APPROVED" ? "VERIFIED" : proof.status === "REJECTED" ? "REJECTED" : "AWAITING REVIEW"}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {proof.tenantName} • <span className="font-bold text-gray-700">{proof.roomNumber}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
          {/* Screenshot Preview */}
          {proof.screenshotUrl ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-700">
                  Payment Screenshot
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  Tap image to enlarge
                </span>
              </div>
              <div className="relative group rounded-2xl overflow-hidden border border-gray-200 bg-gray-950 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proof.screenshotUrl}
                  alt="Payment Proof"
                  className="w-full max-h-60 object-contain cursor-pointer transition-transform hover:scale-[1.01]"
                  onClick={() => setIsZoomed(true)}
                />
                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black text-white text-[10px] font-bold flex items-center gap-1 shadow-md cursor-pointer transition-colors"
                >
                  <ZoomIn className="w-3 h-3" />
                  <span>Enlarge</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-300 text-center text-gray-400 text-xs">
              No screenshot attached • Verified by 12-digit UTR reference
            </div>
          )}

          {/* Tenant Remarks Card - Shown if resident entered a note */}
          {proof.tenantNote && (
            <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 flex items-start gap-2.5 shadow-2xs">
              <span className="text-base leading-none mt-0.5">💬</span>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 block">
                  Resident Note / Remarks
                </span>
                <p className="text-xs font-bold text-gray-900 mt-0.5 break-words">
                  &ldquo;{proof.tenantNote}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Payment Metadata Grid */}
          <div className="p-3.5 rounded-2xl bg-gray-50/90 border border-gray-200 space-y-2.5">
            {/* Amount Verification & In-place edit */}
            <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">
                  Amount Reported / Received
                </span>
                {isEditingAmount ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-bold text-gray-500 text-sm">₹</span>
                    <input
                      type="number"
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(Number(e.target.value) || 0)}
                      className="w-28 px-2 py-1 rounded-lg border border-orange-400 text-sm font-bold text-gray-900 focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditingAmount(false)}
                      className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-serif font-black text-lg text-gray-900">
                      ₹{approvedAmount.toLocaleString("en-IN")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingAmount(true)}
                      className="text-[10px] text-orange-600 hover:text-orange-700 underline font-semibold cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 block">Bill Due Amount</span>
                <span className="text-xs font-bold text-gray-600">
                  ₹{(proof.originalDueAmount || approvedAmount).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Show UTR only if an actual 12-digit UTR was provided */}
            {proof.utrNumber && proof.utrNumber !== "Screenshot Attached" && (
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/70">
                <span className="font-bold text-gray-600">UTR / Ref:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-gray-900 text-xs">
                    {proof.utrNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUtr}
                    className="p-1 rounded-md hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                    title="Copy UTR"
                  >
                    {copiedUtr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Receiving Account */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="font-bold text-gray-600">Paid To Account:</span>
              {paymentAccounts && paymentAccounts.length > 1 ? (
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 cursor-pointer focus:ring-1 focus:ring-orange-500"
                >
                  {paymentAccounts.map((acc, idx) => (
                    <option key={acc.id || idx} value={acc.name}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-bold text-gray-800 text-right">
                  {selectedAccount || proof.partnerName || "PG Account"}
                </span>
              )}
            </div>
          </div>

          {/* ⚠️ Rejection Reason Form */}
          {showRejectBox && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Specify Rejection Reason</span>
              </div>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Amount not received in bank, invalid UTR..."
                className="w-full px-3 py-2 rounded-xl border border-rose-300 text-xs text-gray-900 bg-white focus:ring-1 focus:ring-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
                  className="px-3 py-1.5 rounded-xl text-gray-600 hover:bg-rose-100/50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRejecting}
                  onClick={handleConfirmReject}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isRejecting ? "Rejecting..." : "Confirm Reject"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5 bg-gray-50/70">
          {!showRejectBox && (
            <button
              type="button"
              disabled={isApproving}
              onClick={() => setShowRejectBox(true)}
              className="py-2.5 px-3 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Reject Proof
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              disabled={isApproving}
              onClick={() => onProceedToCollect(proof, approvedAmount, selectedAccount)}
              className="py-2.5 px-3 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Open full form to customize dues or allocations"
            >
              Adjust in Full Form
            </button>

            {onApproveAndCollect ? (
              <button
                type="button"
                disabled={isApproving || approvedAmount <= 0}
                onClick={() => onApproveAndCollect(proof, approvedAmount, selectedAccount)}
                className="py-2.5 px-4 sm:px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              >
                {isApproving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Approve & Record Rent</span>
                    <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
                      ₹{approvedAmount.toLocaleString("en-IN")}
                    </span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onProceedToCollect(proof, approvedAmount, selectedAccount)}
                className="py-2.5 px-5 rounded-xl bg-[#c2652a] hover:bg-[#c2652a]/90 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <span>Proceed to Collect Rent</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🔍 Fullscreen Image Lightbox Modal */}
      {isZoomed && proof.screenshotUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proof.screenshotUrl}
              alt="Enlarged Proof"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute -top-10 right-0 text-white font-bold text-xs flex items-center gap-1 hover:text-orange-300"
            >
              <X className="w-5 h-5" />
              <span>Close Fullscreen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
