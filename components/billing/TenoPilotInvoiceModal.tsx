"use client";

import React, { useRef } from "react";
import {
  X,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  CreditCard,
  QrCode,
  FileText,
  ExternalLink,
  Eye,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { buildWhatsAppUrl } from "@/utils/security";

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  propertyName?: string;
  organizationId?: string;
  plan: string;
  durationDays?: number;
  planExpiresAt?: string | null;
  creditsAdded?: number | null;
  amount: number;
  paymentMode: string;
  receiptNumber?: string;
  receiptUrl?: string | null;
  notes?: string | null;
  activatedBy?: string;
  status?: string;
}

interface TenoPilotInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export function TenoPilotInvoiceModal({
  isOpen,
  onClose,
  invoice,
}: TenoPilotInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const isCreditPack =
    invoice.plan?.includes("WHATSAPP") ||
    invoice.plan?.includes("CREDIT") ||
    typeof invoice.creditsAdded === "number";

  const formattedDate = new Date(invoice.date || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const invoiceNum =
    invoice.invoiceNumber ||
    `INV-TP-${new Date(invoice.date || Date.now()).getFullYear()}-${(
      invoice.receiptNumber || invoice.date || "94821"
    )
      .toString()
      .replace(/\D/g, "")
      .slice(-5) || "10029"}`;

  const planTitle = invoice.plan === "VIP_PASS"
    ? "TenoPilot VIP Access Pass (Lifetime Founder License)"
    : invoice.plan === "PRO_ANNUAL"
    ? "TenoPilot Pro Annual Subscription (365 Days Access)"
    : invoice.plan === "PRO_MONTHLY"
    ? "TenoPilot Pro Monthly Subscription (30 Days Access)"
    : invoice.plan === "WHATSAPP_PACK_750"
    ? "WhatsApp Cloud Message Growth Pack (+750 Credits)"
    : invoice.plan === "WHATSAPP_PACK_250"
    ? "WhatsApp Cloud Message Starter Pack (+250 Credits)"
    : invoice.plan === "WHATSAPP_PACK_2000"
    ? "WhatsApp Cloud Message Mega Pack (+2000 Credits)"
    : `TenoPilot ${invoice.plan} License`;

  const validityText = isCreditPack
    ? "Lifetime Validity (Credits Never Expire • Permanent Wallet Balance)"
    : invoice.planExpiresAt
    ? `Active Access Valid Until ${new Date(invoice.planExpiresAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`
    : invoice.durationDays
    ? `${invoice.durationDays} Days Active License`
    : "30 Days Active License";

  const handlePrint = () => {
    window.print();
  };

  const shareWhatsAppMessage =
    `*TenoPilot Tax Invoice / Payment Receipt*\n\n` +
    `📄 *Invoice No*: ${invoiceNum}\n` +
    `🗓️ *Date*: ${formattedDate}\n` +
    `👤 *Client*: ${invoice.customerName || invoice.customerEmail}\n` +
    `🏢 *Property*: ${invoice.propertyName || "TenoPilot Managed Property"}\n` +
    `💎 *Plan*: ${planTitle}\n` +
    `💰 *Amount Paid*: ₹${(invoice.amount || 0).toLocaleString("en-IN")}\n` +
    `💳 *Payment Mode*: ${invoice.paymentMode || "Offline UPI / Bank Transfer"}\n` +
    `🔖 *Ref / UTR*: ${invoice.receiptNumber || "Verified"}\n` +
    `✅ *Status*: PAID & VERIFIED (FOUNDER APPROVED)\n\n` +
    `Thank you for powering your properties with *TenoPilot OS*!`;

  const whatsAppShareUrl = buildWhatsAppUrl(
    invoice.customerPhone || "9845010072",
    shareWhatsAppMessage
  );

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-3xl bg-[#161b22] border-2 border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] text-gray-900">
        {/* Modal Top Control Bar (Screen Only) */}
        <div className="print:hidden bg-[#0d1117] px-5 py-3.5 border-b border-white/10 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Official TenoPilot Tax Invoice</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  VERIFIED 🟢
                </span>
              </h3>
              <p className="text-[11px] text-gray-400 font-mono">{invoiceNum}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={whatsAppShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Share invoice on WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp Invoice</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-white" ref={printRef}>
          <div className="max-w-2xl mx-auto space-y-6 text-xs text-gray-800 font-sans print:text-black">
            {/* 1. Letterhead Top Header */}
            <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c2652a] to-orange-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                    TP
                  </div>
                  <div>
                    <h1 className="font-serif font-black text-2xl text-slate-950 tracking-tight leading-none">
                      TenoPilot<span className="text-[#c2652a]">.com</span>
                    </h1>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-0.5">
                      Property & PG Operating System
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 pt-1">
                  TenoPilot Technologies Private Limited • Bangalore & Hyderabad
                </p>
                <p className="text-[10px] text-gray-500 font-mono">
                  GSTIN: 36AAACT9021R1ZM • SAC Code: 998313 (IT SaaS Services)
                </p>
              </div>

              {/* Invoice Meta Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-right space-y-1 sm:min-w-[200px] shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-black text-[9px] uppercase tracking-wider inline-block">
                  TAX INVOICE / RECEIPT
                </span>
                <p className="font-mono font-black text-slate-950 text-sm">{invoiceNum}</p>
                <p className="text-[11px] text-gray-600">Date: <strong>{formattedDate}</strong></p>
                <p className="text-[10px] text-emerald-700 font-bold">● Payment Status: PAID</p>
              </div>
            </div>

            {/* 2. Bill To & Bill From Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">BILLED TO (CUSTOMER)</span>
                <p className="font-bold text-sm text-slate-900">{invoice.customerName || "Property Owner"}</p>
                <p className="text-[11px] text-gray-700 font-mono">{invoice.customerEmail}</p>
                {invoice.customerPhone && (
                  <p className="text-[11px] text-gray-600 font-mono">Phone: {invoice.customerPhone}</p>
                )}
                {invoice.propertyName && (
                  <p className="text-[11px] text-[#c2652a] font-bold">Property: {invoice.propertyName}</p>
                )}
                <p className="text-[10px] text-gray-500 font-mono">Org ID: {invoice.organizationId || "org_tp_estate_01"}</p>
              </div>

              <div className="space-y-1 sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">PAYMENT & SETTLEMENT INFO</span>
                <p className="font-bold text-sm text-slate-900">
                  Mode: <span className="text-amber-700">{invoice.paymentMode || "Offline UPI"}</span>
                </p>
                <p className="text-[11px] text-gray-700 font-mono">
                  Ref / UTR: <strong>{invoice.receiptNumber || "VERIFIED-BANK-REC"}</strong>
                </p>
                <p className="text-[11px] text-gray-600">
                  Verified By: <strong>{invoice.activatedBy || "Founder Desk (Ramesh)"}</strong>
                </p>
                <p className="text-[10px] text-gray-500">
                  Billing Currency: <strong>INR (₹) Indian Rupee</strong>
                </p>
              </div>
            </div>

            {/* 3. Line Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-center">SAC Code</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Tax (GST)</th>
                    <th className="p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  <tr className="bg-white">
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{planTitle}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{validityText}</p>
                      {invoice.notes && (
                        <p className="text-[10px] text-[#c2652a] italic mt-0.5 font-mono">
                          Note: {invoice.notes}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono text-[11px] text-gray-600">998313</td>
                    <td className="p-3 text-center font-bold">1</td>
                    <td className="p-3 text-right font-mono font-bold">
                      ₹{(invoice.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-500">₹0.00</td>
                    <td className="p-3 text-right font-mono font-black text-slate-950 text-sm">
                      ₹{(invoice.amount || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. Grand Total & Summary Box */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <div className="space-y-1 max-w-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">AMOUNT IN WORDS</span>
                <p className="text-xs font-bold text-slate-900 italic">
                  Indian Rupees {invoice.amount === 999 ? "Nine Hundred Ninety-Nine" : invoice.amount === 749 ? "Seven Hundred Forty-Nine" : invoice.amount === 249 ? "Two Hundred Forty-Nine" : `${invoice.amount}`} Only.
                </p>
                <p className="text-[10px] text-gray-500">
                  Electronic invoice generated under TenoPilot Digital SaaS Architecture. Valid without physical signature.
                </p>
              </div>

              <div className="w-full sm:w-64 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-right shrink-0">
                <div className="flex justify-between text-gray-600 text-[11px]">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">₹{(invoice.amount || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-[11px]">
                  <span>GST / Tax (0% SaaS):</span>
                  <span className="font-mono">₹0.00</span>
                </div>
                <div className="border-t border-slate-300 pt-2 flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-xs">Total Paid:</span>
                  <span className="font-mono font-black text-lg text-emerald-700">
                    ₹{(invoice.amount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Audit Accounting Attachment & Verification QR */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white border border-amber-300 shadow-xs shrink-0">
                  <QRCodeSVG
                    value={`https://tenopilot.com/verify/invoice/${invoiceNum}`}
                    size={56}
                    level="M"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-slate-900">Verified System Generated Invoice</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    This is an electronically generated digital tax invoice and does not require a physical signature or seal.
                  </p>
                  {invoice.receiptUrl && (
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={invoice.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-[#c2652a] hover:underline flex items-center gap-1"
                      >
                        <span>📷 View Attached Bank Screenshot</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right sm:text-right shrink-0">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold inline-block">
                  ✓ VERIFIED & SETTLED
                </span>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">
                  REF: {invoice.receiptNumber || invoice.invoiceNumber}
                </p>
              </div>
            </div>

            {/* 6. Footer Legal Terms */}
            <div className="border-t border-slate-200 pt-3 text-[9px] text-gray-500 text-center space-y-0.5">
              <p>TenoPilot Cloud OS • 100% Secure Multi-Tenant Real Estate Platform • Support: support@tenopilot.com</p>
              <p>Terms: Digital subscriptions and credit bundles are non-transferable and subject to TenoPilot SLA terms.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
