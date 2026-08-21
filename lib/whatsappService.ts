// TenoPilot Centralized WhatsApp Cloud Service
// Supports both Official Meta Cloud API and Zero-Config Simulator Sandbox Mode

export interface WhatsAppSendParams {
  toPhone: string; // E.164 without leading plus or 10-digit Indian mobile number
  recipientName: string;
  propertyId: string;
  propertyName?: string;
  type: "RENT_REMINDER" | "PAYMENT_RECEIPT" | "ONBOARDING_INVITE" | "COMPLAINT_UPDATE" | "CUSTOM";
  params?: {
    roomNumber?: string;
    bedCode?: string;
    amount?: number | string;
    dueDate?: string;
    upiId?: string;
    bankLabel?: string;
    receiptId?: string;
    onboardUrl?: string;
    complaintId?: string;
    complaintTitle?: string;
    complaintStatus?: string;
    customMessage?: string;
  };
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId: string;
  mode: "LIVE_META_API" | "SIMULATOR_SANDBOX";
  recipientPhone: string;
  recipientName: string;
  error?: string;
  timestamp: string;
}

export function formatIndianPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  return digits;
}

export function generateWhatsAppMessageText(payload: WhatsAppSendParams): string {
  const pName = payload.propertyName || "TenoPilot PG & Living";
  const p = payload.params || {};

  switch (payload.type) {
    case "RENT_REMINDER": {
      const isCash = p.upiId === "CASH_PAYMENT" || p.upiId?.toLowerCase().includes("cash");
      const paymentInstr = isCash
        ? `💵 *Payment Mode*: Cash at Reception Desk (${p.bankLabel || "PG Front Desk"})`
        : `💳 *Pay via UPI ID*: ${p.upiId || "Contact Manager"}${p.bankLabel ? ` (${p.bankLabel})` : ""}\n👉 Tap to pay or scan QR in PG lobby.`;

      return (
        `👋 *Hello ${payload.recipientName}*,\n\n` +
        `Friendly rent payment reminder for *${pName}*:\n` +
        `🏠 *Room*: ${p.roomNumber || "N/A"} (${p.bedCode || "Standard Bed"})\n` +
        `💰 *Amount Due*: ₹${Number(p.amount || 0).toLocaleString("en-IN")}\n` +
        `📅 *Due Date*: ${p.dueDate || "5th of this month"}\n\n` +
        `${paymentInstr}\n\n` +
        `_Generated automatically via TenoPilot.com Operating System._`
      );
    }

    case "PAYMENT_RECEIPT": {
      return (
        `✅ *Rent Payment Confirmation — ${pName}*\n\n` +
        `Dear ${payload.recipientName},\n` +
        `We have received your rent payment of *₹${Number(p.amount || 0).toLocaleString("en-IN")}*.\n\n` +
        `🧾 *Receipt No*: ${p.receiptId || `REC-${Date.now().toString().slice(-6)}`}\n` +
        `🏠 *Room*: ${p.roomNumber || "N/A"}\n` +
        `📅 *Date*: ${new Date().toLocaleDateString("en-IN")}\n\n` +
        `Thank you for being a valued resident!\n` +
        `_${pName} Management via TenoPilot_`
      );
    }

    case "ONBOARDING_INVITE": {
      return (
        `🏢 *Welcome to ${pName}!* 🎉\n\n` +
        `Dear ${payload.recipientName},\n` +
        `Please complete your digital check-in and KYC registration on our tenant portal:\n\n` +
        `🔗 *Registration Link*: ${p.onboardUrl || "https://tenopilot.com"}\n\n` +
        `Please submit your ID proof and digital signature prior to check-in.\n` +
        `_${pName} Management_`
      );
    }

    case "COMPLAINT_UPDATE": {
      return (
        `🛠️ *Maintenance Ticket Update — ${pName}*\n\n` +
        `Dear ${payload.recipientName},\n` +
        `Your maintenance ticket *#${p.complaintId || "CARE"}* (${p.complaintTitle || "Maintenance issue"}) has been updated to: *${p.complaintStatus || "In Progress"}*.\n\n` +
        `Our team is addressing this promptly.\n` +
        `_${pName} Support Desk_`
      );
    }

    case "CUSTOM":
    default:
      return p.customMessage || `Hello ${payload.recipientName}, update from ${pName}.`;
  }
}

/**
 * Core WhatsApp Cloud Dispatch Engine
 */
export async function sendWhatsAppMessage(payload: WhatsAppSendParams): Promise<WhatsAppSendResult> {
  const formattedPhone = formatIndianPhoneNumber(payload.toPhone);
  const messageBody = generateWhatsAppMessageText(payload);

  const metaToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // 1. If Meta Production / Sandbox credentials exist in environment, execute live HTTP call
  if (metaToken && phoneNumberId) {
    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${metaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            preview_url: true,
            body: messageBody,
          },
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        console.warn("Meta WhatsApp API Error:", resData);
        return {
          success: false,
          messageId: `err-${Date.now()}`,
          mode: "LIVE_META_API",
          recipientPhone: formattedPhone,
          recipientName: payload.recipientName,
          error: resData.error?.message || "Failed to deliver via Meta WhatsApp Cloud API",
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        messageId: resData.messages?.[0]?.id || `wamid-${Date.now()}`,
        mode: "LIVE_META_API",
        recipientPhone: formattedPhone,
        recipientName: payload.recipientName,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn("Meta WhatsApp Cloud Network error:", err);
      return {
        success: false,
        messageId: `err-${Date.now()}`,
        mode: "LIVE_META_API",
        recipientPhone: formattedPhone,
        recipientName: payload.recipientName,
        error: err.message || "Network exception contacting WhatsApp Cloud API",
        timestamp: new Date().toISOString(),
      };
    }
  }

  // 2. Otherwise: Automatic Zero-Config Simulator Mode (for instant developer testing)
  // Adds realistic 300ms network simulation latency
  await new Promise((resolve) => setTimeout(resolve, 350));

  console.info(`[WhatsApp Simulator 🟢] Dispatched to +${formattedPhone} for ${payload.recipientName}:`, messageBody);

  return {
    success: true,
    messageId: `sim-wamid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    mode: "SIMULATOR_SANDBOX",
    recipientPhone: formattedPhone,
    recipientName: payload.recipientName,
    timestamp: new Date().toISOString(),
  };
}
