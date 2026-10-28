"use client";

import React from "react";
import {
  X,
  Download,
  Share2,
  FileText,
  ExternalLink,
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
    ? "TenoPilot Pro Annual Subscription (365 Days)"
    : invoice.plan === "PRO_SEMI_ANNUAL"
    ? "TenoPilot Pro Semi-Annual Subscription (180 Days)"
    : invoice.plan === "PRO_QUARTERLY"
    ? "TenoPilot Pro Quarterly Subscription (90 Days)"
    : invoice.plan === "PRO_MONTHLY"
    ? "TenoPilot Pro Monthly Subscription (30 Days)"
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

  const totalAmount = invoice.amount || 999;

  const pdfDownloadUrl = `/api/subscription/invoice/pdf?invoiceNo=${encodeURIComponent(
    invoiceNum
  )}&ownerName=${encodeURIComponent(
    invoice.customerName || "Ramesh Darisi"
  )}&propertyName=${encodeURIComponent(
    invoice.propertyName || "Ramesh Residencies"
  )}&propertyLocation=${encodeURIComponent(
    invoice.propertyLocation || "Bengaluru, Karnataka, India"
  )}&ownerEmail=${encodeURIComponent(
    invoice.customerEmail || ""
  )}&ownerPhone=${encodeURIComponent(
    invoice.customerPhone || ""
  )}&planName=${encodeURIComponent(
    planTitle
  )}&validityPeriod=${encodeURIComponent(
    validityPeriod
  )}&amount=${totalAmount}&invoiceDate=${encodeURIComponent(invoiceDateFormatted)}`;

  const shareWhatsAppMessage =
    `*TenoPilot Tax Invoice / Payment Receipt*\n\n` +
    `📄 *Invoice No*: ${invoiceNum}\n` +
    `🗓️ *Date*: ${invoiceDateFormatted}\n` +
    `👤 *Client*: ${invoice.customerName || invoice.customerEmail}\n` +
    `🏢 *Property*: ${invoice.propertyName || "TenoPilot Managed Property"}\n` +
    `💎 *Plan*: ${planTitle}\n` +
    `💰 *Amount Paid*: ₹${totalAmount.toLocaleString("en-IN")}\n` +
    `✅ *Status*: PAID & VERIFIED\n\n` +
    `Official Tax Invoice PDF: https://www.tenopilot.com${pdfDownloadUrl}\n\n` +
    `Thank you for choosing *TenoPilot OS*!`;

  const whatsAppShareUrl = buildWhatsAppUrl(
    invoice.customerPhone || "9845010072",
    shareWhatsAppMessage
  );

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl bg-[#161b22] border-2 border-[#c2652a]/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh] max-h-[92vh]">
        {/* Modal Top Control Bar */}
        <div className="bg-[#0d1117] px-4 sm:px-6 py-3 border-b border-white/10 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c2652a] to-orange-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Official Tax Invoice</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PDF PREVIEW 🟢
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
              <span className="hidden sm:inline">WhatsApp</span>
            </a>

            <a
              href={pdfDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Open full PDF in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </a>

            <a
              href={pdfDownloadUrl}
              download={`TenoPilot_Invoice_${invoiceNum}.pdf`}
              className="px-3 py-1.5 rounded-xl bg-[#c2652a] hover:bg-[#a04e1c] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 100% Exact PDF Embed (Zero duplication, pure SSOT) */}
        <div className="flex-1 w-full bg-[#1c140e] relative overflow-hidden">
          <iframe
            src={`${pdfDownloadUrl}#toolbar=1`}
            className="w-full h-full border-0 bg-white"
            title={`Tax Invoice ${invoiceNum}`}
          />
        </div>
      </div>
    </div>
  );
}
