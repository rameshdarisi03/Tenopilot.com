// TenoPilot Centralized Brevo (Sendinblue) Transactional Email Service
// Supports Live Brevo v3 REST API and Zero-Config Simulator Sandbox Mode

export interface BrevoRecipient {
  email: string;
  name?: string;
}

export interface BrevoSendParams {
  toEmail: string;
  recipientName: string;
  propertyId: string;
  propertyName?: string;
  replyToEmail?: string;
  type: "RENT_REMINDER" | "PAYMENT_RECEIPT" | "ONBOARDING_INVITE" | "TEST_PING" | "CUSTOM";
  params?: {
    roomNumber?: string;
    bedCode?: string;
    amount?: number | string;
    dueDate?: string;
    upiId?: string;
    bankLabel?: string;
    accountType?: string;
    receiptId?: string;
    paymentMode?: string;
    paidDate?: string;
    onboardUrl?: string;
    customSubject?: string;
    customBody?: string;
  };
  customCredentials?: {
    apiKey: string;
    senderEmail?: string;
    senderName?: string;
  };
}

export interface BrevoSendResult {
  success: boolean;
  messageId: string;
  mode: "LIVE_BREVO_API" | "SIMULATOR_SANDBOX";
  recipientEmail: string;
  recipientName: string;
  fallbackUsed?: boolean;
  error?: string;
  timestamp: string;
}

/**
 * Checks if a Brevo error response indicates a quota/credit limit exhaustion
 */
export function isBrevoQuotaError(errorMsg?: string, statusCode?: number): boolean {
  if (statusCode === 402 || statusCode === 429) return true;
  if (!errorMsg) return false;
  const lower = errorMsg.toLowerCase();
  return (
    lower.includes("not_enough_credits") ||
    lower.includes("quota") ||
    lower.includes("limit reached") ||
    lower.includes("insufficient credit") ||
    lower.includes("daily limit")
  );
}

/**
 * Generate High-Converting HTML and Subject Line for Transactional Emails
 */
export function generateEmailContent(payload: BrevoSendParams): { subject: string; html: string; text: string } {
  const pName = payload.propertyName || "TenoPilot PG & Living";
  const p = payload.params || {};
  const formattedAmount = Number(p.amount || 0).toLocaleString("en-IN");

  switch (payload.type) {
    case "RENT_REMINDER": {
      const isCash = p.upiId === "CASH_PAYMENT" || p.upiId?.toLowerCase().includes("cash") || p.accountType === "CASH_DESK";
      const subject = isCash
        ? `🏠 Rent Payment Notice (Pay by Cash) for Room ${p.roomNumber || "N/A"} — ${pName}`
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
      <p style="margin:0;color:#cbd5e1;font-size:13px;">Official Notice for Room ${p.roomNumber || "N/A"} (${p.bedCode || "Standard Bed"})</p>
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

    <!-- Footer -->
    <div style="background:#f8fafc;padding:18px 24px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
      Delivered securely via <a href="https://tenopilot.com" style="color:#0284c7;text-decoration:none;font-weight:600;">TenoPilot.com</a> Operating System.
    </div>
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

    <!-- Footer -->
    <div style="background:#f8fafc;padding:18px 24px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
      Verified & Issued by ${pName} • Powered by <a href="https://tenopilot.com" style="color:#0284c7;text-decoration:none;font-weight:600;">TenoPilot.com</a>
    </div>
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

    <div style="background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
      ${pName} Administration • Powered by <a href="https://tenopilot.com" style="color:#0284c7;text-decoration:none;font-weight:600;">TenoPilot.com</a>
    </div>
  </div>
</body>
</html>`;

      const text = `Welcome to ${pName}!\n\nHello ${payload.recipientName},\nPlease complete your digital check-in and KYC at: ${onboardUrl}\n\n${pName} Management`;
      return { subject, html, text };
    }

    case "TEST_PING": {
      const subject = `✅ [TenoPilot] Brevo Transactional Email Gateway Verified`;
      const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;padding:24px;background:#f8fafc;">
  <div style="max-width:500px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
    <h2 style="color:#059669;margin-top:0;">✅ Brevo Gateway Verification Successful!</h2>
    <p>This test email confirms that your transactional email gateway is configured and operating correctly on <strong>TenoPilot.com</strong>.</p>
    <p style="font-size:13px;color:#64748b;">Timestamp: ${new Date().toISOString()}<br/>Target Property: ${pName}</p>
  </div>
</body>
</html>`;
      const text = `Brevo Gateway Verified successfully for ${pName} at ${new Date().toISOString()}.`;
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
 * Core Brevo REST API v3 Dispatcher
 * Automatically routes through custom PG credentials when provided,
 * or defaults to platform central Brevo credentials.
 * If credentials are not configured, runs in Zero-Config Simulator Sandbox Mode.
 */
export async function sendBrevoEmail(payload: BrevoSendParams): Promise<BrevoSendResult> {
  const { subject, html, text } = generateEmailContent(payload);
  const pName = payload.propertyName || "TenoPilot PG";

  // Check for custom credentials or central environment credentials
  const apiKey = payload.customCredentials?.apiKey || process.env.BREVO_API_KEY;
  const centralSenderEmail = process.env.BREVO_SENDER_EMAIL || "notifications@tenopilot.com";
  const centralSenderName = process.env.BREVO_SENDER_NAME || "TenoPilot Notifications";

  const senderEmail = payload.customCredentials?.senderEmail || centralSenderEmail;
  const senderName = payload.customCredentials?.senderName || `${pName} via TenoPilot`;

  // 1. If API Key is present, execute live HTTP request to Brevo v3 API
  if (apiKey) {
    try {
      const requestBody: any = {
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: payload.toEmail.trim(),
            name: payload.recipientName,
          },
        ],
        subject: subject,
        htmlContent: html,
        textContent: text,
      };

      // Add dynamic reply-to if specified
      if (payload.replyToEmail) {
        requestBody.replyTo = {
          email: payload.replyToEmail.trim(),
          name: pName,
        };
      }

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = resData.message || resData.error || `Brevo HTTP ${response.status}`;
        console.warn("Brevo API Dispatch Error:", resData);

        return {
          success: false,
          messageId: `err-${Date.now()}`,
          mode: "LIVE_BREVO_API",
          recipientEmail: payload.toEmail,
          recipientName: payload.recipientName,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        messageId: resData.messageId || `<brevo-${Date.now()}@smtp-relay.brevo.com>`,
        mode: "LIVE_BREVO_API",
        recipientEmail: payload.toEmail,
        recipientName: payload.recipientName,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn("Brevo Network Exception:", err);
      return {
        success: false,
        messageId: `err-${Date.now()}`,
        mode: "LIVE_BREVO_API",
        recipientEmail: payload.toEmail,
        recipientName: payload.recipientName,
        error: err.message || "Network exception reaching Brevo API",
        timestamp: new Date().toISOString(),
      };
    }
  }

  // 2. Otherwise: Automatic Zero-Config Simulator Sandbox Mode
  await new Promise((resolve) => setTimeout(resolve, 250));

  console.info(
    `[Brevo Email Simulator 🟢] Sent "${subject}" to ${payload.toEmail} (${payload.recipientName}) for ${pName}`
  );

  return {
    success: true,
    messageId: `sim-brevo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    mode: "SIMULATOR_SANDBOX",
    recipientEmail: payload.toEmail,
    recipientName: payload.recipientName,
    timestamp: new Date().toISOString(),
  };
}
