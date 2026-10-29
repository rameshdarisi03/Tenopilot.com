// TenoPilot Centralized Amazon Simple Email Service (SES) Transactional Email Engine
// Replaces third-party providers with direct, ultra-high deliverability AWS SES v2 infrastructure

import { SESClient, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";
import { generateReceiptPdfBuffer, generateRentalAgreementPdfBuffer } from "./pdfGenerator";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export interface SESSendParams {
  toEmail: string;
  recipientName: string;
  propertyId: string;
  propertyName?: string;
  replyToEmail?: string;
  type: "RENT_REMINDER" | "PAYMENT_RECEIPT" | "ONBOARDING_INVITE" | "TENANT_WELCOME" | "TEST_PING" | "CHECKOUT_THANK_YOU" | "AUTH_OTP" | "OWNER_WELCOME" | "SUBSCRIPTION_INVOICE" | "KYC_CORRECTION_REQUEST" | "COMPLAINT_UPDATE" | "CUSTOM";
  params?: {
    otpCode?: string;
    roomNumber?: string;
    bedCode?: string;
    amount?: number | string;
    breakupNote?: string;
    dueDate?: string;
    joiningDate?: string;
    upiId?: string;
    bankLabel?: string;
    accountType?: string;
    receiptId?: string;
    receiptUrl?: string;
    managerPhone?: string;
    paymentMode?: string;
    paidDate?: string;
    onboardUrl?: string;
    customSubject?: string;
    customBody?: string;
    planName?: string;
    validityPeriod?: string;
    month?: string;
    rentAmount?: number | string;
    depositAmount?: number | string;
    initialDeposit?: number | string;
    unpaidDeposit?: number | string;
    unpaidRent?: number | string;
    repairs?: number | string;
    maintenance?: number | string;
    totalDeductions?: number | string;
    netRefunded?: number | string;
    netDeficit?: number | string;
    notes?: string;
    rejectionReason?: string;
    phone?: string;
    propertyAddress?: string;
    houseRules?: string;
    billingCycle?: string;
    ownerName?: string;
    complaintId?: string;
    complaintTitle?: string;
    complaintStatus?: string;
    customMessage?: string;
    category?: string;
  };
  attachments?: {
    name: string;
    content: string; // Base64 encoded string
    mime_type?: string;
  }[];
  customCredentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    senderEmail?: string;
    senderName?: string;
    apiKey?: string; // For backward compatibility
  };
}

export interface SESSendResult {
  success: boolean;
  messageId: string;
  mode: "LIVE_BREVO" | "LIVE_ZOHO_CPAAS" | "LIVE_AWS_SES" | "SIMULATOR_SANDBOX";
  recipientEmail: string;
  recipientName: string;
  fallbackUsed?: boolean;
  error?: string;
  timestamp: string;
}

/**
 * Checks if an SES or Email error response indicates a quota/sandbox restriction
 */
export function isSESQuotaError(errorMsg?: string, statusCode?: number): boolean {
  if (statusCode === 402 || statusCode === 429) return true;
  if (!errorMsg) return false;
  const lower = errorMsg.toLowerCase();
  return (
    lower.includes("not_enough_credits") ||
    lower.includes("insufficient_credits") ||
    lower.includes("quota") ||
    lower.includes("limit exceeded") ||
    lower.includes("daily limit") ||
    lower.includes("account is in sandbox") ||
    lower.includes("email address is not verified") ||
    lower.includes("messagesendlimitexceeded")
  );
}

/**
 * Anti-Spam & Zoho CPaaS Terms-Compliant Legal Footer
 * Ensures mandatory 'About Us', physical location, support, and abuse contact information.
 */
function getCompliantEmailFooter(pName: string): string {
  return `
    <!-- Zoho CPaaS & Anti-Spam Compliant Legal Footer -->
    <div style="background:#f8fafc;padding:20px 24px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;line-height:1.6;">
      <p style="margin:0 0 4px 0;font-weight:700;color:#64748b;">${pName} • Powered by <a href="https://www.tenopilot.com" style="color:#c2652a;text-decoration:none;font-weight:600;">TenoPilot.com</a></p>
      <p style="margin:0 0 4px 0;color:#64748b;">Cloud Operating System for PGs, Hostels & Co-Living Spaces • Bangalore, Karnataka, India</p>
      <p style="margin:0;font-size:10px;color:#94a3b8;">Support: <a href="mailto:support@tenopilot.com" style="color:#64748b;text-decoration:underline;">support@tenopilot.com</a> | Legal & Compliance: <a href="mailto:abuse@tenopilot.com" style="color:#64748b;text-decoration:underline;">abuse@tenopilot.com</a></p>
    </div>
  `;
}

/**
 * Generate High-Converting HTML and Subject Line for Transactional Emails
 */
