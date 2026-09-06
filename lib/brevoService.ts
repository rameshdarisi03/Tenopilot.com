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
      const subject = `📢 Rent Payment Reminder — ${pName} (Room ${p.roomNumber || "N/A"})`;
      const upiText = p.upiId ? `UPI ID: ${p.upiId}${p.bankLabel ? ` (${p.bankLabel})` : ""}` : "Contact PG Front Desk";
      
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 24px;text-align:center;color:#ffffff;">
      <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">${pName}</h1>
      <p style="margin:0;color:#94a3b8;font-size:13px;">Official Rent Payment Notification</p>
    </div>

    <div style="padding:28px 24px;">
      <p style="font-size:15px;margin:0 0 16px 0;">Hello <strong>${payload.recipientName}</strong>,</p>
      <p style="font-size:14px;color:#475569;margin:0 0 24px 0;line-height:1.5;">
        This is a friendly reminder regarding your upcoming rent payment for your accommodation at <strong>${pName}</strong>.
      </p>

      <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #e2e8f0;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#64748b;">Room & Bed:</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:#0f172a;">Room ${p.roomNumber || "N/A"} (${p.bedCode || "Standard"})</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;">Rent Amount Due:</td>
            <td style="padding:6px 0;text-align:right;font-weight:800;font-size:18px;color:#059669;">₹${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;">Due Date:</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:#dc2626;">${p.dueDate || "5th of this month"}</td>
          </tr>
        </table>
      </div>

      <div style="background:#ecfdf5;border-radius:12px;padding:18px;margin-bottom:24px;border:1px solid #a7f3d0;text-align:center;">
        <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.5px;">Quick Payment Mode</p>
        <p style="margin:0;font-size:15px;font-weight:800;color:#047857;">${upiText}</p>
        <p style="margin:8px 0 0 0;font-size:12px;color:#065f46;">You can also scan the QR code available at the PG reception desk.</p>
      </div>

      <p style="font-size:13px;color:#64748b;margin:0;line-height:1.5;">
        If you have already made this payment, please disregard this notice or share the receipt with your property manager.
      </p>
    </div>

    <div style="background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
      Generated automatically via <a href="https://tenopilot.com" style="color:#0284c7;text-decoration:none;font-weight:600;">TenoPilot.com</a> Property Operating System.
    </div>
  </div>
</body>
</html>`;

      const text = `Hello ${payload.recipientName},\n\nRent reminder for ${pName}:\nRoom: ${p.roomNumber || "N/A"} (${p.bedCode || "Standard"})\nAmount Due: ₹${formattedAmount}\nDue Date: ${p.dueDate || "5th of this month"}\nPayment: ${upiText}\n\nGenerated via TenoPilot.com`;
      return { subject, html, text };
    }

    case "PAYMENT_RECEIPT": {
      const receiptNo = p.receiptId || `REC-${Date.now().toString().slice(-6)}`;
      const subject = `🧾 Payment Receipt: ${receiptNo} — ${pName}`;
      const paidDate = p.paidDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#064e3b 0%,#047857 100%);padding:28px 24px;text-align:center;color:#ffffff;">
      <span style="background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Official Payment Receipt</span>
      <h1 style="margin:10px 0 4px 0;font-size:22px;font-weight:800;">${pName}</h1>
      <p style="margin:0;color:#a7f3d0;font-size:13px;">Receipt #${receiptNo}</p>
    </div>

    <div style="padding:28px 24px;">
      <p style="font-size:15px;margin:0 0 16px 0;">Dear <strong>${payload.recipientName}</strong>,</p>
      <p style="font-size:14px;color:#475569;margin:0 0 24px 0;line-height:1.5;">
        Thank you for your payment. We have successfully received and verified your payment. Below are the official receipt details for your records:
      </p>

      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #e2e8f0;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr style="border-bottom:1px dashed #cbd5e1;">
            <td style="padding:8px 0;color:#64748b;">Receipt Number:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;font-family:monospace;color:#0f172a;">${receiptNo}</td>
          </tr>
          <tr style="border-bottom:1px dashed #cbd5e1;">
            <td style="padding:8px 0;color:#64748b;">Date Paid:</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#0f172a;">${paidDate}</td>
          </tr>
          <tr style="border-bottom:1px dashed #cbd5e1;">
            <td style="padding:8px 0;color:#64748b;">Room / Unit:</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#0f172a;">Room ${p.roomNumber || "N/A"} (${p.bedCode || "Standard"})</td>
          </tr>
          <tr style="border-bottom:1px dashed #cbd5e1;">
            <td style="padding:8px 0;color:#64748b;">Payment Mode:</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#0f172a;">${p.paymentMode || "UPI / Direct Transfer"}</td>
          </tr>
          <tr>
            <td style="padding:12px 0 4px 0;color:#0f172a;font-weight:700;">Total Amount Paid:</td>
            <td style="padding:12px 0 4px 0;text-align:right;font-weight:800;font-size:20px;color:#059669;">₹${formattedAmount}</td>
          </tr>
        </table>
      </div>

      <p style="font-size:13px;color:#64748b;margin:0;line-height:1.5;">
        This is an authentic digital receipt generated by ${pName} administration. Please preserve this receipt for your personal expense records.
      </p>
    </div>

    <div style="background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
      Verified & Issued by ${pName} • Powered by <a href="https://tenopilot.com" style="color:#0284c7;text-decoration:none;font-weight:600;">TenoPilot.com</a>
    </div>
  </div>
</body>
</html>`;

      const text = `Receipt #${receiptNo}\n\nDear ${payload.recipientName},\nPayment of ₹${formattedAmount} received for ${pName} (Room ${p.roomNumber || "N/A"}).\nDate: ${paidDate}\nPayment Mode: ${p.paymentMode || "UPI"}\n\nThank you!\n${pName} Management via TenoPilot`;
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
