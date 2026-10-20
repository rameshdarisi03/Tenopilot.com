"use client";

import React, { useRef, useState } from "react";
import { Occupant, PaymentHistoryItem } from "@/constants/mockOccupants";
import { PropertySettingsData } from "@/constants/propertySettings";
import { Printer, Download, CheckCircle2, ShieldCheck, Building2, Calendar, CreditCard, User, Sparkles, X, FileText } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface RentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptItem: PaymentHistoryItem;
  occupant: Occupant;
  propertySettings: PropertySettingsData;
}

export const RentReceiptModal: React.FC<RentReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptItem,
  occupant,
  propertySettings,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  const isDeposit =
    receiptItem.receiptNo.startsWith("DEP") ||
    receiptItem.month.toLowerCase().includes("deposit");

  const formattedAmount = Number(receiptItem.amount || 0).toLocaleString("en-IN");
  const pName = propertySettings.propertyName || "TenoPilot PG & Coliving";
  const pAddress = propertySettings.propertyAddress || "Premium Student & Professional Housing";
  const managerPhone = propertySettings.managerPhone || "+91 92066 51295";

  // 1-Click Print Handler using browser print media
  const handlePrint = () => {
    window.print();
  };

  // 1-Click Direct Vector/Canvas PDF Download using jsPDF + html2canvas
  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const element = receiptRef.current;
      const canvas = await (html2canvas as any)(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${receiptItem.receiptNo}_${occupant.name.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      // Fallback to print dialog
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
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
        <div className="p-4 sm:p-8 bg-slate-50/50 max-h-[82vh] overflow-y-auto">
          <div
            ref={receiptRef}
            className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden"
            style={{ minHeight: "680px" }}
          >
            {/* Top Modern Colorful Header Accent */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500" />

            {/* Header: Brand & Meta */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100 mt-1">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                  <Building2 className="w-3 h-3 text-indigo-600" />
                  <span>Verified Coliving Property</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{pName}</h1>
                <p className="text-xs text-slate-500 max-w-sm mt-0.5 leading-relaxed">{pAddress}</p>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-medium text-slate-700">Desk Phone:</span> {managerPhone}
                </p>
              </div>

              {/* Receipt Tag / Badge */}
              <div className="sm:text-right">
                <span className="inline-block px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 text-emerald-800 font-mono font-black text-xs uppercase tracking-wider">
                  {isDeposit ? "SECURITY DEPOSIT RECEIPT" : "RENT PAYMENT RECEIPT"}
                </span>
                <div className="mt-2 text-xs text-slate-500">
                  <p className="font-semibold text-slate-900 font-mono text-sm">{receiptItem.receiptNo}</p>
                  <p className="mt-0.5 text-[11px]">Date: <span className="font-medium text-slate-700">{receiptItem.date}</span></p>
                  <p className="text-[11px]">Period: <span className="font-medium text-slate-700">{receiptItem.month}</span></p>
                </div>
              </div>
            </div>

            {/* Resident & Room Details 2-Column Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>Resident Profile</span>
                </p>
                <p className="text-sm font-black text-slate-900">{occupant.name}</p>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">{occupant.phone}</p>
                {occupant.email && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{occupant.email}</p>
                )}
                {occupant.workplace && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Org: <span className="font-semibold text-slate-700">{occupant.workplace}</span>
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>Accommodation Details</span>
                </p>
                <p className="text-sm font-black text-slate-900">
                  Room {occupant.roomNumber} <span className="text-slate-400 font-normal">/</span> Bed {occupant.bedCode}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tenancy: <span className="font-semibold text-slate-800">{occupant.stayType || "Resident"}</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Joined: <span className="font-semibold text-slate-700">{occupant.joiningDate || "Active"}</span>
                </p>
              </div>
            </div>

            {/* Financial Ledger Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span>Description of Charge</span>
                <span>Amount (INR)</span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {receiptItem.rentAmount !== undefined && receiptItem.depositAmount !== undefined && receiptItem.rentAmount > 0 && receiptItem.depositAmount > 0 ? (
                  <>
                    {/* Itemized Line 1: Rent */}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">
                          Monthly Accommodation & Room Rent ({receiptItem.month.replace(/\s*\+\s*Security Deposit/i, "")})
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Includes room tariff, electricity, high-speed WiFi, housekeeping & amenities
                        </p>
                      </div>
                      <div className="font-black text-slate-900 text-sm font-mono">
                        ₹{receiptItem.rentAmount.toLocaleString("en-IN")}
                      </div>
                    </div>

                    {/* Itemized Line 2: Security Deposit */}
                    <div className="px-4 py-3 flex items-center justify-between bg-purple-50/20">
                      <div>
                        <p className="font-bold text-purple-950">
                          Refundable Security Deposit (Lease Collateral)
                        </p>
                        <p className="text-[11px] text-purple-700/80 mt-0.5">
                          Collateral security deposit held per signed lease agreement terms (Refundable)
                        </p>
                      </div>
                      <div className="font-black text-purple-950 text-sm font-mono">
                        ₹{receiptItem.depositAmount.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">
                        {isDeposit ? "Refundable Security Deposit" : `Monthly Accommodation & Room Rent (${receiptItem.month})`}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isDeposit
                          ? "Collateral security held per signed lease agreement terms"
                          : `Includes room tariff, electricity, high-speed WiFi, housekeeping & amenities`}
                      </p>
                    </div>
                    <div className="font-black text-slate-900 text-sm font-mono">
                      ₹{formattedAmount}
                    </div>
                  </div>
                )}

                {/* Subtotal Row */}
                <div className="px-4 py-2.5 bg-slate-50/70 flex items-center justify-between font-semibold text-slate-600">
                  <span>Subtotal Amount:</span>
                  <span className="font-mono">₹{formattedAmount}</span>
                </div>

                {/* Grand Total Row */}
                <div className="px-4 py-3.5 bg-emerald-50/60 flex items-center justify-between border-t border-emerald-100">
                  <div>
                    <span className="text-xs font-black uppercase text-emerald-900 tracking-wider">
                      Total Paid & Settled
                    </span>
                    <p className="text-[10px] text-emerald-700 font-medium">Inclusive of all standard maintenance charges</p>
                  </div>
                  <span className="text-xl font-black text-emerald-700 font-mono tracking-tight">
                    ₹{formattedAmount}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Metadata & Payment Channel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Mode</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  {receiptItem.mode || "UPI Transfer"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Settled To</span>
                <span className="font-bold text-slate-800 truncate block mt-0.5">
                  {receiptItem.paidTo || "Main Business Pool"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Ledger Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fully Verified</span>
                </span>
              </div>
            </div>

            {/* Income Tax HRA Exemption Declaration Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/40 border border-blue-100 text-[11px] text-blue-900 mb-6 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-950">Income Tax HRA Exemption & Corporate Reimbursement Declaration</p>
                <p className="text-blue-800 mt-0.5 leading-relaxed text-[10px]">
                  This official electronic document certifies receipt of residential rent for the period stated above under Section 10(13A) of the Income Tax Act, 1961. This receipt is digitally generated and tamper-verified.
                </p>
              </div>
            </div>

            {/* Signature & Authentication Stamp Box */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              {/* Security Seal */}
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-emerald-500 bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-900">Digitally Verified</p>
                  <p className="text-[10px] text-slate-400 font-mono">TenoPilot SSOT Financial Ledger</p>
                </div>
              </div>

              {/* Manager Authorized Signatory Box */}
              <div className="text-center sm:text-right">
                <div className="h-8 flex items-end justify-center sm:justify-end">
                  <span className="font-serif italic text-sm text-slate-800 font-bold tracking-wider">
                    {propertySettings.propertyName || "Authorized Desk"}
                  </span>
                </div>
                <div className="border-t border-slate-300 w-44 mt-1 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Authorized Signatory
                  </p>
                  <p className="text-[9px] text-slate-400">Property Management & Accounts</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10.5px] text-slate-400">
              <span className="font-mono">Ref: {receiptItem.receiptNo} • Digitally Verified Electronic Receipt</span>
              <span className="font-medium text-slate-500">
                Powered by <a href="https://tenopilot.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">TenoPilot.com</a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
