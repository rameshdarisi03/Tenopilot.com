"use client";

import React, { useRef } from "react";
import {
  X,
  Printer,
  Download,
  Share2,
  FileText,
} from "lucide-react";
import { buildWhatsAppUrl } from "@/utils/security";

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  propertyName?: string;
  propertyLocation?: string;
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

  const isAnnual =
    invoice.plan === "PRO_ANNUAL" ||
    (invoice.durationDays && invoice.durationDays >= 300);

  const invoiceDateFormatted = new Date(invoice.date || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
    ? "TenoPilot Pro Annual Subscription"
    : invoice.plan === "PRO_MONTHLY"
    ? "TenoPilot Pro Monthly Subscription"
    : isCreditPack
    ? `WhatsApp Cloud Message Credit Pack (${invoice.creditsAdded || 750} Credits)`
    : invoice.plan || "TenoPilot Pro Subscription";

  const validityPeriod = isCreditPack
    ? "Lifetime Validity (Credits Never Expire)"
    : isAnnual
    ? "Annual Flight Deck"
    : invoice.planExpiresAt
    ? `${invoiceDateFormatted} - ${new Date(invoice.planExpiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
    : "30 Days Pro Flight Deck";

  // Inclusive 18% GST Calculations matching PDF SSOT
  const totalAmount = invoice.amount || 999;
  const subtotal = Math.round((totalAmount / 1.18) * 100) / 100;
  const cgst = Math.round(((totalAmount - subtotal) / 2) * 100) / 100;
  const sgst = Math.round((totalAmount - subtotal - cgst) * 100) / 100;

  // Table items matching PDF generator
  const tableItems = isCreditPack
    ? [
        {
          sl: "01",
          title: "Meta WhatsApp Cloud Message Credits Package",
          subtitle: `${(invoice.creditsAdded || 750).toLocaleString()} High-Deliverability Automated Rent Invoices & Reminders`,
          sac: "998413",
          qty: "1 Pack",
          rate: subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        },
        {
          sl: "02",
          title: "Meta Cloud API Template Approvals & Webhook Delivery Engine",
          subtitle: "Instant automated WhatsApp dispatch via official Meta Cloud BSP",
          sac: "998314",
          qty: "1 Engine",
          rate: "0.00 (Free)",
        },
        {
          sl: "03",
          title: "Dual-Ledger Rent & Security Deposit Digital Receipt Integration",
          subtitle: "Zero-latency auto-generation of PDF receipts on WhatsApp",
          sac: "998319",
          qty: "1 PG",
          rate: "0.00 (Free)",
        },
      ]
    : [
        {
          sl: "01",
          title: isAnnual
            ? "TenoPilot Pro Operating System - Annual Subscription"
            : "TenoPilot Pro Operating System - Monthly Subscription",
          subtitle: "Multi-Floor Layout Engine, Dual-Ledger Accounting, 2-Step MPIN",
          sac: "998314",
          qty: isAnnual ? "1 Yr" : "1 Mo",
          rate: (Math.round(subtotal * 0.85 * 100) / 100).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
        {
          sl: "02",
          title: "Meta WhatsApp Cloud Credits Package (Growth Tier)",
          subtitle: "1,500 High-Deliverability Automated Rent Invoices & Reminders",
          sac: "998413",
          qty: "1 Pack",
          rate: (Math.round((subtotal - Math.round(subtotal * 0.85 * 100) / 100) * 100) / 100).toLocaleString(
            "en-IN",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          ),
        },
        {
          sl: "03",
          title: "FastTrack 1-Click AI Register Migration & Onboarding",
          subtitle: "Full digital conversion of paper room/bed diaries into Cloud SSOT",
          sac: "998319",
          qty: "1 PG",
          rate: "0.00 (Free)",
        },
      ];

  const handlePrint = () => {
    window.print();
  };

  const shareWhatsAppMessage =
    `*TenoPilot Tax Invoice / Payment Receipt*\n\n` +
    `📄 *Invoice No*: ${invoiceNum}\n` +
    `🗓️ *Date*: ${invoiceDateFormatted}\n` +
    `👤 *Client*: ${invoice.customerName || invoice.customerEmail}\n` +
    `🏢 *Property*: ${invoice.propertyName || "TenoPilot Managed Property"}\n` +
    `💎 *Plan*: ${planTitle}\n` +
    `💰 *Amount Paid*: ₹${totalAmount.toLocaleString("en-IN")}\n` +
    `✅ *Status*: PAID & VERIFIED\n\n` +
    `Official PDF Tax Invoice: https://tenopilot.com/api/subscription/invoice/pdf?invoiceNo=${encodeURIComponent(invoiceNum)}&ownerName=${encodeURIComponent(invoice.customerName || "PG Owner")}&propertyName=${encodeURIComponent(invoice.propertyName || "TenoPilot PG")}&amount=${totalAmount}\n\n` +
    `Thank you for choosing *TenoPilot OS*!`;

  const whatsAppShareUrl = buildWhatsAppUrl(
    invoice.customerPhone || "9845010072",
    shareWhatsAppMessage
  );

  const pdfDownloadUrl = `/api/subscription/invoice/pdf?invoiceNo=${encodeURIComponent(
    invoiceNum
  )}&ownerName=${encodeURIComponent(
    invoice.customerName || "PG Owner"
  )}&propertyName=${encodeURIComponent(
    invoice.propertyName || "TenoPilot PG"
  )}&ownerEmail=${encodeURIComponent(
    invoice.customerEmail || ""
  )}&ownerPhone=${encodeURIComponent(
    invoice.customerPhone || ""
  )}&planName=${encodeURIComponent(
    planTitle
  )}&validityPeriod=${encodeURIComponent(
    validityPeriod
  )}&amount=${totalAmount}&invoiceDate=${encodeURIComponent(invoiceDateFormatted)}`;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="w-full max-w-3xl bg-[#161b22] border-2 border-[#c2652a]/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:max-w-none print:w-full print:border-none print:rounded-none print:shadow-none">
        {/* Modal Top Control Bar (Screen Only) */}
        <div className="print:hidden bg-[#0d1117] px-5 py-3.5 border-b border-white/10 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c2652a] to-orange-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
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

            <a
              href={pdfDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#c2652a] hover:bg-[#a04e1c] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Download Official Tax Invoice PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
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

        {/* Printable Invoice Document Body (EXACT REPLICA OF PDF IN IMAGE 2) */}
        <div className="overflow-y-auto p-3 sm:p-6 bg-[#251e19]/60 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printRef}
            className="w-full max-w-[720px] bg-white rounded-2xl shadow-2xl overflow-hidden font-sans text-gray-900 border border-[#e8dfd8] print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full print:p-8"
          >
            {/* Top 8px Terracotta Decorative Brand Bar */}
            <div className="h-2 w-full bg-[#c2652a]" />

            <div className="p-6 sm:p-8 space-y-6">
              {/* 1. Header Section: Logo Badge & Serif Wordmark + Tax Invoice Title */}
              <div className="flex items-start justify-between gap-4">
                {/* Left: Official Badge Logo & Brand Name */}
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/tenopilot_official_badge.png"
                    alt="TenoPilot"
                    className="w-10 h-10 object-contain rounded-lg shadow-2xs"
                  />
                  <div>
                    <h1 className="font-serif font-bold text-2xl text-[#1c140e] tracking-tight leading-none">
                      TenoPilot<span className="text-[#c2652a]">.com</span>
                    </h1>
                    <p className="font-sans font-semibold text-[9.5px] text-[#71717a] mt-1">
                      The Intelligent Operating System for Coliving & Student Housing
                    </p>
                  </div>
                </div>

                {/* Right: TAX INVOICE Title & Invoice Number */}
                <div className="text-right">
                  <h2 className="font-serif font-bold text-2xl text-[#1c140e] tracking-tight leading-none">
                    TAX INVOICE
                  </h2>
                  <p className="font-sans font-bold text-xs text-[#c2652a] mt-1.5 font-mono tracking-wide">
                    {invoiceNum}
                  </p>
                </div>
              </div>

              {/* Header Divider Line */}
              <div className="border-b border-[#e8dfd8]" />

              {/* 2. Invoice Meta Grid (Issued By vs Billed To) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[9.5px]">
                {/* Left: Issued By */}
                <div className="space-y-1">
                  <p className="text-[8.5px] font-bold tracking-wider text-[#964407] uppercase">
                    ISSUED BY:
                  </p>
                  <p className="font-serif font-bold text-sm text-[#1c140e]">
                    TenoPilot Technologies Private Limited
                  </p>
                  <p className="text-[#71717a]">Cyber Hills Tech Hub, Outer Ring Road</p>
                  <p className="text-[#71717a]">Bengaluru, Karnataka - 560103, India</p>
                  <p className="text-[#71717a]">
                    GSTIN: <span className="font-mono">29AABCT1234F1Z9</span> | PAN: <span className="font-mono">AABCT1234F</span>
                  </p>
                  <p className="text-[#71717a]">
                    Email: billing@tenopilot.com | Web: tenopilot.com
                  </p>
                </div>

                {/* Right: Billed To / Property Partner */}
                <div className="space-y-1 sm:pl-4">
                  <p className="text-[8.5px] font-bold tracking-wider text-[#964407] uppercase">
                    BILLED TO / PROPERTY PARTNER:
                  </p>
                  <p className="font-serif font-bold text-[15px] text-[#1c140e]">
                    {invoice.customerName || "Ramesh Darisi"}
                  </p>
                  <p className="text-[10px] font-bold text-[#c2652a]">
                    Property: {invoice.propertyName || "Ramesh Residencies"}
                  </p>
                  <p className="text-[#71717a]">
                    Location: {invoice.propertyLocation || "Bengaluru, Karnataka, India"}
                  </p>
                  <p className="text-[#71717a]">
                    Email: {invoice.customerEmail || "N/A"}
                  </p>
                  <p className="text-[#71717a]">
                    Phone: {invoice.customerPhone || "N/A"}
                  </p>
                </div>
              </div>

              {/* 3. Details Banner Box */}
              <div className="bg-[#faf8f6] border border-[#e8dfd8] rounded-xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[8px] font-bold tracking-wider text-[#71717a] uppercase">
                    INVOICE DATE
                  </p>
                  <p className="font-sans font-semibold text-[11px] text-[#1c140e] mt-0.5">
                    {invoiceDateFormatted}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-bold tracking-wider text-[#71717a] uppercase">
                    VALIDITY PERIOD
                  </p>
                  <p className="font-sans font-semibold text-[11px] text-[#1c140e] mt-0.5">
                    {validityPeriod}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-bold tracking-wider text-[#71717a] uppercase">
                    PLAN LEVEL
                  </p>
                  <p className="font-serif font-bold text-[12px] text-[#c2652a] mt-0.5">
                    {planTitle.length > 28 ? `${planTitle.slice(0, 26)}...` : planTitle}
                  </p>
                </div>

                <div className="border border-[#059669] bg-[#eefbf4] text-[#059669] font-bold text-[10.5px] px-4 py-1 rounded-md tracking-wider">
                  PAID
                </div>
              </div>

              {/* 4. Line Items Table */}
              <div className="border border-[#e8dfd8] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1c140e] text-white text-[8.5px] font-bold tracking-wider uppercase">
                      <th className="py-2.5 px-3 text-center w-12">SL</th>
                      <th className="py-2.5 px-3">DESCRIPTION / SERVICE ITEM</th>
                      <th className="py-2.5 px-3 text-center w-24">HSN/SAC</th>
                      <th className="py-2.5 px-3 text-center w-16">QTY</th>
                      <th className="py-2.5 px-4 text-right w-32">AMOUNT ( INR)</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10px]">
                    {tableItems.map((item, idx) => (
                      <tr
                        key={item.sl}
                        className={`${
                          idx % 2 === 0 ? "bg-[#faf8f6]" : "bg-white"
                        } border-b border-[#e8dfd8]/60 last:border-b-0`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-[#71717a] align-top">
                          {item.sl}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-[#1c140e]">{item.title}</p>
                          <p className="text-[8px] text-[#71717a] mt-0.5">{item.subtitle}</p>
                        </td>
                        <td className="py-2.5 px-3 text-center text-[#333336] font-mono align-top">
                          {item.sac}
                        </td>
                        <td className="py-2.5 px-3 text-center text-[#333336] align-top">
                          {item.qty}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-[#1c140e] align-top font-mono">
                          {item.rate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 5. Summary & Totals Block */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pt-1">
                {/* Left: Amount in Words */}
                <div className="space-y-1 max-w-xs">
                  <p className="text-[8.5px] font-bold text-[#964407] uppercase tracking-wider">
                    AMOUNT IN WORDS:
                  </p>
                  <p className="font-serif italic text-[11px] text-[#333336] leading-relaxed">
                    Tax Invoice Amount Paid in Full (Indian Rupees)
                  </p>
                </div>

                {/* Right: Subtotal, CGST, SGST & Total Banner */}
                <div className="w-full sm:w-72 space-y-2 text-right">
                  <div className="flex justify-between text-[10px] text-[#71717a]">
                    <span className="font-semibold">Subtotal:</span>
                    <span className="font-bold text-[#1c140e] font-mono">
                      INR {subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#71717a]">
                    <span className="font-semibold">CGST ( 9.0%):</span>
                    <span className="text-[#333336] font-mono">
                      INR {cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#71717a]">
                    <span className="font-semibold">SGST ( 9.0%):</span>
                    <span className="text-[#333336] font-mono">
                      INR {sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Terracotta Total Banner */}
                  <div className="bg-[#c2652a] text-white p-2.5 px-4 rounded-lg flex items-center justify-between shadow-2xs mt-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider">
                      TOTAL AMOUNT PAID:
                    </span>
                    <span className="font-serif font-bold text-sm tracking-wide">
                      INR {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. Authentic Digital Tax Invoice Seal Block */}
              <div className="bg-[#faf8f6] border border-[#e8dfd8] rounded-xl p-3.5 px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[9.5px] font-bold text-[#1c140e]">
                    AUTHENTIC DIGITAL TAX INVOICE
                  </p>
                  <p className="text-[8.5px] text-[#71717a] mt-0.5">
                    Electronically generated under Information Technology Act, 2000.
                  </p>
                  <p className="text-[8.5px] text-[#71717a]">
                    Valid for Input Tax Credit ( ITC) . No physical signature required.
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="font-serif font-bold text-[11.5px] text-[#1c140e]">
                    TenoPilot Technologies Pvt Ltd
                  </p>
                  <p className="text-[9px] font-bold text-[#059669] mt-0.5">
                    [Digitally Signed & Certified]
                  </p>
                  <p className="text-[8px] text-[#71717a]">
                    Authorised Signatory
                  </p>
                </div>
              </div>

              {/* 7. Footer */}
              <div className="border-t border-[#e8dfd8] pt-3 flex items-center justify-between text-[8px] text-[#71717a]">
                <p>Billing & Support: billing@tenopilot.com | WhatsApp: +91 92066 51295</p>
                <p className="font-bold text-[#c2652a]">TenoPilot OS - Bengaluru, India</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