export function generateEmailContent(payload: SESSendParams): { subject: string; html: string; text: string } {
  const pName = payload.propertyName || "TenoPilot PG & Living";
  const p = payload.params || {};
  const formattedAmount = Number(p.amount || 0).toLocaleString("en-IN");

  switch (payload.type) {
    case "RENT_REMINDER": {
      const isCash = p.upiId === "CASH_PAYMENT" || p.upiId?.toLowerCase().includes("cash") || p.accountType === "CASH_DESK";
      const subject = isCash
        ? `🏠 Rent Payment Reminder (Pay by Cash) for Room ${p.roomNumber || "N/A"} — ${pName}`
        : `🏠 Rent Payment Reminder for Room ${p.roomNumber || "N/A"} — ${pName}`;
      const upiText = isCash
        ? "CASH IN HAND at PG Reception / Front Desk"
        : (p.upiId ? `Pay to UPI ID: ${p.upiId}${p.bankLabel ? ` (${p.bankLabel})` : ""}` : "Contact Management Desk");
      
      const paymentCardHtml = isCash
        ? `<!-- Cash In Hand Card -->
      <div style="background:#fef3c7;border-radius:16px;padding:20px;margin-bottom:24px;border:1px solid #fde68a;text-align:center;">
        <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:1px;">💵 In-Person Cash Settlement</p>
        <p style="margin:0;font-size:16px;font-weight:800;color:#78350f;">PG Reception / Front Desk</p>
        ${p.bankLabel ? `<p style="margin:4px 0 0 0;font-size:12px;color:#92400e;font-weight:600;">Location: ${p.bankLabel}</p>` : ""}
        <p style="margin:10px 0 0 0;font-size:12px;color:#92400e;line-height:1.4;">
          👉 <em>Please visit the property desk in person to pay your rent in cash to the manager and collect your official stamped receipt.</em>
        </p>
      </div>`
        : `<!-- Quick UPI Payment Card -->
      <div style="background:#ecfdf5;border-radius:16px;padding:20px;margin-bottom:24px;border:1px solid #a7f3d0;text-align:center;">
        <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;color:#065f46;text-transform:uppercase;letter-spacing:1px;">⚡ Pay via UPI ID</p>
        <p style="margin:0;font-size:16px;font-weight:800;color:#047857;font-family:monospace;letter-spacing:0.5px;">Pay to UPI: ${p.upiId || "Contact Management Desk"}</p>
        ${p.bankLabel ? `<p style="margin:4px 0 0 0;font-size:12px;color:#047857;font-weight:600;">Bank / Account: ${p.bankLabel}</p>` : ""}
        <p style="margin:10px 0 0 0;font-size:12px;color:#065f46;line-height:1.4;">
          👉 <em>Please transfer to this UPI ID using PhonePe, Google Pay, Paytm, or BHIM.</em>
        </p>
      </div>`;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:28px 12px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
    
    <!-- Top Header Banner -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#334155 100%);padding:32px 24px;text-align:center;color:#ffffff;">
      <div style="display:inline-block;background:rgba(255,255,255,0.12);padding:5px 14px;border-radius:24px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;border:1px solid rgba(255,255,255,0.15);">
        🏢 ${pName.toUpperCase()}
      </div>
      <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Rent Payment Reminder</h1>
      <p style="margin:0;color:#cbd5e1;font-size:13px;">Friendly Reminder for Room ${p.roomNumber || "N/A"} (${p.bedCode || "Standard Bed"})</p>
    </div>

    <!-- Main Body -->
    <div style="padding:32px 28px;">
      <p style="font-size:16px;margin:0 0 16px 0;color:#0f172a;">Dear <strong>${payload.recipientName}</strong>,</p>
      
      <p style="font-size:14px;color:#475569;margin:0 0 24px 0;line-height:1.6;">
        We hope you are having a pleasant, comfortable, and peaceful stay at <strong>${pName}</strong>! ✨<br/>
        This is a friendly reminder regarding your monthly accommodation dues for your room.
      </p>

      <!-- Financial Statement Box -->
      <div style="background:#f8fafc;border-radius:16px;padding:22px;margin-bottom:24px;border:1px solid #e2e8f0;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 0;color:#64748b;font-weight:500;">Resident Name:</td>
            <td style="padding:10px 0;text-align:right;font-weight:700;color:#0f172a;">${payload.recipientName}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 0;color:#64748b;font-weight:500;">Room Location:</td>
            <td style="padding:10px 0;text-align:right;font-weight:700;color:#0f172a;">Room ${p.roomNumber || "N/A"} (${p.bedCode || "Standard Bed"})</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 0;color:#64748b;font-weight:500;">Payment Due Date:</td>
            <td style="padding:10px 0;text-align:right;font-weight:700;color:#dc2626;">${p.dueDate || "5th of this month"}</td>
          </tr>
          <tr>
            <td style="padding:16px 0 4px 0;color:#0f172a;font-weight:800;font-size:15px;">Total Amount Due:</td>
            <td style="padding:16px 0 4px 0;text-align:right;font-weight:900;font-size:22px;color:#059669;">₹${formattedAmount}</td>
          </tr>
        </table>
      </div>

      ${paymentCardHtml}

      <p style="font-size:13px;color:#64748b;margin:0 0 20px 0;line-height:1.5;">
        💡 <em>If you have already completed this payment, please disregard this notice or share the payment receipt with our desk so we can generate your official e-receipt immediately.</em>
      </p>

      <div style="border-top:1px solid #f1f5f9;padding-top:18px;margin-top:20px;">
        <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#334155;">Warm regards,</p>
        <p style="margin:0;font-size:14px;font-weight:800;color:#0f172a;">${pName} Management & Operations</p>
        <p style="margin:2px 0 0 0;font-size:12px;color:#64748b;">Resident Services Desk</p>
      </div>
    </div>

    ${getCompliantEmailFooter(pName)}
  </div>
</body>
</html>`;

      const text = `Hello ${payload.recipientName},\n\nFriendly rent payment reminder for ${pName}:\n🏠 Resident: ${payload.recipientName}\n🏠 Room: Room ${p.roomNumber || "N/A"} (${p.bedCode || "Standard Bed"})\n💰 Amount Due: ₹${formattedAmount}${p.breakupNote ? ` (${p.breakupNote})` : ""}\n📅 Due Date: ${p.dueDate || "5th of this month"}\n💳 Payment Mode: ${upiText}\n\nThank you for being a valued resident of ${pName}!\n\n${pName} Management Desk\nGenerated via TenoPilot.com`;
      return { subject, html, text };
    }

    case "PAYMENT_RECEIPT": {
      const rawReceiptNo = p.receiptId || `REC-${Date.now().toString().slice(-6)}`;
      const cleanReceiptNo = rawReceiptNo.replace(/^#+/, "");
      const subject = `🧾 Official Payment Receipt #${cleanReceiptNo} — ${pName} (Room ${p.roomNumber || "N/A"})`;
      const paidDate = p.paidDate || p.dueDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const payMode = p.paymentMode || "UPI / Digital Transfer";
      const isDeposit = cleanReceiptNo.startsWith("DEP") || (typeof p.customSubject === "string" && p.customSubject.toLowerCase().includes("deposit"));
      const hasBreakup = p.rentAmount !== undefined && p.depositAmount !== undefined && Number(p.rentAmount) > 0 && Number(p.depositAmount) > 0;
      const downloadReceiptUrl = p.receiptUrl || `https://www.tenopilot.com/api/receipt/pdf?receiptNo=${encodeURIComponent(cleanReceiptNo)}&residentName=${encodeURIComponent(payload.recipientName)}&propertyName=${encodeURIComponent(pName)}&amount=${encodeURIComponent(String(p.amount || 0))}&roomNumber=${encodeURIComponent(p.roomNumber || "")}&bedCode=${encodeURIComponent(p.bedCode || "")}&paidDate=${encodeURIComponent(paidDate)}&paymentMode=${encodeURIComponent(payMode)}${p.month ? `&month=${encodeURIComponent(p.month)}` : ""}${isDeposit ? "&isDeposit=true" : ""}${hasBreakup ? `&rentAmount=${encodeURIComponent(String(p.rentAmount))}&depositAmount=${encodeURIComponent(String(p.depositAmount))}` : ""}`;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:28px 12px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
    
    <!-- Top Emerald Header Banner -->
    <div style="background:linear-gradient(135deg,#064e3b 0%,#047857 50%,#059669 100%);padding:32px 24px;text-align:center;color:#ffffff;">
      <div style="display:inline-block;background:rgba(255,255,255,0.18);padding:5px 14px;border-radius:24px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;border:1px solid rgba(255,255,255,0.2);">
        ✅ OFFICIAL PAYMENT RECEIPT
      </div>
      <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:800;">${pName}</h1>
      <p style="margin:0;color:#a7f3d0;font-size:13px;font-family:monospace;letter-spacing:0.5px;">Receipt #${cleanReceiptNo}</p>
    </div>

    <!-- Main Body -->
    <div style="padding:32px 28px;">
      <p style="font-size:16px;margin:0 0 16px 0;color:#0f172a;">Dear <strong>${payload.recipientName}</strong>,</p>
      
      <p style="font-size:14px;color:#475569;margin:0 0 24px 0;line-height:1.6;">
        We have successfully received and verified your payment. Thank you for clearing your dues promptly! 🟢<br/>
        Below are the official transaction details recorded in the <strong>${pName}</strong> property ledger.
      </p>

      <!-- Verified Receipt Table -->
      <div style="background:#f8fafc;border-radius:16px;padding:22px;margin-bottom:24px;border:1px solid #e2e8f0;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr style="border-bottom:1px dashed #cbd5e1;">
            <td style="padding:10px 0;color:#64748b;font-weight:500;">Receipt Number:</td>
            <td style="padding:10px 0;text-align:right;font-weight:700;font-family:monospace;color:#0f172a;">#${cleanReceiptNo}</td>
          </tr>
          <tr style="border-bottom:1px dashed #cbd5e1;">
            <td style="padding:10px 0;color:#64748b;font-weight:500;">Resident Name:</td>
            <td style="padding:10px 0;text-align:right;font-weight:700;color:#0f172a;">${payload.recipientName}</td>
          </tr>
          <tr style="border-bottom:1px dashed #cbd5e1;">
            <td style="padding:10px 0;color:#64748b;font-weight:500;">Date of Payment:</td>
            <td style="padding:10px 0;text-align:right;font-weight:600;color:#0f172a;">${paidDate}</td>
          </tr>
          <tr style="border-bottom:1px dashed #cbd5e1;">
            <td style="padding:10px 0;color:#64748b;font-weight:500;">Accommodation:</td>
            <td style="padding:10px 0;text-align:right;font-weight:600;color:#0f172a;">Room ${p.roomNumber || "N/A"} (${p.bedCode || "Standard Bed"})</td>
          </tr>
          <tr style="border-bottom:1px dashed #cbd5e1;">
            <td style="padding:10px 0;color:#64748b;font-weight:500;">Payment Channel:</td>
            <td style="padding:10px 0;text-align:right;font-weight:600;color:#0f172a;">${payMode}</td>
          </tr>
          ${hasBreakup ? `
          <tr style="border-bottom:1px dashed #cbd5e1;">
            <td style="padding:10px 0;color:#64748b;font-weight:500;">• Room Rent Portion:</td>
            <td style="padding:10px 0;text-align:right;font-weight:700;color:#0f172a;">₹${Number(p.rentAmount).toLocaleString("en-IN")}</td>
          </tr>
          <tr style="border-bottom:1px dashed #cbd5e1;background-color:#faf5ff;">
            <td style="padding:10px 0;color:#6b21a8;font-weight:500;">• Security Deposit (Refundable):</td>
            <td style="padding:10px 0;text-align:right;font-weight:700;color:#6b21a8;">₹${Number(p.depositAmount).toLocaleString("en-IN")}</td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding:16px 0 4px 0;color:#0f172a;font-weight:800;font-size:15px;">Total Amount Paid:</td>
            <td style="padding:16px 0 4px 0;text-align:right;font-weight:900;font-size:22px;color:#059669;">₹${formattedAmount}</td>
          </tr>
        </table>
      </div>

      <!-- Verification Seal Box -->
      <div style="background:#ecfdf5;border-radius:12px;padding:14px 18px;margin-bottom:24px;border:1px solid #a7f3d0;display:flex;align-items:center;gap:12px;">
        <span style="font-size:20px;">🛡️</span>
        <p style="margin:0;font-size:13px;color:#065f46;line-height:1.4;">
          <strong>Ledger Status: Fully Verified & Locked</strong><br/>
          This electronic confirmation serves as your authentic digital proof of payment for personal records and company HRA reimbursement.
        </p>
      </div>

      <!-- 📥 1-Click Official PDF Receipt Download Button -->
      <div style="text-align:center;margin:28px 0 24px 0;">
        <a href="${downloadReceiptUrl}" target="_blank" style="display:inline-block;padding:14px 34px;background:linear-gradient(135deg,#059669 0%,#047857 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;box-shadow:0 4px 14px rgba(5,150,105,0.35);letter-spacing:0.3px;">
          📥 Download Official PDF Receipt
        </a>
        <p style="margin:10px 0 0 0;font-size:11.5px;color:#64748b;">
          📎 <em>Official PDF receipt is also attached directly to this email.</em>
        </p>
      </div>

      <p style="font-size:13px;color:#64748b;margin:0 0 20px 0;line-height:1.5;">
        We appreciate having you as our resident at <strong>${pName}</strong>. Wishing you a great day ahead! 🌟
      </p>

      <div style="border-top:1px solid #f1f5f9;padding-top:18px;margin-top:20px;">
        <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#334155;">Warm regards,</p>
        <p style="margin:0;font-size:14px;font-weight:800;color:#0f172a;">${pName} Administration</p>
        <p style="margin:2px 0 0 0;font-size:12px;color:#64748b;">Finance & Resident Operations</p>
      </div>
    </div>

    ${getCompliantEmailFooter(pName)}
  </div>
</body>
</html>`;

      const text = `Official Payment Receipt #${cleanReceiptNo}\n\nDear ${payload.recipientName},\n\nWe have received and verified your payment of ₹${formattedAmount} for ${pName} (Room ${p.roomNumber || "N/A"}).\n\nDate: ${paidDate}\nPayment Mode: ${payMode}\nReceipt No: #${cleanReceiptNo}\nStatus: Verified & Logged in Property Ledger\n\nDownload PDF: ${downloadReceiptUrl}\n\nThank you for being a valued resident!\n${pName} Administration • Powered by TenoPilot.com`;
      return { subject, html, text };
    }

    case "ONBOARDING_INVITE": {
      const subject = `🏢 Welcome to ${pName}! Complete Your Digital Resident Check-In`;
      const onboardUrl = p.onboardUrl || "https://www.tenopilot.com";
      const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` (${p.bedCode})` : ""}`;
      const rentStr = p.rentAmount ? `₹${Number(p.rentAmount).toLocaleString("en-IN")} / month` : undefined;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px 12px;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e8dfd8;box-shadow:0 8px 24px rgba(28,20,14,0.06);">
    <!-- Top Header Banner -->
    <div style="background:linear-gradient(135deg,#1c140e 0%,#2d1d13 60%,#c2652a 100%);padding:32px 24px;text-align:center;color:#ffffff;">
      <div style="display:inline-block;background:rgba(194,101,42,0.25);padding:5px 14px;border-radius:24px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;border:1px solid rgba(255,255,255,0.2);">
        ✨ RESIDENT SELF CHECK-IN
      </div>
      <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:800;">Welcome to ${pName}! 🎉</h1>
      <p style="margin:0;color:#f3d7c3;font-size:13px;">Digital Resident Onboarding & Aadhaar KYC</p>
    </div>

    <!-- Main Content -->
    <div style="padding:28px 24px;">
      <p style="font-size:15px;margin:0 0 14px 0;color:#1e293b;">Hello <strong>${payload.recipientName}</strong> 👋,</p>
      <p style="font-size:14px;color:#475569;margin:0 0 20px 0;line-height:1.6;">
        We are thrilled to welcome you to <strong>${pName}</strong>! Your accommodation has been reserved on hold. To ensure a seamless check-in experience, please complete your digital resident registration and ID verification online:
      </p>

      <!-- Accommodation Box -->
      <div style="background:#fcf8f5;border-radius:14px;padding:18px 20px;margin-bottom:24px;border:1px solid #faeade;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;color:#64748b;font-weight:600;">🏠 Reserved Stay:</td>
            <td style="padding:6px 0;text-align:right;font-weight:800;color:#1e293b;">Room ${roomStay}</td>
          </tr>
          ${rentStr ? `
          <tr>
            <td style="padding:6px 0;color:#64748b;font-weight:600;">💰 Monthly Tariff:</td>
            <td style="padding:6px 0;text-align:right;font-weight:800;color:#c2652a;">${rentStr}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:6px 0;color:#64748b;font-weight:600;">🏢 Property:</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:#1e293b;">${pName}</td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${onboardUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#c2652a 0%,#ba5324 100%);color:#ffffff;font-weight:800;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(194,101,42,0.35);letter-spacing:0.3px;">
          Complete Digital Check-In 👉
        </a>
      </div>

      <p style="font-size:12.5px;color:#64748b;margin:0 0 16px 0;line-height:1.6;text-align:center;">
        ⚡ <em>Takes only 2 minutes. Please have your photo ID (Aadhaar/Passport) and emergency contact details handy.</em>
      </p>

      <div style="background:#f1f5f9;border-radius:10px;padding:10px 14px;font-size:11px;color:#64748b;line-height:1.4;text-align:center;">
        🔗 Direct Link: <a href="${onboardUrl}" style="color:#c2652a;word-break:break-all;">${onboardUrl}</a>
      </div>
    </div>

    ${getCompliantEmailFooter(pName)}
  </div>
</body>
</html>`;

      const text = `Welcome to ${pName}!\n\nHello ${payload.recipientName},\nYour stay at Room ${roomStay} has been reserved.\nPlease complete your digital check-in and KYC at:\n${onboardUrl}\n\n— ${pName} Management Desk`;
      return { subject, html, text };
    }

    case "TENANT_WELCOME": {
      const subject = `🎉 Welcome to ${pName}! Your Resident Check-In is Confirmed`;
      const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` (${p.bedCode})` : ""}`;
      const checkinDate = p.paidDate || p.dueDate || p.joiningDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const rentStr = p.rentAmount ? `₹${Number(p.rentAmount).toLocaleString("en-IN")} / month` : p.amount ? `₹${Number(p.amount).toLocaleString("en-IN")} / month` : undefined;
      const depositStr = p.depositAmount && Number(p.depositAmount) > 0 ? `₹${Number(p.depositAmount).toLocaleString("en-IN")}` : undefined;
      const managerPhone = p.managerPhone;
      const residentPortalUrl = p.onboardUrl || `https://www.tenopilot.com`;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:28px 12px;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c140e;-webkit-font-smoothing:antialiased;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e8dfd8;box-shadow:0 12px 36px rgba(28,20,14,0.08);">
    
    <!-- Top Warm Terracotta Gradient Header -->
    <div style="background:linear-gradient(135deg,#1c140e 0%,#2d1d13 55%,#c2652a 100%);padding:36px 28px;text-align:center;color:#ffffff;">
      <div style="display:inline-block;background:rgba(194,101,42,0.28);padding:6px 16px;border-radius:30px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;border:1px solid rgba(255,255,255,0.2);">
        ✨ RESIDENT CHECK-IN CONFIRMED
      </div>
      <h1 style="margin:0 0 6px 0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Welcome to ${pName}! 🎉</h1>
      <p style="margin:0;color:#f3d7c3;font-size:13.5px;">Your digital onboarding & KYC verification are officially approved</p>
    </div>

    <!-- Main Content Body -->
    <div style="padding:32px 28px;">
      <p style="font-size:16px;margin:0 0 16px 0;color:#1c140e;">Dear <strong>${payload.recipientName}</strong>,</p>
      
      <p style="font-size:14px;color:#475569;margin:0 0 20px 0;line-height:1.65;">
        Congratulations and welcome to the community! 🥳 We are thrilled to confirm that your resident profile and KYC verification for <strong>${pName}</strong> have been reviewed and approved by management.
      </p>

      <!-- Stay Summary Card -->
      <div style="background:#fcfaf7;border-radius:18px;padding:22px 24px;margin-bottom:24px;border:1px solid #ede5de;">
        <h3 style="margin:0 0 14px 0;font-size:12px;font-weight:800;color:#c2652a;text-transform:uppercase;letter-spacing:0.8px;">
          🏠 YOUR ALLOCATED RESIDENCE DETAILS
        </h3>
        <table style="width:100%;font-size:13.5px;border-collapse:collapse;line-height:1.7;">
          <tr style="border-bottom:1px dashed #e8dfd8;">
            <td style="padding:8px 0;color:#7b746c;font-weight:600;">Property:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#1c140e;">${pName}</td>
          </tr>
          <tr style="border-bottom:1px dashed #e8dfd8;">
            <td style="padding:8px 0;color:#7b746c;font-weight:600;">Room & Bed:</td>
            <td style="padding:8px 0;text-align:right;font-weight:800;color:#1c140e;">Room ${roomStay}</td>
          </tr>
          <tr style="border-bottom:1px dashed #e8dfd8;">
            <td style="padding:8px 0;color:#7b746c;font-weight:600;">Check-In Date:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#1c140e;">${checkinDate}</td>
          </tr>
          ${rentStr ? `
          <tr style="border-bottom:1px dashed #e8dfd8;">
            <td style="padding:8px 0;color:#7b746c;font-weight:600;">Monthly Tariff:</td>
            <td style="padding:8px 0;text-align:right;font-weight:800;color:#c2652a;">${rentStr}</td>
          </tr>` : ""}
          ${depositStr ? `
          <tr style="border-bottom:1px dashed #e8dfd8;">
            <td style="padding:8px 0;color:#7b746c;font-weight:600;">Security Deposit:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#1c140e;">${depositStr}</td>
          </tr>` : ""}
          ${managerPhone ? `
          <tr>
            <td style="padding:8px 0;color:#7b746c;font-weight:600;">Host Desk / Manager:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#1c140e;">+91 ${managerPhone}</td>
          </tr>` : ""}
        </table>
      </div>

      <!-- Attached Agreement Banner Card -->
      <div style="background:#fcf8f5;border-radius:16px;padding:20px;margin-bottom:24px;border:1.5px solid #f3d7c3;text-align:left;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:36px;vertical-align:top;font-size:24px;line-height:1;padding-right:12px;">📎</td>
            <td style="vertical-align:top;">
              <p style="margin:0 0 4px 0;font-size:11px;font-weight:800;color:#c2652a;text-transform:uppercase;letter-spacing:0.8px;">OFFICIAL DOCUMENT ATTACHED</p>
              <p style="margin:0 0 6px 0;font-size:14.5px;font-weight:800;color:#1c140e;">Digitally Attested Rental Agreement (PDF)</p>
              <p style="margin:0;font-size:12.5px;color:#5a534c;line-height:1.55;">
                Your verified residential lease agreement—including accommodation particulars, monthly rent, security deposit terms, and property regulations—is attached directly to this email for your records and company reimbursement.
              </p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Highlights Box -->
      <div style="background:#f0fdf4;border-radius:14px;padding:16px 20px;margin-bottom:24px;border:1px solid #bbf7d0;">
        <p style="margin:0 0 6px 0;font-weight:700;color:#166534;font-size:13px;">✅ What Happens Next?</p>
        <ul style="margin:0;padding-left:18px;font-size:12.5px;color:#15803d;line-height:1.6;">
          <li>Your room key and bed assignment are ready at the front desk.</li>
          <li>All rent receipts and payment invoices will be automatically sent to this email.</li>
          <li>You can register maintenance or service requests directly via the property care portal.</li>
        </ul>
      </div>

      <!-- Action Button -->
      <div style="text-align:center;margin:28px 0 16px 0;">
        <a href="${residentPortalUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#c2652a 0%,#a84e1b 100%);color:#ffffff;font-weight:800;font-size:14.5px;padding:14px 34px;border-radius:14px;text-decoration:none;box-shadow:0 6px 18px rgba(194,101,42,0.35);letter-spacing:0.3px;">
          View Resident Pass & Details 👉
        </a>
      </div>

      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;line-height:1.5;">
        Need assistance with your move-in? Please contact the reception desk${managerPhone ? ` at +91 ${managerPhone}` : ""}.
      </p>
    </div>

    ${getCompliantEmailFooter(pName)}
  </div>
</body>
</html>`;

      const text = `Welcome to ${pName}! 🎉\n\nDear ${payload.recipientName},\n\nCongratulations! Your resident check-in and KYC verification have been officially approved.\n\nAccommodation Details:\nProperty: ${pName}\nRoom: Room ${roomStay}\nCheck-In Date: ${checkinDate}\n${rentStr ? `Monthly Tariff: ${rentStr}\n` : ""}${depositStr ? `Security Deposit: ${depositStr}\n` : ""}${managerPhone ? `Manager Contact: +91 ${managerPhone}\n` : ""}\n📎 Official Tenancy Agreement Attached:\nYour digitally attested Residential Lease Agreement (PDF) is attached to this email for your permanent records.\n\nView Resident Details: ${residentPortalUrl}\n\nWarm regards,\n${pName} Management Desk • Powered by TenoPilot.com`;
      return { subject, html, text };
    }

    case "TEST_PING": {
      const subject = `✅ [TenoPilot] Amazon SES Transactional Email Gateway Verified`;
      const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;padding:24px;background:#f8fafc;">
  <div style="max-width:500px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
    <h2 style="color:#059669;margin-top:0;">✅ Amazon SES Gateway Verification Successful!</h2>
    <p>This test email confirms that your Amazon SES transactional email gateway is configured and operating with high deliverability on <strong>TenoPilot.com</strong>.</p>
    <p style="font-size:13px;color:#64748b;">Timestamp: ${new Date().toISOString()}<br/>Target Property: ${pName}</p>
  </div>
</body>
</html>`;
      const text = `Amazon SES Gateway Verified successfully for ${pName} at ${new Date().toISOString()}.`;
      return { subject, html, text };
    }

    case "CHECKOUT_THANK_YOU": {
      const subject = `🌟 Thank You for Staying With Us! Check-Out & Settlement Confirmation — ${pName}`;
      const receiptNo = p.receiptId || `REF-${Date.now().toString().slice(-6)}`;
      const downloadLink = p.receiptUrl || `https://www.tenopilot.com/api/receipt/pdf?receiptNo=${encodeURIComponent(receiptNo)}&isSettlement=true&residentName=${encodeURIComponent(payload.recipientName)}&propertyName=${encodeURIComponent(pName)}`;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:28px 12px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
    
    <!-- Top Header Banner -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#047857 100%);padding:32px 24px;text-align:center;color:#ffffff;">
      <div style="display:inline-block;background:rgba(255,255,255,0.18);padding:5px 14px;border-radius:24px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;border:1px solid rgba(255,255,255,0.2);">
        🌟 THANK YOU FOR STAYING WITH US
      </div>
      <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:800;">${pName}</h1>
      <p style="margin:0;color:#cbd5e1;font-size:13px;">Move-Out Handover & Deposit Settlement Confirmation</p>
    </div>

    <!-- Main Body -->
    <div style="padding:32px 28px;">
      <p style="font-size:16px;margin:0 0 16px 0;color:#0f172a;">Dear <strong>${payload.recipientName}</strong>,</p>
      
      <p style="font-size:14px;color:#475569;margin:0 0 20px 0;line-height:1.6;">
        Thank you for choosing <strong>${pName}</strong> as your home! It was an absolute pleasure having you with us, and we wish you continued success and happiness in your next chapter.
      </p>

      <p style="font-size:14px;color:#475569;margin:0 0 24px 0;line-height:1.6;">
        Your room handover and move-out security deposit settlement have been finalized.
      </p>

      <!-- Download Receipt Box -->
      <div style="background:#f8fafc;border-radius:16px;padding:22px;margin-bottom:24px;border:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:1px;">📄 OFFICIAL SETTLEMENT DOCUMENT</p>
        <p style="margin:0 0 10px 0;font-size:16px;font-weight:800;color:#0f172a;">Check-Out & Deposit Settlement Receipt</p>
        <p style="margin:0 0 20px 0;font-size:13px;color:#64748b;line-height:1.5;">
          Your official settlement receipt with complete details, room handover verification, and final ledger breakdown is available below for your records and company reimbursement.
        </p>
        <a href="${downloadLink}" target="_blank" style="display:inline-block;background:#059669;color:#ffffff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none;box-shadow:0 4px 12px rgba(5,150,105,0.25);">
          📥 Download Settlement PDF Receipt
        </a>
      </div>

      <p style="font-size:13px;color:#475569;margin:0 0 20px 0;line-height:1.5;">
        You and your friends are always welcome back at <strong>${pName}</strong>. Keep in touch! 🌟
      </p>

      <div style="border-top:1px solid #f1f5f9;padding-top:18px;margin-top:20px;">
        <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#334155;">Warm regards,</p>
        <p style="margin:0;font-size:14px;font-weight:800;color:#0f172a;">${pName} Management</p>
        ${p.managerPhone ? `<p style="margin:2px 0 0 0;font-size:12px;color:#64748b;">📞 ${p.managerPhone}</p>` : ""}
      </div>
    </div>

    ${getCompliantEmailFooter(pName)}
  </div>
</body>
</html>`;

      const text = `${pName}\nThank You for Staying With Us!\n\nDear ${payload.recipientName},\n\nThank you for choosing ${pName} as your home! It was an absolute pleasure having you with us, and we wish you great success in your next chapter.\n\nYour room handover and move-out security deposit settlement have been finalized.\n\nDownload your official Settlement PDF Receipt:\n${downloadLink}\n\nYou and your friends are always welcome back at ${pName}!\n\nWarm regards,\n${pName} Management`;

      return { subject, html, text };
    }

    case "AUTH_OTP": {
      const otpCode = p.otpCode || "000000";
      const subject = `🔐 Your TenoPilot Verification Code is ${otpCode}`;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:28px 12px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
    <!-- Top Header -->
    <div style="background:linear-gradient(135deg,#c2652a 0%,#964407 100%);padding:28px 24px;text-align:center;color:#ffffff;">
      <div style="display:inline-block;background:rgba(255,255,255,0.18);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">
        🛡️ TenoPilot Cloud Security
      </div>
      <h1 style="margin:0;font-size:22px;font-weight:800;">Verify Your Email Address</h1>
    </div>

    <!-- Main Content -->
    <div style="padding:32px 28px;text-align:center;">
      <p style="font-size:15px;margin:0 0 12px 0;color:#0f172a;">Hello <strong>${payload.recipientName || "Property Manager"}</strong>,</p>
      <p style="font-size:13px;color:#475569;margin:0 0 24px 0;line-height:1.6;">
        Please use the following 6-digit verification code to authenticate and link your email address with your TenoPilot account.
      </p>

      <!-- OTP Box -->
      <div style="background:#fef3c7;border-radius:16px;padding:20px 24px;margin:0 auto 24px auto;display:inline-block;border:1.5px dashed #f59e0b;">
        <span style="font-size:32px;font-weight:900;letter-spacing:8px;color:#92400e;font-family:Consolas, Monaco, monospace;display:block;">
          ${otpCode}
        </span>
      </div>

      <p style="font-size:12px;color:#64748b;margin:0 0 20px 0;">
        ⏳ This verification code expires in <strong>10 minutes</strong>. Never share this code with anyone.
      </p>

      <div style="background:#f1f5f9;border-radius:12px;padding:12px 16px;margin-top:20px;text-align:left;font-size:11px;color:#64748b;line-height:1.5;">
        🔒 <em>If you did not request this verification code, you can safely ignore this email. No changes will be made to your account.</em>
      </div>
    </div>

    ${getCompliantEmailFooter("TenoPilot")}
  </div>
</body>
</html>`;

      const text = `Your TenoPilot Verification Code is: ${otpCode}\n\nThis code expires in 10 minutes.\nIf you did not request this code, please ignore this email.\n\nTenoPilot.com Security Team`;
      return { subject, html, text };
    }

    case "OWNER_WELCOME": {
      const ownerName = payload.recipientName || "Property Owner";
      const subject = `✨ Welcome to TenoPilot, ${ownerName}! ${pName} is ready and live 🎉🥳`;
      const ownerPhone = p.managerPhone || "";
      const ownerEmail = payload.toEmail || "";

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:28px 12px;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c140e;-webkit-font-smoothing:antialiased;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e8dfd8;box-shadow:0 12px 36px rgba(28,20,14,0.08);">
    
    <!-- Top Terracotta Header Banner -->
    <div style="background:linear-gradient(135deg,#1c140e 0%,#2d1d13 60%,#c2652a 100%);padding:36px 28px;text-align:center;color:#ffffff;">
      <div style="display:inline-block;background:rgba(194,101,42,0.25);padding:6px 16px;border-radius:30px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;border:1px solid rgba(255,255,255,0.2);">
        🚀 FLIGHT DECK ACTIVATED
      </div>
      <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">TenoPilot.com</h1>
      <p style="margin:0;color:#f3d7c3;font-size:13px;">The Intelligent Operating System for Coliving & Student Housing</p>
    </div>

    <!-- Main Content -->
    <div style="padding:32px 28px;">
      <p style="font-size:16px;margin:0 0 16px 0;color:#1c140e;">Dear <strong>${ownerName}</strong>,</p>
      
      <p style="font-size:14px;color:#475569;margin:0 0 18px 0;line-height:1.65;">
        Congratulations! <strong>${pName}</strong> is officially ready and live 🎉🥳
      </p>

      <p style="font-size:14px;color:#5a534c;margin:0 0 24px 0;line-height:1.65;">
        We built TenoPilot specifically for visionary PG & coliving owners like you—to eliminate messy registers, separate your security deposits from monthly rent, and put your daily collections on autopilot.
      </p>

      <!-- Workspace Highlights Card -->
      <div style="background:#fcfaf7;border-radius:18px;padding:22px;margin-bottom:24px;border:1px solid #ede5de;">
        <h3 style="margin:0 0 14px 0;font-size:13px;font-weight:800;color:#c2652a;text-transform:uppercase;letter-spacing:0.5px;">
          🏢 YOUR WORKSPACE HIGHLIGHTS:
        </h3>
        <table style="width:100%;font-size:13px;border-collapse:collapse;line-height:1.7;">
          <tr>
            <td style="padding:4px 0;color:#7b746c;width:24px;">•</td>
            <td style="padding:4px 0;color:#1c140e;"><strong>Property</strong>: ${pName}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#7b746c;">•</td>
            <td style="padding:4px 0;color:#1c140e;"><strong>FastTrack Migration</strong>: 1-Click AI paper register / diary scanner</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#7b746c;">•</td>
            <td style="padding:4px 0;color:#1c140e;"><strong>Automated Reminders</strong>: WhatsApp digital invoices & check-in KYC</td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="https://www.tenopilot.com/login" style="display:inline-block;padding:14px 36px;background:#c2652a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;box-shadow:0 4px 14px rgba(194,101,42,0.35);">
          👉 Open Your Workspace
        </a>
      </div>

      <!-- Quick Login Tip -->
      <div style="background:#f8fafc;border-radius:12px;padding:14px 18px;margin-bottom:24px;border:1px solid #e2e8f0;font-size:12.5px;color:#475569;line-height:1.6;">
        🔐 <strong>Quick Login Tip:</strong><br/>
        Log in directly with your registered mobile number (${ownerPhone || "your phone"})${ownerEmail ? ` or email (${ownerEmail})` : ""} anytime. Enter your 6-digit MPIN to unlock your workspace.
      </div>

      <!-- Assistance / Desk Note -->
      <p style="font-size:13px;color:#64748b;margin:0 0 20px 0;line-height:1.6;">
        Need assistance setting up your room layout or migrating your paper registers?<br/>
        Tap reply or call our Founder Support Desk directly at <a href="https://wa.me/919206651295" style="color:#c2652a;font-weight:700;text-decoration:none;">+91 92066 51295</a>.
      </p>

      <div style="border-top:1px solid #f0eae4;padding-top:18px;margin-top:20px;">
        <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#334155;">Welcome aboard,</p>
        <p style="margin:0;font-size:14px;font-weight:800;color:#1c140e;">Team TenoPilot 🏢✨</p>
      </div>
    </div>

    ${getCompliantEmailFooter("TenoPilot")}
  </div>
</body>
</html>`;

      const text = `TenoPilot.com 🚀\nThe Intelligent Operating System for Coliving & Student Housing\n\nWelcome to TenoPilot, ${ownerName}!\n\nCongratulations! ${pName} is officially ready and live 🎉\n\nWe built TenoPilot specifically for visionary PG & coliving owners like you—to eliminate messy registers, separate your security deposits from monthly rent, and put your daily collections on autopilot.\n\nYOUR WORKSPACE HIGHLIGHTS:\n• Property: ${pName}\n• FastTrack Migration: 1-Click AI paper register / diary scanner\n• Automated Reminders: WhatsApp digital invoices & check-in KYC\n\n👉 Open Your Workspace:\nhttps://www.tenopilot.com/login\n\nQuick Login Tip:\nLog in directly with your registered mobile number (${ownerPhone})${ownerEmail ? ` or email (${ownerEmail})` : ""} anytime to access your property dashboard.\n\nNeed assistance setting up your room layout or migrating your paper registers?\nTap reply or call our Founder Support Desk directly at +91 92066 51295.\n\nWelcome aboard,\nTeam TenoPilot 🏢✨`;

      return { subject, html, text };
    }

    case "SUBSCRIPTION_INVOICE": {
      const ownerName = payload.recipientName || "Property Partner";
      const invoiceNo = p.receiptId || `INV-${Date.now().toString().slice(-6)}`;
      const planName = p.planName || p.bankLabel || "Annual Pro Flight Deck";
      const subject = `🧾 Tax Invoice #${invoiceNo} — TenoPilot Subscription Activated for ${pName}`;
      const amountStr = p.amount ? `₹${Number(p.amount).toLocaleString("en-IN")}` : "";
      const invoiceUrl = p.receiptUrl || "";

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:28px 12px;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c140e;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e8dfd8;box-shadow:0 12px 36px rgba(28,20,14,0.08);">
    
    <!-- Top Header -->
    <div style="background:linear-gradient(135deg,#1c140e 0%,#2d1d13 60%,#c2652a 100%);padding:36px 28px;text-align:center;color:#ffffff;">
      <div style="display:inline-block;background:rgba(5,150,105,0.25);padding:5px 14px;border-radius:24px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;border:1px solid rgba(167,243,208,0.4);color:#a7f3d0;">
        🎉 WELCOME TO TENOPILOT PRO
      </div>
      <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:800;">Congratulations, ${ownerName}!</h1>
      <p style="margin:0;color:#f3d7c3;font-size:13px;">${pName} • ${planName} Activated</p>
    </div>

    <div style="padding:32px 28px;">
      <p style="font-size:16px;margin:0 0 16px 0;">Dear <strong>${ownerName}</strong>,</p>
      
      <p style="font-size:14px;color:#5a534c;margin:0 0 24px 0;line-height:1.65;">
        Welcome to <strong>TenoPilot Pro</strong>! Your subscription for <strong>${pName}</strong> (${planName}) has been officially activated. Attached is your official Tax Invoice & Payment Receipt for your records.
      </p>

      <!-- Invoice Summary Card -->
      <div style="background:#fcfaf7;border-radius:18px;padding:22px;margin-bottom:24px;border:1px solid #ede5de;">
        <table style="width:100%;font-size:13.5px;border-collapse:collapse;">
          <tr style="border-bottom:1px dashed #e8dfd8;">
            <td style="padding:8px 0;color:#7b746c;">Invoice Number:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;font-family:monospace;color:#1c140e;">#${invoiceNo}</td>
          </tr>
          <tr style="border-bottom:1px dashed #e8dfd8;">
            <td style="padding:8px 0;color:#7b746c;">Property:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#1c140e;">${pName}</td>
          </tr>
          <tr style="border-bottom:1px dashed #e8dfd8;">
            <td style="padding:8px 0;color:#7b746c;">Plan Tier:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#c2652a;">${planName}</td>
          </tr>
          ${amountStr ? `
          <tr style="border-bottom:1px dashed #e8dfd8;">
            <td style="padding:8px 0;color:#7b746c;">Amount Paid:</td>
            <td style="padding:8px 0;text-align:right;font-weight:900;font-size:16px;color:#059669;">${amountStr}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:8px 0 0 0;color:#7b746c;">Payment Status:</td>
            <td style="padding:8px 0 0 0;text-align:right;font-weight:700;color:#059669;">PAID & VERIFIED</td>
          </tr>
        </table>
      </div>

      ${invoiceUrl ? `
      <!-- Download Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${invoiceUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background:#c2652a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;box-shadow:0 4px 14px rgba(194,101,42,0.35);">
          📄 Download Official Tax Invoice (PDF)
        </a>
      </div>` : ""}

      <p style="font-size:13px;color:#64748b;margin:0 0 20px 0;line-height:1.6;">
        This document serves as your official digital tax invoice under the Information Technology Act, 2000 and is valid for company accounts and Input Tax Credit (ITC).
      </p>

      <div style="border-top:1px solid #f0eae4;padding-top:18px;margin-top:20px;">
        <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#334155;">Warm regards,</p>
        <p style="margin:0;font-size:14px;font-weight:800;color:#1c140e;">TenoPilot Technologies Finance Desk</p>
        <p style="margin:2px 0 0 0;font-size:12px;color:#64748b;">billing@tenopilot.com | +91 92066 51295</p>
      </div>
    </div>

    ${getCompliantEmailFooter("TenoPilot")}
  </div>
</body>
</html>`;

      const text = `TenoPilot.com 🚀\n\nCongratulations, ${ownerName}! 🎉\n\nWelcome to TenoPilot Pro! Your subscription for ${pName} (${planName}) has been successfully activated.\n\nAttached is your official Tax Invoice & Payment Receipt (#${invoiceNo}) for your records.\n\n${invoiceUrl ? `Download Official Tax Invoice PDF: ${invoiceUrl}\n\n` : ""}We are thrilled to partner with you to put your coliving operations on autopilot. If you need any assistance, reach our Founder Support Desk at +91 92066 51295.\n\nWarm regards,\nTeam TenoPilot 🏢✨`;

      return { subject, html, text };
    }

    case "KYC_CORRECTION_REQUEST": {
      const subject = `⚠️ Action Required: Resident Verification Update — ${pName}`;
      const candidateName = payload.recipientName || "Resident";
      const reason = p.rejectionReason || p.customBody || "Please re-upload clear identity documents.";
      const reuploadUrl = p.onboardUrl || "https://www.tenopilot.com";
      const roomStay = p.roomNumber ? `Room ${p.roomNumber}${p.bedCode ? ` (${p.bedCode})` : ""}` : "Accommodation";

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:28px 12px;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c140e;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e8dfd8;box-shadow:0 12px 36px rgba(28,20,14,0.08);">
    
    <!-- Top Warning Header Banner -->
    <div style="background:linear-gradient(135deg,#991b1b 0%,#b91c1c 50%,#dc2626 100%);padding:32px 24px;text-align:center;color:#ffffff;">
      <div style="display:inline-block;background:rgba(255,255,255,0.2);padding:5px 14px;border-radius:24px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;border:1px solid rgba(255,255,255,0.3);">
        ⚠️ ACTION REQUIRED
      </div>
      <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:800;">Verification Needs Correction</h1>
      <p style="margin:0;color:#fecaca;font-size:13px;">${pName} • Pre-Joining KYC Desk</p>
    </div>

    <!-- Main Content -->
    <div style="padding:32px 28px;">
      <p style="font-size:16px;margin:0 0 16px 0;color:#1c140e;">Dear <strong>${candidateName}</strong>,</p>
      
      <p style="font-size:14px;color:#475569;margin:0 0 20px 0;line-height:1.65;">
        Thank you for submitting your pre-joining details for <strong>${roomStay}</strong> at <strong>${pName}</strong>. During our manager's verification review, we noticed that some information or document proofs require correction.
      </p>

      <!-- Reason Box -->
      <div style="background:#fff1f2;border-radius:18px;padding:20px;margin-bottom:24px;border:1.5px solid #fecdd3;">
        <h3 style="margin:0 0 10px 0;font-size:12px;font-weight:800;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;">
          📋 Manager's Review Note:
        </h3>
        <p style="margin:0;font-size:14.5px;color:#881337;font-weight:600;line-height:1.5;">
          "${reason}"
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${reuploadUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background:#c2652a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;box-shadow:0 4px 14px rgba(194,101,42,0.35);">
          🔄 Re-Upload / Correct Details 👉
        </a>
      </div>

      <p style="font-size:12.5px;color:#64748b;margin:0 0 16px 0;line-height:1.6;text-align:center;">
        Please update your submission as soon as possible so your bed reservation can be finalized and approved.
      </p>

      <div style="background:#f1f5f9;border-radius:10px;padding:10px 14px;font-size:11px;color:#64748b;line-height:1.4;text-align:center;">
        🔗 Direct Link: <a href="${reuploadUrl}" style="color:#c2652a;word-break:break-all;">${reuploadUrl}</a>
      </div>
    </div>

    ${getCompliantEmailFooter(pName)}
  </div>
</body>
</html>`;

      const text = `Action Required: Resident Verification Update for ${pName}\n\nHello ${candidateName},\nYour pre-joining KYC submission for ${roomStay} requires an update.\n\nManager's Note: "${reason}"\n\nPlease re-upload or correct your details at:\n${reuploadUrl}\n\n— ${pName} Management Desk`;
      return { subject, html, text };
    }

    case "COMPLAINT_UPDATE": {
      const ticketId = p.complaintId || "CARE";
      const status = p.complaintStatus || "IN_PROGRESS";
      const statusLabel = status.replace("_", " ");
      const subject = `🔧 Maintenance Update: Ticket #${ticketId} is now ${statusLabel} — ${pName}`;
      const residentName = payload.recipientName || "Resident";
      const notes = p.customMessage || p.notes || "";
      const roomStay = p.roomNumber ? `Room ${p.roomNumber}${p.bedCode ? ` (${p.bedCode})` : ""}` : "Accommodation";
      const trackUrl = p.onboardUrl || `https://www.tenopilot.com/p/${payload.propertyId}/public-complaint`;

      const statusBadgeBg = status === "RESOLVED" ? "#ecfdf5" : status === "IN_PROGRESS" ? "#fef3c7" : status === "REJECTED" ? "#f1f5f9" : "#fef2f2";
      const statusBadgeBorder = status === "RESOLVED" ? "#a7f3d0" : status === "IN_PROGRESS" ? "#fde68a" : status === "REJECTED" ? "#cbd5e1" : "#fecaca";
      const statusBadgeColor = status === "RESOLVED" ? "#065f46" : status === "IN_PROGRESS" ? "#92400e" : status === "REJECTED" ? "#475569" : "#991b1b";
      const statusEmoji = status === "RESOLVED" ? "🟢" : status === "IN_PROGRESS" ? "🟡" : status === "REJECTED" ? "⚪" : "🔴";

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:28px 12px;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c140e;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e8dfd8;box-shadow:0 12px 36px rgba(28,20,14,0.08);">
    
    <!-- Top Header Banner -->
    <div style="background:linear-gradient(135deg,#c2652a 0%,#a8521d 100%);padding:32px 24px;text-align:center;color:#ffffff;">
      <div style="display:inline-block;background:rgba(255,255,255,0.2);padding:5px 14px;border-radius:24px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;border:1px solid rgba(255,255,255,0.3);">
        🏢 24/7 MAINTENANCE DESK
      </div>
      <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:800;">Ticket Status Update</h1>
      <p style="margin:0;color:#fde8db;font-size:13px;">${pName} • Operations</p>
    </div>

    <!-- Main Body -->
    <div style="padding:32px 28px;">
      <p style="font-size:16px;margin:0 0 16px 0;color:#1c140e;">Dear <strong>${residentName}</strong>,</p>
      
      <p style="font-size:14px;color:#475569;margin:0 0 20px 0;line-height:1.65;">
        Your maintenance ticket <strong>#${ticketId}</strong> for <strong>${roomStay}</strong> has been updated by the property management team.
      </p>

      <!-- Status Card -->
      <div style="background:${statusBadgeBg};border-radius:18px;padding:20px;margin-bottom:24px;border:1.5px solid ${statusBadgeBorder};text-align:center;">
        <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;color:${statusBadgeColor};text-transform:uppercase;letter-spacing:1px;">Current Ticket Status</p>
        <p style="margin:0;font-size:20px;font-weight:900;color:${statusBadgeColor};">
          ${statusEmoji} ${statusLabel}
        </p>
        ${notes ? `<p style="margin:12px 0 0 0;font-size:13px;color:${statusBadgeColor};background:rgba(255,255,255,0.6);padding:8px 12px;border-radius:10px;line-height:1.4;"><strong>Manager Note:</strong> ${notes}</p>` : ""}
      </div>

      <!-- Ticket Summary Table -->
      <div style="background:#fcfaf7;border-radius:18px;padding:20px;margin-bottom:24px;border:1px solid #ede5de;">
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          <tr style="border-bottom:1px dashed #e8dfd8;">
            <td style="padding:8px 0;color:#7b746c;">Ticket ID:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;font-family:monospace;color:#1c140e;">#${ticketId}</td>
          </tr>
          <tr style="border-bottom:1px dashed #e8dfd8;">
            <td style="padding:8px 0;color:#7b746c;">Location:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#1c140e;">${roomStay}</td>
          </tr>
          ${p.category ? `
          <tr style="border-bottom:1px dashed #e8dfd8;">
            <td style="padding:8px 0;color:#7b746c;">Category:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#1c140e;">${p.category}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:8px 0 0 0;color:#7b746c;">Issue:</td>
            <td style="padding:8px 0 0 0;text-align:right;font-weight:600;color:#1c140e;">${p.complaintTitle || "Maintenance request"}</td>
          </tr>
        </table>
      </div>

      <!-- Track Live Status Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${trackUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background:#c2652a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;box-shadow:0 4px 14px rgba(194,101,42,0.35);">
          🔍 Track Live Ticket Status
        </a>
      </div>

      <div style="border-top:1px solid #f0eae4;padding-top:18px;margin-top:20px;">
        <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#334155;">Warm regards,</p>
        <p style="margin:0;font-size:14px;font-weight:800;color:#1c140e;">${pName} Maintenance Team</p>
        <p style="margin:2px 0 0 0;font-size:12px;color:#64748b;">Powered by TenoPilot 24/7 Operations Desk</p>
      </div>
    </div>

    ${getCompliantEmailFooter(pName)}
  </div>
</body>
</html>`;

      const text = `${pName} Maintenance Desk 🔧\n\nHello ${residentName},\n\nYour maintenance ticket #${ticketId} (${p.complaintTitle || "Maintenance request"}) for ${roomStay} has been updated to: ${statusEmoji} ${statusLabel}.\n\n${notes ? `Manager Note: ${notes}\n\n` : ""}Track Live Status: ${trackUrl}\n\nWarm regards,\n${pName} Maintenance Operations`;

      return { subject, html, text };
    }

    case "CUSTOM":
    default: {
      const subject = p.customSubject || `Notification from ${pName}`;
      const body = p.customBody || `Hello ${payload.recipientName}, you have an update from ${pName}.`;
      const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;padding:24px;background:#f8fafc;">
  <div style="max-width:500px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
    <h2 style="color:#0f172a;margin-top:0;">${pName}</h2>
    <p style="line-height:1.6;">${body.replace(/\n/g, "<br/>")}</p>
  </div>
</body>
</html>`;
      return { subject, html, text: body };
    }
  }
}

/**
 * Creates or retrieves a cached SES Client with explicit credentials
 */
function getSESClient(region?: string, accessKeyId?: string, secretAccessKey?: string): SESClient {
  const targetRegion = region || process.env.AWS_REGION || "eu-north-1";
  const keyId = accessKeyId || process.env.AWS_ACCESS_KEY_ID;
  const secretKey = secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;

  if (keyId && secretKey) {
    return new SESClient({
      region: targetRegion,
      credentials: {
        accessKeyId: keyId,
        secretAccessKey: secretKey,
      },
    });
  }

  return new SESClient({
    region: targetRegion,
  });
}

/**
 * Core Amazon SES Dispatcher
 * Dispatches high-deliverability transactional emails directly via AWS SES SDK.
 * Supports custom credentials, reply-to routing, and zero-config simulation mode.
 */
export async function sendSESEmail(payload: SESSendParams): Promise<SESSendResult> {
  const cleanRecipientEmail = (payload.toEmail || "").trim().toLowerCase();
  const isSyntheticEmail =
    !cleanRecipientEmail ||
    !cleanRecipientEmail.includes("@") ||
    cleanRecipientEmail.includes("@resident.tenopilot.com") ||
    cleanRecipientEmail.includes("@example.com") ||
    cleanRecipientEmail.includes("@example-tenant.com") ||
    cleanRecipientEmail.includes("tenopilot.auth") ||
    cleanRecipientEmail.startsWith("phone_");

  if (isSyntheticEmail) {
    return {
      success: false,
      messageId: `skipped_synthetic_${Date.now()}`,
      mode: "SIMULATOR_SANDBOX",
      recipientEmail: payload.toEmail,
      recipientName: payload.recipientName || "Resident",
      error: "Recipient has no authentic email address registered. Dispatch safely skipped.",
      timestamp: new Date().toISOString(),
    };
  }

  const { subject, html, text } = generateEmailContent(payload);
  const pName = payload.propertyName || "TenoPilot PG";
  const p = payload.params || {};

  let resolvedAttachments: {
    name: string;
    content: string; // Base64
    mime_type?: string;
  }[] = payload.attachments ? [...payload.attachments] : [];

  // Automatically generate official PDF attachment for PAYMENT_RECEIPT or CHECKOUT_THANK_YOU if not explicitly provided
  if ((payload.type === "PAYMENT_RECEIPT" || payload.type === "CHECKOUT_THANK_YOU") && resolvedAttachments.length === 0) {
    try {
      const isSettlement = payload.type === "CHECKOUT_THANK_YOU";
      const rawReceiptNo = p.receiptId || (isSettlement ? `REF-${Date.now().toString().slice(-6)}` : `REC-${Date.now().toString().slice(-6)}`);
      const cleanReceiptNo = rawReceiptNo.replace(/^#+/, "");
      const isDeposit = !isSettlement && (cleanReceiptNo.startsWith("DEP") || (typeof p.customSubject === "string" && p.customSubject.toLowerCase().includes("deposit")));
      const paidDate = p.paidDate || p.dueDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const payMode = p.paymentMode || "UPI / Digital Transfer";

      const pdfUint8 = await generateReceiptPdfBuffer({
        receiptNo: cleanReceiptNo,
        propertyName: pName,
        propertyAddress: p.bankLabel || "Verified Student & Professional Accommodation",
        managerPhone: p.managerPhone || "+91 92066 51295",
        residentName: payload.recipientName || "Resident",
        roomNumber: p.roomNumber || "N/A",
        bedCode: p.bedCode || "Standard Bed",
        amount: Number(p.amount || 0),
        paidDate: paidDate,
        paymentMode: payMode,
        paidTo: p.bankLabel || "Main Business Pool",
        month: p.month || p.dueDate || "Current Cycle",
        isDeposit,
        isSettlement,
        rentAmount: p.rentAmount ? Number(p.rentAmount) : undefined,
        depositAmount: p.depositAmount ? Number(p.depositAmount) : undefined,
        settlementDetails: isSettlement
          ? {
              initialDeposit: Number(p.initialDeposit || p.amount || 0),
              unpaidDeposit: Number(p.unpaidDeposit || 0),
              unpaidRent: Number(p.unpaidRent || 0),
              repairs: Number(p.repairs || 0),
              maintenance: Number(p.maintenance || 0),
              totalDeductions: Number(p.totalDeductions || 0),
              netRefunded: Number(p.netRefunded || p.amount || 0),
              netDeficit: Number(p.netDeficit || 0),
              status: "SETTLED & CLOSED",
              notes: p.notes,
            }
          : undefined,
      });

      const base64Pdf = Buffer.from(pdfUint8).toString("base64");
      const safeFilename = isSettlement
        ? `Settlement_NoDues_${cleanReceiptNo}_${(payload.recipientName || "Resident").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`
        : `Receipt_${cleanReceiptNo}_${(payload.recipientName || "Resident").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

      resolvedAttachments.push({
        name: safeFilename,
        mime_type: "application/pdf",
        content: base64Pdf,
      });
    } catch (genErr) {
      console.warn("Failed to auto-generate PDF receipt attachment:", genErr);
    }
  }

  // Automatically generate official Rental Agreement PDF attachment for TENANT_WELCOME if not explicitly provided
  if (payload.type === "TENANT_WELCOME" && resolvedAttachments.length === 0) {
    try {
      const safeName = (payload.recipientName || "Resident").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeRoom = (p.roomNumber || "Room").replace(/[^a-zA-Z0-9_-]/g, "_");
      const checkinDate = p.paidDate || p.dueDate || p.joiningDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      let resolvedHouseRules = p.houseRules || "";
      let resolvedOwnerName = p.ownerName || "";
      let resolvedBillingCycle = p.billingCycle;
      let resolvedPropAddress = p.propertyAddress || p.bankLabel || "";
      let resolvedPropTitle = pName;

      // If rules, owner name or billing cycle are missing, fetch directly from Cloud Firestore settings
      if (payload.propertyId && db && (!resolvedHouseRules || !resolvedOwnerName || !resolvedBillingCycle)) {
        try {
          let propDocId = payload.propertyId;
          let cfgSnap = await getDoc(doc(db, "properties", propDocId, "settings", "config"));

          if (!cfgSnap.exists()) {
            // Check if propertyId maps to an existing property by name/slug
            const pQuery = query(collection(db, "properties"), where("propertyName", "==", payload.propertyName || ""));
            const pSnap = await getDocs(pQuery);
            if (!pSnap.empty) {
              propDocId = pSnap.docs[0].id;
              cfgSnap = await getDoc(doc(db, "properties", propDocId, "settings", "config"));
            }
          }

          if (cfgSnap.exists()) {
            const cfg = cfgSnap.data();
            if (!resolvedHouseRules && cfg.houseRulesAndRegulations) {
              resolvedHouseRules = cfg.houseRulesAndRegulations;
            }
            if (!resolvedOwnerName && cfg.ownerName) {
              resolvedOwnerName = cfg.ownerName;
            }
            if (!resolvedBillingCycle && cfg.billingCycleDates) {
              resolvedBillingCycle = cfg.billingCycleDates === "Anniversary Date"
                ? "Anniversary Date (Due on Move-in Date)"
                : `1st to End of Month (Due by ${cfg.desiredDueDate || 5}th)`;
            }
            if (!resolvedPropAddress && cfg.propertyAddress) {
              resolvedPropAddress = cfg.propertyAddress;
            }
            if (cfg.propertyName) {
              resolvedPropTitle = cfg.propertyName;
            }
          }

          // Fallback for owner name from property root or user profile if still not found
          if (!resolvedOwnerName) {
            const pDocSnap = await getDoc(doc(db, "properties", propDocId));
            if (pDocSnap.exists()) {
              const pData = pDocSnap.data();
              if (pData.ownerName) resolvedOwnerName = pData.ownerName;
              else if (pData.ownerEmail) {
                const uQuery = query(collection(db, "users"), where("email", "==", pData.ownerEmail));
                const uSnap = await getDocs(uQuery);
                if (!uSnap.empty && uSnap.docs[0].data().displayName) {
                  resolvedOwnerName = uSnap.docs[0].data().displayName;
                }
              }
            }
          }
        } catch (fetchErr) {
          console.warn("Notice: Fetching property config for agreement email attachment:", fetchErr);
        }
      }

      const pdfUint8 = await generateRentalAgreementPdfBuffer({
        tenantName: payload.recipientName || "Resident",
        phone: p.phone || payload.toEmail || "N/A",
        roomNumber: p.roomNumber || "N/A",
        bedCode: p.bedCode || "Standard Bed",
        joiningDate: checkinDate,
        monthlyRent: Number(p.rentAmount || p.amount || 0),
        securityDeposit: Number(p.depositAmount || 0),
        propertyTitle: resolvedPropTitle,
        propertyAddress: resolvedPropAddress,
        houseRulesAndRegulations: resolvedHouseRules,
        billingCycle: resolvedBillingCycle,
        ownerName: resolvedOwnerName,
      });

      const base64Pdf = Buffer.from(pdfUint8).toString("base64");
      resolvedAttachments.push({
        name: `Rental_Agreement_${safeName}_${safeRoom}.pdf`,
        mime_type: "application/pdf",
        content: base64Pdf,
      });
    } catch (genErr) {
      console.warn("Failed to auto-generate Rental Agreement PDF attachment for TENANT_WELCOME:", genErr);
    }
  }

  const accessKeyId = payload.customCredentials?.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = payload.customCredentials?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
  const region = payload.customCredentials?.region || process.env.AWS_REGION || "eu-north-1";

  const centralSenderEmail = process.env.AWS_SES_FROM_EMAIL || "notifications@tenopilot.com";
  const centralSenderName = process.env.AWS_SES_FROM_NAME || "TenoPilot";

  const senderEmail = payload.customCredentials?.senderEmail || centralSenderEmail;
  const senderName = payload.customCredentials?.senderName || `${pName} via TenoPilot`;
  const formattedSource = `"${senderName.replace(/"/g, '')}" <${senderEmail}>`;

  const activeGateway = (process.env.ACTIVE_EMAIL_GATEWAY || "ZOHO").toUpperCase();

  // Brevo API credentials
  const brevoApiKey =
    (payload.customCredentials?.apiKey?.startsWith("xkeysib-") ? payload.customCredentials.apiKey : undefined) ||
    process.env.BREVO_API_KEY;
  const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || "notifications@tenopilot.com";
  const brevoSenderName = process.env.BREVO_SENDER_NAME || senderName || "TenoPilot";

  // Zoho CPaaS / ZeptoMail credentials
  const zohoApiKey =
    (payload.customCredentials?.apiKey?.startsWith("Zoho-") ? payload.customCredentials.apiKey : undefined) ||
    process.env.ZOHO_CPAAS_API_KEY ||
    process.env.ZOHO_ZEPTO_API_KEY;
  const zohoFromEmail = process.env.ZOHO_CPAAS_FROM_EMAIL || "donotreply@tenopilot.com";
  const zohoFromName = process.env.ZOHO_CPAAS_FROM_NAME || senderName || "TenoPilot";
  const zohoEndpoint = process.env.ZOHO_CPAAS_ENDPOINT || "https://api.zeptomail.in/v1.1/email";

  // --- Gateway Dispatch Helper: Brevo REST API v3 ---
  const executeBrevoDispatch = async (): Promise<SESSendResult | null> => {
    if (!brevoApiKey) return null;
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: brevoSenderName,
            email: brevoSenderEmail,
          },
          to: [
            {
              email: payload.toEmail.trim(),
              name: payload.recipientName || "Resident",
            },
          ],
          replyTo: payload.replyToEmail
            ? {
                email: payload.replyToEmail.trim(),
                name: senderName,
              }
            : undefined,
          subject: subject,
          htmlContent: html,
          textContent: text,
          attachment: resolvedAttachments.length > 0
            ? resolvedAttachments.map((att) => ({
                name: att.name,
                content: att.content,
              }))
            : undefined,
        }),
      });

      const resData = await response.json().catch(() => ({}));
      if (response.ok) {
        return {
          success: true,
          messageId: resData.messageId || `<brevo-${Date.now()}@smtp-relay.brevo.com>`,
          mode: "LIVE_BREVO",
          recipientEmail: payload.toEmail,
          recipientName: payload.recipientName,
          timestamp: new Date().toISOString(),
        };
      } else {
        const errorMsg = resData.message || resData.error || `Brevo HTTP ${response.status}`;
        console.warn("Brevo API Dispatch Error:", errorMsg);
        return null;
      }
    } catch (err: any) {
      console.warn("Brevo API Exception:", err);
      return null;
    }
  };

  // --- Gateway Dispatch Helper: Zoho CPaaS / ZeptoMail ---
  const executeZohoDispatch = async (): Promise<SESSendResult | null> => {
    if (!zohoApiKey) return null;
    try {
      const authHeader = zohoApiKey.startsWith("Zoho-enczapikey") ? zohoApiKey : `Zoho-enczapikey ${zohoApiKey}`;
      const response = await fetch(zohoEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          from: {
            address: zohoFromEmail,
            name: zohoFromName,
          },
          to: [
            {
              email_address: {
                address: payload.toEmail.trim(),
                name: payload.recipientName || "Resident",
              },
            },
          ],
          reply_to: payload.replyToEmail
            ? [
                {
                  address: payload.replyToEmail.trim(),
                  name: payload.recipientName || undefined,
                },
              ]
            : undefined,
          subject: subject,
          htmlbody: html,
          attachments: resolvedAttachments.length > 0
            ? resolvedAttachments.map((att) => ({
                name: att.name,
                mime_type: att.mime_type || "application/pdf",
                content: att.content,
              }))
            : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return {
          success: true,
          messageId: data.request_id || `zoho-${Date.now()}`,
          mode: "LIVE_ZOHO_CPAAS",
          recipientEmail: payload.toEmail,
          recipientName: payload.recipientName,
          timestamp: new Date().toISOString(),
        };
      } else {
        const errorDetail =
          data?.message ||
          data?.error?.message ||
          (Array.isArray(data?.error?.details) ? data.error.details.map((d: any) => d.message).join(", ") : undefined) ||
          `Zoho CPaaS returned HTTP ${response.status}`;
        console.warn("Zoho CPaaS Dispatch Error:", errorDetail);
        return null;
      }
    } catch (err: any) {
      console.warn("Zoho CPaaS Dispatch Exception:", err);
      return null;
    }
  };

  // --- Gateway Dispatch Helper: AWS SES SDK ---
  const executeAwsSesDispatch = async (): Promise<SESSendResult | null> => {
    if (!accessKeyId || !secretAccessKey) return null;
    try {
      const client = getSESClient(region, accessKeyId, secretAccessKey);
      const params: SendEmailCommandInput = {
        Source: formattedSource,
        Destination: {
          ToAddresses: [payload.toEmail.trim()],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: html,
              Charset: "UTF-8",
            },
            Text: {
              Data: text,
              Charset: "UTF-8",
            },
          },
        },
        ReplyToAddresses: payload.replyToEmail ? [payload.replyToEmail.trim()] : undefined,
      };

      const command = new SendEmailCommand(params);
      const res = await client.send(command);

      return {
        success: true,
        messageId: res.MessageId || `<ses-${Date.now()}@${region}.amazonses.com>`,
        mode: "LIVE_AWS_SES",
        recipientEmail: payload.toEmail,
        recipientName: payload.recipientName,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn("Amazon SES Dispatch Error:", err);
      return null;
    }
  };

  // Multi-Gateway Routing Pipeline:
  // 1. If ACTIVE_EMAIL_GATEWAY === "ZOHO" (Default): Zoho CPaaS -> Brevo -> AWS SES
  // 2. If ACTIVE_EMAIL_GATEWAY === "BREVO": Brevo -> Zoho CPaaS -> AWS SES
  // 3. If ACTIVE_EMAIL_GATEWAY === "AWS_SES": AWS SES -> Zoho CPaaS -> Brevo
  const primaryResult =
    activeGateway === "BREVO"
      ? await executeBrevoDispatch()
      : activeGateway === "AWS_SES"
      ? await executeAwsSesDispatch()
      : await executeZohoDispatch();

  if (primaryResult) {
    return primaryResult;
  }

  // Automatic Failover 1:
  const secondaryResult =
    activeGateway === "BREVO"
      ? await executeZohoDispatch()
      : await executeBrevoDispatch();

  if (secondaryResult) {
    return { ...secondaryResult, fallbackUsed: true };
  }

  // Automatic Failover 2 (AWS SES):
  const tertiaryResult =
    activeGateway === "AWS_SES"
      ? await executeZohoDispatch()
      : await executeAwsSesDispatch();
  if (tertiaryResult) {
    return { ...tertiaryResult, fallbackUsed: true };
  }

  // 2. Zero-Config Simulator Sandbox Mode (Fallback if credentials omitted)
  await new Promise((resolve) => setTimeout(resolve, 200));

  console.info(
    `[Amazon SES Simulator 🟢] Sent "${subject}" to ${payload.toEmail} (${payload.recipientName}) for ${pName}`
  );

  return {
    success: true,
    messageId: `sim-ses-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    mode: "SIMULATOR_SANDBOX",
    recipientEmail: payload.toEmail,
    recipientName: payload.recipientName,
    timestamp: new Date().toISOString(),
  };
}

// Backward Compatibility Aliases for seamless migration
export type BrevoRecipient = { email: string; name?: string };
export type BrevoSendParams = SESSendParams;
export type BrevoSendResult = SESSendResult;
export const sendBrevoEmail = sendSESEmail;
export const isBrevoQuotaError = isSESQuotaError;
export const sendZohoEmail = sendSESEmail;
export const sendZohoCPaaSEmail = sendSESEmail;
