"use client";

import React, { useRef, useState } from "react";
import { Occupant, PaymentHistoryItem } from "@/constants/mockOccupants";
import { PropertySettingsData } from "@/constants/propertySettings";
import { Printer, Download, CheckCircle2, ShieldCheck, Building2, Calendar, CreditCard, User, Sparkles, X, FileText, Eye, ZoomIn, RotateCcw, AlertTriangle } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { resolveBillingCycleMonth } from "@/lib/pdfGenerator";

interface RentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptItem: PaymentHistoryItem;
  occupant: Occupant;
  propertySettings: PropertySettingsData;
  onVoidReceipt?: (receipt: PaymentHistoryItem) => void;
}

export const RentReceiptModal: React.FC<RentReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptItem,
  occupant,
  propertySettings,
  onVoidReceipt,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);

  if (!isOpen) return null;

  const isVoided = receiptItem.status === "VOIDED";

  const isDeposit =
    receiptItem.receiptNo.startsWith("DEP") ||
    receiptItem.month.toLowerCase().includes("deposit") ||
    Boolean(receiptItem.depositAmount && receiptItem.depositAmount > 0 && (!receiptItem.rentAmount || receiptItem.rentAmount === 0));

  const isSettlement =
    receiptItem.receiptNo.startsWith("REF") ||
    receiptItem.receiptNo.startsWith("SET") ||
    receiptItem.month.toLowerCase().includes("settlement") ||
    receiptItem.month.toLowerCase().includes("refund");

  const displayBillingMonth = resolveBillingCycleMonth(
    receiptItem.month,
    receiptItem.date,
    occupant.joiningDate
  );

  // Exact mappings:
  // 1. Security Deposit amount -> mapped to Deposit field
  const effectiveDepositAmount = receiptItem.depositAmount !== undefined
    ? receiptItem.depositAmount
    : isDeposit
    ? receiptItem.amount
    : 0;

  // 3. Parking charges -> mapped to Parking field
  const effectiveParkingAmount = receiptItem.parkingAmount || 0;

  // 4. Maintenance charges & penalties -> mapped to Maintenance field
  const effectiveMaintenanceAmount = receiptItem.maintenanceAmount || 0;

  // 2. Rent amount -> mapped to Rent field
  const effectiveRentAmount = receiptItem.rentAmount !== undefined
    ? receiptItem.rentAmount
    : isDeposit
    ? 0
    : Math.max(0, receiptItem.amount - effectiveDepositAmount - effectiveParkingAmount - effectiveMaintenanceAmount);

  const formattedAmount = Number(receiptItem.amount || 0).toLocaleString("en-IN");
  const pName = propertySettings.propertyName || "TenoPilot PG & Coliving";
  const pAddress = propertySettings.propertyAddress || "Premium Student & Professional Housing";
  const managerPhone = propertySettings.managerPhone || "+91 92066 51295";

  // 1-Click Print Handler using browser print media
  const handlePrint = () => {
    window.print();
  };

  // 1-Click Direct Vector PDF Download from TenoPilot Serverless PDF Engine
  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    const q = new URLSearchParams({
      receiptNo: receiptItem.receiptNo,
      propertyName: pName,
      propertyAddress: pAddress,
      managerPhone: managerPhone,
      residentName: occupant.name,
      roomNumber: occupant.roomNumber,
      bedCode: occupant.bedCode,
      amount: String(receiptItem.amount),
      paidDate: receiptItem.date,
      paymentMode: receiptItem.mode || "UPI",
      paidTo: receiptItem.paidTo || "Main Account",
      month: receiptItem.month,
      isDeposit: String(isDeposit),
      isSettlement: String(isSettlement),
      isVoided: String(isVoided),
      download: "true",
    });
    q.set("rentAmount", String(effectiveRentAmount));
    q.set("depositAmount", String(effectiveDepositAmount));
    q.set("parkingAmount", String(effectiveParkingAmount));
    q.set("maintenanceAmount", String(effectiveMaintenanceAmount));
    if (occupant.joiningDate) q.set("joiningDate", occupant.joiningDate);
    if (propertySettings.ownerName) q.set("ownerName", propertySettings.ownerName);
    // For base64 data URLs, avoid URL overflow in GET query string; the server fetches signatureUrl directly from Firestore settings
    if (propertySettings.signatureUrl && (propertySettings.signatureUrl.startsWith("http://") || propertySettings.signatureUrl.startsWith("https://"))) {
      q.set("signatureUrl", propertySettings.signatureUrl);
    }

    const url = `/api/receipt/pdf?${q.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${receiptItem.receiptNo}_${occupant.name.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setIsGeneratingPdf(false), 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      {/* Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar (Hidden during window.print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center shadow-md">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Official Electronic Receipt</h3>
              <p className="text-[11px] text-slate-400 font-mono">{receiptItem.receiptNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isVoided && onVoidReceipt && (
              <button
                type="button"
                onClick={() => onVoidReceipt(receiptItem)}
                className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Void or Correct this Receipt"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Void / Replace</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Print Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="Download as PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? "Creating PDF..." : "Download PDF"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Canvas */}
        <div className="p-3 sm:p-6 bg-slate-100/70 max-h-[82vh] overflow-y-auto">
          {/* Authentic Traditional Double-Bordered Receipt Slip */}
          <div
            ref={receiptRef}
            className="bg-white p-2 sm:p-3 border-2 border-slate-900 shadow-md relative overflow-hidden max-w-2xl mx-auto"
            style={{ minHeight: "640px" }}
          >
            {/* Inner Border of Double Border */}
            <div className="border border-slate-900 p-5 sm:p-7 relative">
              {/* VOIDED Diagonal Watermark */}
              {isVoided && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none">
                  <span className="text-red-500/15 font-black text-5xl sm:text-6xl -rotate-45 tracking-widest border-8 border-red-500/15 p-6 rounded-3xl uppercase">
                    VOIDED / CANCELLED
                  </span>
                </div>
              )}

              {/* VOIDED Notice Banner */}
              {isVoided && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs text-rose-950">CANCELLED / VOIDED RECEIPT</p>
                    <p className="text-[11px] text-rose-800">
                      Cancelled in property records{receiptItem.voidedAt ? ` on ${new Date(receiptItem.voidedAt).toLocaleDateString("en-IN")}` : ""}.
                      {receiptItem.voidReason ? ` Reason: ${receiptItem.voidReason}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Item 1: PG Name (Centered, bold uppercase) */}
              <h1 className="text-lg sm:text-2xl font-serif font-black text-slate-950 uppercase tracking-wide text-center">
                {pName}
              </h1>

              {/* Item 2: Property Address (Centered) */}
              <p className="text-xs text-slate-700 text-center max-w-lg mx-auto mt-1 leading-relaxed">
                {pAddress}
              </p>

              {/* Item 3: Mob Contact (Centered) */}
              <p className="font-bold text-xs text-[#142952] text-center mt-1">
                Mob : {managerPhone}
              </p>

              {/* Crisp Dividing Rule */}
              <div className="border-b border-slate-700 my-3.5" />

              {/* Receipt Meta Row: Receipt No | Room | Date */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-bold text-slate-900 mb-3.5 px-1">
                <div>Receipt No.: <span className="font-mono text-slate-800">{receiptItem.receiptNo}</span></div>
                <div>Room: <span className="font-mono text-slate-800">{occupant.roomNumber} ({occupant.bedCode})</span></div>
                <div>Date: <span className="font-mono text-slate-800">{receiptItem.date}</span></div>
              </div>

              {/* Pill Subheader Banner: [ GUEST DETAILS / RESIDENT DETAILS / SETTLEMENT DETAILS ] */}
              <div className="flex justify-center mb-4">
                <div className="px-5 py-1 bg-[#142952] text-white text-[11px] font-black uppercase tracking-wider rounded-md shadow-2xs">
                  {isDeposit ? "SECURITY DEPOSIT DETAILS" : "GUEST DETAILS"}
                </div>
              </div>

              {/* Resident Demographics (Omitted Residential Address, Office Address & Check-in Date per user red strike-outs) */}
              <div className="space-y-2.5 mb-5 px-1">
                <div className="flex items-baseline border-b border-slate-300 pb-1">
                  <span className="font-bold text-xs sm:text-sm text-[#142952] shrink-0">Guest Name :</span>
                  <span className="font-bold text-xs sm:text-sm text-slate-900 ml-2.5 truncate">{occupant.name}</span>
                </div>
                <div className="flex items-baseline border-b border-slate-300 pb-1">
                  <span className="font-bold text-xs sm:text-sm text-[#142952] shrink-0">Billing Period :</span>
                  <span className="font-medium text-xs sm:text-sm text-slate-900 ml-2">{displayBillingMonth}</span>
                </div>
              </div>

              {/* Boxed Financial Grid (Hyphen '-' for zero values per user request) */}
              <div className="border border-slate-800 rounded-none overflow-hidden mb-5">
                <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300 p-2.5 bg-slate-50/60 text-xs">
                  <div>
                    <span className="font-bold text-[#142952]">Deposit : </span>
                    <span className="font-mono font-bold text-slate-900">
                      {effectiveDepositAmount > 0
                        ? `INR ${effectiveDepositAmount.toLocaleString("en-IN")}`
                        : "-"}
                    </span>
                  </div>
                  <div className="pl-3">
                    <span className="font-bold text-[#142952]">Rent : </span>
                    <span className="font-mono font-bold text-slate-900">
                      {effectiveRentAmount > 0
                        ? `INR ${effectiveRentAmount.toLocaleString("en-IN")}`
                        : "-"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300 p-2.5 bg-slate-50/60 text-xs">
                  <div>
                    <span className="font-bold text-[#142952]">Parking fee : </span>
                    <span className="font-mono font-bold text-slate-900">
                      {effectiveParkingAmount > 0
                        ? `INR ${effectiveParkingAmount.toLocaleString("en-IN")}`
                        : "-"}
                    </span>
                  </div>
                  <div className="pl-3">
                    <span className="font-bold text-[#142952]">Maintenance : </span>
                    <span className="font-medium text-slate-600">
                      {effectiveMaintenanceAmount > 0
                        ? `INR ${effectiveMaintenanceAmount.toLocaleString("en-IN")}`
                        : "-"}
                    </span>
                  </div>
                </div>
                {/* Total Received Highlight Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50 border-t border-emerald-300 text-xs sm:text-sm font-bold">
                  <span className="text-emerald-950 font-black">
                    TOTAL RECEIVED : <span className="font-mono font-black text-emerald-800">INR {formattedAmount}</span>
                  </span>
                  <span className="text-[11px] text-slate-700 font-medium">
                    Mode: <strong className="text-slate-900">{receiptItem.mode || "UPI"}</strong>
                  </span>
                </div>
              </div>

              {/* Item 4: Signatures Section (Brought down away from financial border) */}
              <div className="grid grid-cols-2 gap-6 sm:gap-10 pt-8 sm:pt-10 mb-8 sm:mb-10">
                {/* Box 4: Owners Signature */}
                <div>
                  <div className="h-14 flex items-end justify-center mb-1.5">
                    {propertySettings.signatureUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={propertySettings.signatureUrl}
                        alt="Owner Signature"
                        className="max-h-full max-w-[150px] object-contain"
                      />
                    ) : (
                      <span className="font-serif italic font-bold text-lg text-blue-900 tracking-wider">
                        {propertySettings.ownerName || pName}
                      </span>
                    )}
                  </div>
                  <div className="border-t border-slate-900 pt-1.5 text-center">
                    <p className="font-bold text-xs text-[#142952]">Owners Signature</p>
                    <p className="text-[9px] text-slate-500">
                      {propertySettings.ownerName ? `Authorized Signatory • ${propertySettings.ownerName}` : "Authorized Signatory • Property Management"}
                    </p>
                  </div>
                </div>

                {/* Guest Signature */}
                <div>
                  <div className="h-14 flex items-end justify-center mb-1.5">
                    {/* Empty space for tenant / resident to physically or digitally sign */}
                  </div>
                  <div className="border-t border-slate-900 pt-1.5 text-center">
                    <p className="font-bold text-xs text-[#142952]">Guest Signature</p>
                    <p className="text-[9px] text-slate-500">Tenant / Resident Confirmation</p>
                  </div>
                </div>
              </div>

              {/* Bottom Notice Board Rule */}
              <div className="border-t border-slate-400 pt-2 text-center text-[10px] sm:text-xs font-bold text-[#142952]">
                ★ Guests are subject to the rules and regulations outlined on the notice board. ★
              </div>

              {/* Income Tax HRA Exemption Micro-Declaration */}
              <div className="mt-2 text-center text-[8px] text-slate-400">
                Authentic electronic receipt issued via TenoPilot Property OS • Valid for Income Tax HRA Exemption under Sec 10(13A)
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* 🔍 Fullscreen Attached Payment Proof Lightbox Modal */}
      {showProofModal && receiptItem.screenshotUrl && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in select-none"
          onClick={() => setShowProofModal(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receiptItem.screenshotUrl}
              alt="Enlarged Payment Proof"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={receiptItem.screenshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={`Proof_${receiptItem.receiptNo}.jpg`}
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open Full Size</span>
              </a>
              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
