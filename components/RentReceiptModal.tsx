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

function formatSmartAddress(address: string): string[] {
  if (!address) return [];
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [address];
  if (parts.length === 2) return [`${parts[0]},`, parts[1]];
  if (parts.length === 3) return [`${parts[0]}, ${parts[1]},`, parts[2]];
  const mid = Math.ceil(parts.length / 2);
  const line1 = parts.slice(0, mid).join(', ') + ',';
  const line2 = parts.slice(mid).join(', ');
  return [line1, line2];
}

function getPgNameClass(name: string): string {
  if (!name) return "text-xl sm:text-2xl";
  if (name.length <= 18) return "text-xl sm:text-2xl";
  if (name.length <= 26) return "text-lg sm:text-xl";
  if (name.length <= 38) return "text-base sm:text-lg";
  return "text-sm sm:text-base";
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

  const isGuest =
    occupant.stayType === "Guest" ||
    receiptItem.receiptNo.startsWith("REF-GUEST") ||
    receiptItem.receiptNo.startsWith("RCP-GUEST") ||
    receiptItem.receiptNo.includes("GUEST") ||
    receiptItem.month?.toLowerCase().includes("guest") ||
    receiptItem.month?.toLowerCase().includes("stay");

  const checkInDate = occupant.joiningDate || receiptItem.date;
  const checkOutDate = occupant.guestCheckoutDate || occupant.vacatingDate || occupant.dueDate || "";
  const stayDays = occupant.stayDurationDays || (checkInDate && checkOutDate ? Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24))) : undefined);
  const dailyRate = occupant.rentAmount && stayDays ? Math.round(occupant.rentAmount / stayDays) : undefined;
  const totalStayAmount = occupant.rentAmount || receiptItem.amount;

  const earlierPay = occupant.paymentHistory?.find(p => p.receiptNo !== receiptItem.receiptNo && p.status !== "VOIDED");
  const initPay = isSettlement
    ? (earlierPay ? earlierPay.amount : Math.max(0, totalStayAmount - receiptItem.amount))
    : receiptItem.amount;
  const initPayDate = isSettlement
    ? (earlierPay ? earlierPay.date : (occupant.joiningDate || checkInDate))
    : receiptItem.date;
  const balDue = !isSettlement && receiptItem.amount < totalStayAmount
    ? Math.max(0, totalStayAmount - receiptItem.amount)
    : 0;
  const isPartial = !isSettlement && receiptItem.amount < totalStayAmount;
  const totalCharges = totalStayAmount + ((receiptItem.additionalCharges as any[]) || []).reduce((acc: number, c: any) => acc + (c.amount || 0), 0);

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
    if (isGuest) {
      q.set("isGuest", "true");
      q.set("stayType", "Guest");
      q.set("guestMobile", occupant.phone || "");
      q.set("purpose", occupant.purposeOfVisit || (isSettlement ? "Short Stay - Final Settlement" : "Short Stay"));
      if (checkInDate) q.set("checkInDate", checkInDate);
      if (checkOutDate) q.set("checkOutDate", checkOutDate);
      if (stayDays) q.set("stayDurationDays", String(stayDays));
      if (dailyRate) q.set("dailyRate", String(dailyRate));
      q.set("totalStayAmount", String(totalStayAmount));
      q.set("totalTariff", String(totalStayAmount));
      q.set("totalPaid", String(receiptItem.amount));
      q.set("initialPayment", String(initPay));
      if (initPayDate) q.set("initialPaymentDate", initPayDate);
      if (isSettlement) {
        q.set("finalPayment", String(receiptItem.amount));
        q.set("finalPaymentDate", receiptItem.date);
      }
      q.set("balanceDue", String(balDue));
      if (receiptItem.additionalCharges && (receiptItem.additionalCharges as any[]).length > 0) {
        q.set("additionalCharges", JSON.stringify(receiptItem.additionalCharges));
      }
    }
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
          {isGuest ? (
            /* 🟣 Dedicated Modern Purple Guest Stay Receipt Canvas */
            <div
              ref={receiptRef}
              className="bg-white rounded-3xl border border-violet-200 shadow-xl relative overflow-hidden p-6 sm:p-9 max-w-2xl mx-auto flex flex-col justify-between"
              style={{ minHeight: "740px" }}
            >
              {/* Soft modern corner waves matching the approved design */}
              <div className="absolute top-0 right-0 w-48 h-32 bg-[radial-gradient(circle_at_100%_0%,#c4b5fd_0%,#ddd6fe_45%,#ede9fe_70%,transparent_100%)] opacity-60 pointer-events-none rounded-bl-full" />
              <div className="absolute bottom-0 left-0 w-48 h-32 bg-[radial-gradient(circle_at_0%_100%,#c4b5fd_0%,#ddd6fe_45%,#ede9fe_70%,transparent_100%)] opacity-50 pointer-events-none rounded-tr-full" />

              {/* VOIDED Diagonal Watermark */}
              {isVoided && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 select-none">
                  <span className="text-red-500/15 font-black text-5xl sm:text-6xl -rotate-45 tracking-widest border-8 border-red-500/15 p-6 rounded-3xl uppercase">
                    VOIDED / CANCELLED
                  </span>
                </div>
              )}

              <div className="relative z-10">
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

                {/* 1. Header Bar: PG Hero on Left, STAY RECEIPT on Right */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_270px] gap-5 items-start pb-5 border-b border-slate-100 mb-5">
                  {/* Left: PG Hero Information */}
                  <div className="flex items-start gap-3.5 max-w-sm">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-violet-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20 mt-0.5">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <h1 className={`font-extrabold text-slate-900 tracking-tight leading-tight ${getPgNameClass(pName)}`}>
                        {pName}
                      </h1>
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-500 mt-1 leading-snug">
                        <span className="text-violet-600 shrink-0 mt-0.5 font-bold">📍</span>
                        <div className="flex flex-col">
                          {formatSmartAddress(pAddress).map((l, i) => (
                            <span key={i}>{l}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-700 font-semibold mt-1">
                        <span className="text-violet-600 shrink-0 font-bold">📞</span>
                        <span>{managerPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stay Receipt Title & Meta */}
                  <div className="flex flex-col sm:items-end">
                    <h2 className="text-xl sm:text-2xl font-black text-indigo-700 tracking-wider uppercase mb-1">
                      STAY RECEIPT
                    </h2>
                    <span className="inline-block px-3 py-0.5 bg-violet-100 text-violet-800 text-[10.5px] font-bold rounded-full mb-3 tracking-wide">
                      {isSettlement ? "Final Settlement" : "Short Stay / Day Stay"}
                    </span>
                    <div className="w-full text-[11.5px] space-y-1">
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-slate-500 font-medium">Receipt No.</span>
                        <span className="font-mono font-bold text-slate-900">{receiptItem.receiptNo}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-slate-500 font-medium">Issued On</span>
                        <span className="font-semibold text-slate-900">{receiptItem.date}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-slate-500 font-medium">Payment Mode</span>
                        <span className="font-semibold text-slate-900">{receiptItem.mode || "UPI"}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-slate-500 font-medium">Purpose</span>
                        <span className="px-2 py-0.5 bg-violet-100 text-violet-800 text-[10px] font-bold rounded">
                          {occupant.purposeOfVisit || (isSettlement ? "Short Stay - Final Settlement" : "Short Stay")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Dual Cards: Guest Details & Stay Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  {/* Guest Details Card */}
                  <div className="border border-violet-100 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="bg-violet-50/80 border-b border-violet-100 px-3.5 py-1.5 flex items-center gap-2 text-violet-900 font-bold text-xs">
                      <User className="w-3.5 h-3.5 text-violet-600" />
                      <span>Guest Details</span>
                    </div>
                    <div className="p-3 text-xs space-y-1.5">
                      <div className="flex items-baseline">
                        <span className="w-20 text-slate-500 font-medium">Name</span>
                        <span className="text-slate-400 mr-2">:</span>
                        <span className="font-bold text-slate-900">{occupant.name}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-20 text-slate-500 font-medium">Mobile</span>
                        <span className="text-slate-400 mr-2">:</span>
                        <span className="font-mono font-bold text-slate-900">{occupant.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stay Details Card */}
                  <div className="border border-violet-100 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="bg-violet-50/80 border-b border-violet-100 px-3.5 py-1.5 flex items-center gap-2 text-violet-900 font-bold text-xs">
                      <Calendar className="w-3.5 h-3.5 text-violet-600" />
                      <span>Stay Details</span>
                    </div>
                    <div className="p-3 text-xs space-y-1.5">
                      <div className="flex items-baseline">
                        <span className="w-22 text-slate-500 font-medium">Check-in</span>
                        <span className="text-slate-400 mr-2">:</span>
                        <span className="font-bold text-slate-900">{checkInDate}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-22 text-slate-500 font-medium">Check-out</span>
                        <span className="text-slate-400 mr-2">:</span>
                        <span className="font-bold text-slate-900">{checkOutDate}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-22 text-slate-500 font-medium">Room</span>
                        <span className="text-slate-400 mr-2">:</span>
                        <span className="font-bold text-slate-900">{occupant.roomNumber} ({occupant.bedCode})</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-22 text-slate-500 font-medium">No. of Days</span>
                        <span className="text-slate-400 mr-2">:</span>
                        <span className="font-bold text-slate-900">{stayDays || 1} Days</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Itemized Charges & Ledger Table */}
                <div className="border border-violet-100 rounded-xl overflow-hidden mb-5">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-violet-50/90 border-b border-violet-100 text-violet-900 font-bold text-[11px]">
                        <th className="py-2.5 px-4 w-[45%]">Description</th>
                        <th className="py-2.5 px-3 text-center w-[18%]">Qty / Days</th>
                        <th className="py-2.5 px-3 text-right w-[18%]">Rate (per Day)</th>
                        <th className="py-2.5 px-4 text-right w-[19%]">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                      <tr className="bg-white">
                        <td className="py-2.5 px-4 font-bold text-slate-900">Room Stay ({occupant.roomNumber} - {occupant.bedCode})</td>
                        <td className="py-2.5 px-3 text-center">{stayDays || 1} Days</td>
                        <td className="py-2.5 px-3 text-right">₹{Number(dailyRate || 0).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">₹{Number(totalStayAmount).toLocaleString("en-IN")}</td>
                      </tr>

                      {/* Extensible Additional Charges if any */}
                      {receiptItem.additionalCharges && (receiptItem.additionalCharges as any[]).map((addon: any, idx: number) => (
                        <tr key={idx} className="bg-white">
                          <td className="py-2.5 px-4 font-bold text-slate-900">{addon.description}</td>
                          <td className="py-2.5 px-3 text-center">{addon.qty || 1}</td>
                          <td className="py-2.5 px-3 text-right">{addon.rate ? `₹${Number(addon.rate).toLocaleString("en-IN")}` : "-"}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">₹{Number(addon.amount).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}

                      {receiptItem.additionalCharges && (receiptItem.additionalCharges as any[]).length > 0 && (
                        <tr className="bg-violet-50/60 font-bold text-violet-950 border-t border-violet-200">
                          <td colSpan={3} className="py-2 px-4">Total Bill Amount</td>
                          <td className="py-2 px-4 text-right">₹{Number(totalCharges).toLocaleString("en-IN")}</td>
                        </tr>
                      )}

                      {/* Ledger Rows */}
                      {isSettlement ? (
                        <>
                          <tr className="bg-slate-50/40 text-slate-600">
                            <td colSpan={3} className="py-2 px-4">Payment Received on {initPayDate}</td>
                            <td className="py-2 px-4 text-right font-bold text-slate-800">₹{Number(initPay).toLocaleString("en-IN")}</td>
                          </tr>
                          <tr className="bg-slate-50/40 text-slate-600">
                            <td colSpan={3} className="py-2 px-4">Final Payment Received on {receiptItem.date}</td>
                            <td className="py-2 px-4 text-right font-bold text-slate-800">₹{Number(receiptItem.amount).toLocaleString("en-IN")}</td>
                          </tr>
                          <tr className="bg-slate-50/40 text-slate-600">
                            <td colSpan={3} className="py-2 px-4">Balance Due</td>
                            <td className="py-2 px-4 text-right font-bold text-slate-800">₹0</td>
                          </tr>
                          <tr className="bg-violet-50 border-t border-violet-200 font-extrabold text-violet-950 text-sm">
                            <td colSpan={3} className="py-2.5 px-4">Total Paid (Settled)</td>
                            <td className="py-2.5 px-4 text-right text-violet-900 font-black">₹{Number(totalCharges).toLocaleString("en-IN")}</td>
                          </tr>
                        </>
                      ) : isPartial ? (
                        <>
                          <tr className="bg-slate-50/40 text-slate-600">
                            <td colSpan={3} className="py-2 px-4">Payment Received on {receiptItem.date}</td>
                            <td className="py-2 px-4 text-right font-bold text-slate-800">₹{Number(receiptItem.amount).toLocaleString("en-IN")}</td>
                          </tr>
                          <tr className="bg-rose-50/50 text-rose-700 font-bold">
                            <td colSpan={3} className="py-2 px-4">Balance Due</td>
                            <td className="py-2 px-4 text-right">₹{Number(balDue).toLocaleString("en-IN")}</td>
                          </tr>
                          <tr className="bg-violet-50 border-t border-violet-200 font-extrabold text-violet-950 text-sm">
                            <td colSpan={3} className="py-2.5 px-4">Total Paid</td>
                            <td className="py-2.5 px-4 text-right text-violet-900 font-black">₹{Number(receiptItem.amount).toLocaleString("en-IN")}</td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr className="bg-slate-50/40 text-slate-600">
                            <td colSpan={3} className="py-2 px-4">Payment Received on {receiptItem.date}</td>
                            <td className="py-2 px-4 text-right font-bold text-slate-800">₹{Number(totalCharges).toLocaleString("en-IN")}</td>
                          </tr>
                          <tr className="bg-slate-50/40 text-slate-600">
                            <td colSpan={3} className="py-2 px-4">Balance Due</td>
                            <td className="py-2 px-4 text-right font-bold text-slate-800">₹0</td>
                          </tr>
                          <tr className="bg-violet-50 border-t border-violet-200 font-extrabold text-violet-950 text-sm">
                            <td colSpan={3} className="py-2.5 px-4">Total Paid (Settled)</td>
                            <td className="py-2.5 px-4 text-right text-violet-900 font-black">₹{Number(totalCharges).toLocaleString("en-IN")}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. Summary Box & Status Pill */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3.5 bg-stone-50/90 border border-stone-200 rounded-xl mb-5">
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isSettlement ? "PAID (Settled)" : isPartial ? "PARTIALLY PAID" : "PAID (Full)"}</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 border-l border-slate-200 pl-3 leading-relaxed">
                    <p className="font-bold text-slate-900">
                      {isSettlement
                        ? "The stay has been fully settled."
                        : isPartial
                        ? `Advance of ₹${Number(receiptItem.amount).toLocaleString("en-IN")} received for the stay from ${checkInDate} to ${checkOutDate} (${stayDays || 1} Days).`
                        : "The stay has been fully paid upfront."}
                    </p>
                    <p>
                      {isSettlement
                        ? `Total amount of ₹${Number(totalCharges).toLocaleString("en-IN")} received for the stay from ${checkInDate} to ${checkOutDate} (${stayDays || 1} Days).`
                        : isPartial
                        ? `Remaining balance of ₹${Number(balDue).toLocaleString("en-IN")} is due at or before check-out.`
                        : `Full amount of ₹${Number(totalCharges).toLocaleString("en-IN")} received for the stay from ${checkInDate} to ${checkOutDate} (${stayDays || 1} Days). Zero balance remaining.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Footer: Disclaimer & Powered By Branding */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500 relative z-10">
                <div className="flex items-center gap-1.5 text-center sm:text-left">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>This is a computer-generated receipt for short stay accommodation and is valid without a physical signature.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400">Powered by</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/tenopilot_star_mark.jpg" alt="TenoPilot" className="w-4 h-4 rounded-xs object-cover" />
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 text-xs">Tenopilot<span className="text-violet-600">.com</span></span>
                    <p className="text-[8.5px] text-slate-400">PG Management Platform</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Authentic Traditional Double-Bordered Receipt Slip */
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
                  {isGuest
                    ? isSettlement
                      ? "GUEST CHECKOUT RECEIPT"
                      : "GUEST STAY INVOICE / RECEIPT"
                    : isSettlement
                    ? "SETTLEMENT & NO-DUES DETAILS"
                    : isDeposit
                    ? "SECURITY DEPOSIT DETAILS"
                    : "RESIDENT DETAILS"}
                </div>
              </div>

              {/* Resident / Guest Demographics */}
              <div className="space-y-2.5 mb-5 px-1">
                <div className="flex items-baseline border-b border-slate-300 pb-1">
                  <span className="font-bold text-xs sm:text-sm text-[#142952] shrink-0">{isGuest ? "Guest Name :" : "Resident Name :"}</span>
                  <span className="font-bold text-xs sm:text-sm text-slate-900 ml-2.5 truncate">{occupant.name}</span>
                </div>
                <div className="flex items-baseline border-b border-slate-300 pb-1">
                  <span className="font-bold text-xs sm:text-sm text-[#142952] shrink-0">{isGuest ? "Stay Period :" : "Billing Period :"}</span>
                  <span className="font-medium text-xs sm:text-sm text-slate-900 ml-2">
                    {isGuest
                      ? (checkInDate && checkOutDate ? `${checkInDate} to ${checkOutDate}${stayDays ? ` (${stayDays} Days Stay)` : ""}` : (receiptItem.month || "Short-term Stay"))
                      : displayBillingMonth}
                  </span>
                </div>
              </div>

              {/* Boxed Financial Grid */}
              {isGuest && isSettlement ? (
                <div className="border border-slate-800 rounded-none overflow-hidden mb-5">
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300 p-2.5 bg-slate-50/60 text-xs">
                    <div>
                      <span className="font-bold text-[#142952]">Total Stay Tariff : </span>
                      <span className="font-mono font-bold text-slate-900">INR {Number(occupant.rentAmount || receiptItem.amount).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="pl-3">
                      <span className="font-bold text-[#142952]">Total Received : </span>
                      <span className="font-mono font-bold text-emerald-800">INR {Number(receiptItem.amount).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300 p-2.5 bg-slate-50/60 text-xs">
                    <div>
                      <span className="font-bold text-[#142952]">Key & Handover : </span>
                      <span className="font-bold text-emerald-700">Returned & Cleared</span>
                    </div>
                    <div className="pl-3">
                      <span className="font-bold text-[#142952]">Deductions / Damages : </span>
                      <span className="font-medium text-slate-600">-</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border-t border-slate-300 text-xs sm:text-sm font-bold">
                    <span className="text-[#142952] font-black">
                      SETTLEMENT STATUS : <span className="font-mono font-black text-emerald-800">ZERO DUES / FULLY SETTLED</span>
                    </span>
                    <span className="text-[11px] text-slate-700 font-medium">
                      Status: <strong className="text-slate-900">Account Closed</strong>
                    </span>
                  </div>
                </div>
              ) : isGuest ? (
                <div className="border border-slate-800 rounded-none overflow-hidden mb-5">
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300 p-2.5 bg-slate-50/60 text-xs">
                    <div>
                      <span className="font-bold text-[#142952]">Stay Tariff : </span>
                      <span className="font-mono font-bold text-slate-900">INR {Number(effectiveRentAmount || receiptItem.amount).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="pl-3">
                      <span className="font-bold text-[#142952]">Daily Rate : </span>
                      <span className="font-mono font-bold text-slate-900">{dailyRate ? `INR ${dailyRate.toLocaleString("en-IN")} / day` : "-"}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300 p-2.5 bg-slate-50/60 text-xs">
                    <div>
                      <span className="font-bold text-[#142952]">Security Deposit : </span>
                      <span className="font-mono font-bold text-slate-900">
                        {effectiveDepositAmount > 0 ? `INR ${effectiveDepositAmount.toLocaleString("en-IN")}` : "-"}
                      </span>
                    </div>
                    <div className="pl-3">
                      <span className="font-bold text-[#142952]">Room / Bed : </span>
                      <span className="font-bold text-slate-800">Room {occupant.roomNumber} ({occupant.bedCode})</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50 border-t border-emerald-300 text-xs sm:text-sm font-bold">
                    <span className="text-emerald-950 font-black">
                      TOTAL RECEIVED : <span className="font-mono font-black text-emerald-800">INR {formattedAmount}</span>
                    </span>
                    <span className="text-[11px] text-slate-700 font-medium">
                      Mode: <strong className="text-slate-900">{receiptItem.mode || "UPI"}</strong>
                    </span>
                  </div>
                </div>
              ) : (
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
              )}

              {/* Item 4: Signatures Section */}
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
                    <p className="text-[9px] text-slate-500">{isGuest ? "Guest Acknowledgement" : "Tenant / Resident Confirmation"}</p>
                  </div>
                </div>
              </div>

              {/* Bottom Notice Board Rule */}
              <div className="border-t border-slate-400 pt-2 text-center text-[10px] sm:text-xs font-bold text-[#142952]">
                ★ Guests are subject to the rules and regulations outlined on the notice board. ★
              </div>

              {/* Income Tax HRA Exemption Micro-Declaration (Only for long-term tenants; omitted for guests) */}
              {!isGuest && (
                <div className="mt-2 text-center text-[8px] text-slate-400">
                  Authentic electronic receipt issued via TenoPilot Property OS • Valid for Income Tax HRA Exemption under Sec 10(13A)
                </div>
              )}
            </div>
          </div>
        )}
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
