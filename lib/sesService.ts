// TenoPilot Centralized Amazon Simple Email Service (SES) Transactional Email Engine
// Replaces third-party providers with direct, ultra-high deliverability AWS SES v2 infrastructure

import { SESClient, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";

export interface SESSendParams {
  toEmail: string;
  recipientName: string;
  propertyId: string;
  propertyName?: string;
  replyToEmail?: string;
  type: "RENT_REMINDER" | "PAYMENT_RECEIPT" | "ONBOARDING_INVITE" | "TEST_PING" | "CHECKOUT_THANK_YOU" | "AUTH_OTP" | "OWNER_WELCOME" | "SUBSCRIPTION_INVOICE" | "CUSTOM";
  params?: {
    otpCode?: string;
    roomNumber?: string;
    bedCode?: string;
    amount?: number | string;
    dueDate?: string;
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
  };
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
      <p style="margin:0 0 4px 0;font-weight:700;color:#64748b;">${pName} • Powered by <a href="https://tenopilot.com" style="color:#c2652a;text-decoration:none;font-weight:600;">TenoPilot.com</a></p>
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

      const text = `Hello ${payload.recipientName},\n\nFriendly rent payment reminder for ${pName}:\n🏠 Resident: ${payload.recipientName}\n🏠 Room: Room ${p.roomNumber || "N/A"} (${p.bedCode || "Standard Bed"})\n💰 Amount Due: ₹${formattedAmount}\n📅 Due Date: ${p.dueDate || "5th of this month"}\n💳 Payment Mode: ${upiText}\n\nThank you for being a valued resident of ${pName}!\n\n${pName} Management Desk\nGenerated via TenoPilot.com`;
      return { subject, html, text };
    }

    case "PAYMENT_RECEIPT": {
      const receiptNo = p.receiptId || `REC-${Date.now().toString().slice(-6)}`;
      const subject = `🧾 Official Payment Receipt #${receiptNo} — ${pName} (Room ${p.roomNumber || "N/A"})`;
      const paidDate = p.paidDate || p.dueDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const payMode = p.paymentMode || "UPI / Digital Transfer";

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
      <p style="margin:0;color:#a7f3d0;font-size:13px;font-family:monospace;letter-spacing:0.5px;">Receipt #${receiptNo}</p>
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
            <td style="padding:10px 0;text-align:right;font-weight:700;font-family:monospace;color:#0f172a;">${receiptNo}</td>
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

      const text = `Official Payment Receipt #${receiptNo}\n\nDear ${payload.recipientName},\n\nWe have received and verified your payment of ₹${formattedAmount} for ${pName} (Room ${p.roomNumber || "N/A"}).\n\nDate: ${paidDate}\nPayment Mode: ${payMode}\nReceipt No: #${receiptNo}\nStatus: Verified & Logged in Property Ledger\n\nThank you for being a valued resident!\n${pName} Administration via TenoPilot.com`;
      return { subject, html, text };
    }

    case "ONBOARDING_INVITE": {
      const subject = `🏢 Welcome to ${pName}! Complete Your Digital Check-In`;
      const onboardUrl = p.onboardUrl || "https://tenopilot.com";

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:28px 24px;text-align:center;color:#ffffff;">
      <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:800;">Welcome to ${pName}! 🎉</h1>
      <p style="margin:0;color:#bfdbfe;font-size:13px;">Digital Resident Onboarding & KYC</p>
    </div>

    <div style="padding:28px 24px;">
      <p style="font-size:15px;margin:0 0 16px 0;">Hello <strong>${payload.recipientName}</strong>,</p>
      <p style="font-size:14px;color:#475569;margin:0 0 24px 0;line-height:1.5;">
        We are excited to welcome you to <strong>${pName}</strong>. To ensure a smooth check-in experience, please complete your digital resident registration and Aadhaar KYC verification.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${onboardUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;box-shadow:0 4px 10px rgba(37,99,235,0.25);">
          Complete Digital Check-In 👉
        </a>
      </div>

      <p style="font-size:13px;color:#64748b;margin:0;line-height:1.5;">
        Please have your government photo ID (Aadhaar/Passport) and emergency contact information handy. It only takes about 2 minutes.
      </p>
    </div>

    ${getCompliantEmailFooter(pName)}
  </div>
</body>
</html>`;

      const text = `Welcome to ${pName}!\n\nHello ${payload.recipientName},\nPlease complete your digital check-in and KYC at: ${onboardUrl}\n\n${pName} Management`;
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
      const downloadLink = p.receiptUrl || `https://tenopilot.com/api/receipt/pdf?receiptNo=${encodeURIComponent(receiptNo)}&isSettlement=true&residentName=${encodeURIComponent(payload.recipientName)}&propertyName=${encodeURIComponent(pName)}`;

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
        <a href="https://tenopilot.com/login" style="display:inline-block;padding:14px 36px;background:#c2652a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;box-shadow:0 4px 14px rgba(194,101,42,0.35);">
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

      const text = `TenoPilot.com 🚀\nThe Intelligent Operating System for Coliving & Student Housing\n\nWelcome to TenoPilot, ${ownerName}!\n\nCongratulations! ${pName} is officially ready and live 🎉\n\nWe built TenoPilot specifically for visionary PG & coliving owners like you—to eliminate messy registers, separate your security deposits from monthly rent, and put your daily collections on autopilot.\n\nYOUR WORKSPACE HIGHLIGHTS:\n• Property: ${pName}\n• FastTrack Migration: 1-Click AI paper register / diary scanner\n• Automated Reminders: WhatsApp digital invoices & check-in KYC\n\n👉 Open Your Workspace:\nhttps://tenopilot.com/login\n\nQuick Login Tip:\nLog in directly with your registered mobile number (${ownerPhone})${ownerEmail ? ` or email (${ownerEmail})` : ""} anytime to access your property dashboard.\n\nNeed assistance setting up your room layout or migrating your paper registers?\nTap reply or call our Founder Support Desk directly at +91 92066 51295.\n\nWelcome aboard,\nTeam TenoPilot 🏢✨`;

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
  const { subject, html, text } = generateEmailContent(payload);
  const pName = payload.propertyName || "TenoPilot PG";

  const accessKeyId = payload.customCredentials?.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = payload.customCredentials?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
  const region = payload.customCredentials?.region || process.env.AWS_REGION || "eu-north-1";

  const centralSenderEmail = process.env.AWS_SES_FROM_EMAIL || "notifications@tenopilot.com";
  const centralSenderName = process.env.AWS_SES_FROM_NAME || "TenoPilot";

  const senderEmail = payload.customCredentials?.senderEmail || centralSenderEmail;
  const senderName = payload.customCredentials?.senderName || `${pName} via TenoPilot`;
  const formattedSource = `"${senderName.replace(/"/g, '')}" <${senderEmail}>`;

  const activeGateway = (process.env.ACTIVE_EMAIL_GATEWAY || "BREVO").toUpperCase();

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
  // 1. If ACTIVE_EMAIL_GATEWAY === "BREVO": Brevo -> Zoho -> AWS SES
  // 2. If ACTIVE_EMAIL_GATEWAY === "ZOHO": Zoho -> Brevo -> AWS SES
  // 3. Otherwise: AWS SES -> Brevo -> Zoho
  const primaryResult =
    activeGateway === "BREVO"
      ? await executeBrevoDispatch()
      : activeGateway === "ZOHO"
      ? await executeZohoDispatch()
      : await executeAwsSesDispatch();

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
  const tertiaryResult = await executeAwsSesDispatch();
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
