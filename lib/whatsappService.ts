import { doc, setDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

export interface WhatsAppSendParams {
  toPhone: string; // E.164 without leading plus or 10-digit Indian mobile number
  recipientName: string;
  propertyId: string;
  propertyName?: string;
  occupantId?: string;
  type: "RENT_REMINDER" | "PAYMENT_RECEIPT" | "ONBOARDING_INVITE" | "TENANT_WELCOME" | "COMPLAINT_UPDATE" | "CHECKOUT_THANK_YOU" | "OWNER_WELCOME" | "SUBSCRIPTION_INVOICE" | "KYC_CORRECTION_REQUEST" | "CUSTOM";
  params?: {
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
    paidDate?: string;
    paymentMode?: string;
    month?: string;
    rentAmount?: string | number;
    depositAmount?: string | number;
    parkingAmount?: string | number;
    onboardUrl?: string;
    complaintId?: string;
    complaintTitle?: string;
    complaintStatus?: string;
    customMessage?: string;
    recipientEmail?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    planName?: string;
    rejectionReason?: string;
    joiningDate?: string;
    propertyAddress?: string;
    houseRules?: string;
    billingCycle?: string;
    ownerName?: string;
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
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  while (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length === 14 && digits.startsWith("9191")) {
    digits = digits.slice(2);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  return digits;
}

/**
 * 🇮🇳 Strips any leading +91 or 91 country code and leading zeros to return a clean 10-digit Indian mobile number
 */
export function cleanIndianMobileNumber(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  while (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  if (digits.length === 14 && digits.startsWith("9191")) {
    digits = digits.slice(4);
  }
  return digits.slice(-10);
}

export function generateWhatsAppMessageText(payload: WhatsAppSendParams): string {
  const pName = payload.propertyName || "TenoPilot PG & Living";
  const p = payload.params || {};

  switch (payload.type) {
    case "RENT_REMINDER": {
      const isCash = p.upiId === "CASH_PAYMENT" || p.upiId === "CASH" || p.upiId?.toLowerCase().includes("cash") || p.accountType === "CASH_DESK";
      const isBank = p.accountType === "BANK_TRANSFER" || (!isCash && !p.upiId?.includes("@") && Boolean(p.bankLabel));

      const payHeader = isCash ? "Pay via Cash" : isBank ? "Pay to Bank" : "Pay to UPI";
      const payDest = isCash
        ? (p.bankLabel ? `Cash at Desk (${p.bankLabel})` : "Cash at Front Desk / Reception")
        : (p.upiId || "PG Reception / Manager UPI");

      return (
        `"**${pName}**"\n\n` +
        `Hello ${payload.recipientName},\n\n` +
        `This is a friendly reminder regarding your monthly accommodation rent for ${p.roomNumber || "N/A"}${p.bedCode ? ` - ${p.bedCode}` : ""}:\n\n` +
        `💰 Amount Due: INR ${Number(p.amount || 0).toLocaleString("en-IN")}\n` +
        `📅 Due Date: ${p.dueDate || "5th of this month"}\n` +
        `💳 ${payHeader}: ${payDest}\n\n` +
        `Kindly clear your dues and share transaction proof for your digital receipt.\n\n` +
        `Thank you for being a valued resident!\n\n` +
        `*- ${pName}*`
      );
    }

    case "PAYMENT_RECEIPT": {
      const receiptNo = p.receiptId || `REC-${Date.now().toString().slice(-6)}`;
      const paidDate = p.paidDate || p.dueDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const payMode = p.paymentMode || "UPI / Digital Transfer";

      return (
        `*${pName}*\n` +
        `Greetings from ${pName} Management! 🌟\n\n` +
        `Dear *${payload.recipientName}*,\n\n` +
        `We have successfully received and verified your payment. Thank you for clearing your accommodation dues promptly! 🟢\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `🧾 *Receipt Number*: ${receiptNo}\n` +
        `💵 *Amount Received*: ₹${Number(p.amount || 0).toLocaleString("en-IN")}\n` +
        `📅 *Date Paid*: ${paidDate}\n` +
        `💳 *Payment Mode*: ${payMode}\n` +
        `🏠 *Stay Details*: Room ${p.roomNumber || "N/A"} (${p.bedCode || "Standard Bed"})\n` +
        `🏢 *Property*: ${pName}\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `✅ *Status*: Fully Verified & Recorded in Property Ledger\n` +
        `📄 _This electronic confirmation serves as your authentic proof of payment._\n\n` +
        `Thank you for being a valued resident of ${pName}!\n\n` +
        `Warm regards,\n` +
        `*${pName} Administration*`
      );
    }

    case "ONBOARDING_INVITE": {
      return (
        `*${pName}*\n` +
        `Welcome to ${pName}! 🎉\n\n` +
        `Dear *${payload.recipientName}*,\n\n` +
        `We are delighted to welcome you to our community! To ensure a seamless check-in experience, please complete your digital resident registration and KYC:\n\n` +
        `🔗 *Registration Link*: ${p.onboardUrl || "https://www.tenopilot.com"}\n\n` +
        `Please have your photo ID handy. It takes only 2 minutes.\n\n` +
        `Warm regards,\n` +
        `*${pName} Administration*`
      );
    }

    case "TENANT_WELCOME": {
      const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` (${p.bedCode})` : ""}`;
      const checkinDate = p.paidDate || p.dueDate || p.joiningDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const tariffStr = p.rentAmount || p.amount ? `\n💰 *Monthly Tariff*: ₹${Number(p.rentAmount || p.amount).toLocaleString("en-IN")}` : "";

      return (
        `*${pName}*\n` +
        `Welcome to ${pName}! 🎉\n\n` +
        `Dear *${payload.recipientName}*,\n\n` +
        `Congratulations! Your resident check-in and KYC documents have been officially *APPROVED* by management. 🥳\n\n` +
        `🏠 *Allocated Stay*: Room ${roomStay}\n` +
        `📅 *Move-In Date*: ${checkinDate}` +
        tariffStr + `\n\n` +
        `📎 *ATTACHMENT*: Official Residential Lease & Tenancy Agreement (PDF) is attached to this message.\n\n` +
        (p.onboardUrl ? `🔗 *Resident Portal*: ${p.onboardUrl}\n\n` : "") +
        `Your room key and welcome kit are ready at reception. We are thrilled to have you with us!\n\n` +
        `Warm regards,\n` +
        `*${pName} Management Desk*`
      );
    }

    case "COMPLAINT_UPDATE": {
      return (
        `*${pName}*\n` +
        `Greetings from ${pName} Support Desk!\n\n` +
        `Dear *${payload.recipientName}*,\n\n` +
        `Your maintenance ticket *#${p.complaintId || "CARE"}* (${p.complaintTitle || "Maintenance issue"}) has been updated to: *${p.complaintStatus || "In Progress"}*.\n\n` +
        `Our team is addressing this promptly.\n\n` +
        `Warm regards,\n` +
        `*${pName} Support Desk*`
      );
    }

    case "CHECKOUT_THANK_YOU": {
      const receiptLink = p.receiptUrl ? `\n\n📄 _Download your official Settlement PDF Receipt:_ \n${p.receiptUrl}` : "";
      return (
        `*${pName}*\n` +
        `Thank You for Staying With Us! 🌟\n\n` +
        `Dear *${payload.recipientName}*,\n\n` +
        `Thank you for choosing *${pName}* as your home! It was an absolute pleasure having you with us, and we wish you great success and happiness in your next chapter.\n\n` +
        `Your room handover and move-out security deposit settlement have been finalized.\n\n` +
        `📄 Your official *Check-Out & Deposit Settlement Receipt* is attached with all the settlement details and breakdown for your reference.${receiptLink}\n\n` +
        `You and your friends are always welcome back at ${pName}! Keep in touch!\n\n` +
        `Warm regards,\n` +
        `*${pName} Management*${p.managerPhone ? `\n📞 ${p.managerPhone}` : ""}`
      );
    }

    case "OWNER_WELCOME": {
      const ownerName = payload.recipientName || "Property Owner";
      const propName = payload.propertyName || "Your Property";
      const ownerPhone = p.managerPhone || payload.toPhone || "";
      const ownerEmail = p.recipientEmail || "";

      return (
        `*TenoPilot.com* 🚀\n` +
        `The Intelligent Operating System for Coliving & Student Housing\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✨ *Welcome to TenoPilot, ${ownerName}!* \n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Congratulations! *${propName}* is officially ready and live 🎉\n\n` +
        `We built TenoPilot specifically for visionary PG & coliving owners like you—to eliminate messy registers, separate your security deposits from monthly rent, and put your daily collections on autopilot.\n\n` +
        `🏢 *YOUR WORKSPACE HIGHLIGHTS:*\n` +
        `• *Property*: ${propName}\n` +
        `• *FastTrack Migration*: 1-Click AI paper register / diary scanner\n` +
        `• *Automated Reminders*: WhatsApp digital invoices & check-in KYC\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 *Open Your Workspace*\n` +
        `https://www.tenopilot.com/login\n\n` +
        `🔐 *Quick Login Tip*:\n` +
        `Log in directly with your registered mobile number (*${ownerPhone}*)${ownerEmail ? ` or email (*${ownerEmail}*)` : ""} anytime to access your property dashboard.\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Need assistance setting up your room layout or migrating your paper registers?\n` +
        `Tap reply or call our Founder Support Desk directly at *+91 92066 51295*.\n\n` +
        `Welcome aboard,\n` +
        `*Team TenoPilot* 🏢✨`
      );
    }

    case "SUBSCRIPTION_INVOICE": {
      const ownerName = payload.recipientName || "Property Partner";
      const invoiceNo = p.receiptId || `INV-${Date.now().toString().slice(-6)}`;
      const planName = p.planName || p.bankLabel || "Pro Plan";
      const invoiceUrl = p.receiptUrl || "";

      return (
        `*TenoPilot.com* 🚀\n\n` +
        `Congratulations, *${ownerName}*! 🎉\n\n` +
        `Welcome to *TenoPilot Pro*! Your subscription for *${pName}* (${planName}) has been successfully activated.\n\n` +
        `Attached is your official Tax Invoice & Payment Receipt (*#${invoiceNo}*) for your records.\n\n` +
        (invoiceUrl ? `📄 *Download Invoice*: ${invoiceUrl}\n\n` : "") +
        `We are thrilled to partner with you to put your coliving operations on autopilot. If you need any assistance, our Founder Support Desk is always here for you at *+91 92066 51295*.\n\n` +
        `Warm regards,\n` +
        `*Team TenoPilot* 🏢✨`
      );
    }

    case "KYC_CORRECTION_REQUEST": {
      const candidateName = payload.recipientName || "Resident";
      const reason = p.rejectionReason || p.customMessage || "Please re-upload clear identity documents.";
      const reuploadUrl = p.onboardUrl || "https://www.tenopilot.com";
      const roomStay = p.roomNumber ? `Room ${p.roomNumber}${p.bedCode ? ` (${p.bedCode})` : ""}` : "Accommodation";

      return (
        `*${pName}* 🏢\n` +
        `Resident Onboarding Verification\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚠️ *Action Required: Verification Update*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Hello *${candidateName}*,\n\n` +
        `Your pre-joining KYC submission for *${roomStay}* at *${pName}* was reviewed by property management.\n\n` +
        `📝 *Reason for Update / Re-upload*:\n` +
        `"${reason}"\n\n` +
        `Please click the link below to update your details or re-upload clear photos so we can approve your check-in:\n\n` +
        `👉 *Update Verification Here*:\n` +
        `${reuploadUrl}\n\n` +
        `If you have questions, please contact reception desk.\n\n` +
        `Warm regards,\n` +
        `*${pName} Management Desk*`
      );
    }

    case "CUSTOM":
    default:
      return `*${pName}*\n\n${p.customMessage || `Hello ${payload.recipientName}, update from ${pName}.`}`;
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
      let requestBody: any;

      if (payload.type === "RENT_REMINDER") {
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` - ${p.bedCode}` : ""}`;
        const amountStr = Number(p.amount || 0).toLocaleString("en-IN");
        const dueDateStr = p.dueDate || "5th of this month";

        const isCash = p.upiId === "CASH_PAYMENT" || p.upiId === "CASH" || p.upiId?.toLowerCase().includes("cash") || p.accountType === "CASH_DESK";
        const isBank = p.accountType === "BANK_TRANSFER" || (!isCash && !p.upiId?.includes("@") && Boolean(p.bankLabel));

        const payHeader = isCash ? "Pay via Cash" : isBank ? "Pay to Bank" : "Pay to UPI";
        const payDest = isCash
          ? (p.bankLabel ? `Cash at Desk (${p.bankLabel})` : "Cash at Front Desk / Reception")
          : (p.upiId || "PG Reception / Manager UPI");

        requestBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_rent_due_v2",
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: pName },
                  { type: "text", text: payload.recipientName },
                  { type: "text", text: roomStay },
                  { type: "text", text: amountStr },
                  { type: "text", text: dueDateStr },
                  { type: "text", text: payHeader },
                  { type: "text", text: payDest },
                ],
              },
            ],
          },
        };
      } else if (payload.type === "TENANT_WELCOME") {
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` - ${p.bedCode}` : ""}`;
        const checkinDate = p.paidDate || p.dueDate || p.joiningDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tenopilot.com";

        const agreementParams = new URLSearchParams({
          propertyId: payload.propertyId || "",
          tenantName: payload.recipientName,
          phone: payload.toPhone,
          roomNumber: p.roomNumber || "N/A",
          bedCode: p.bedCode || "Standard Bed",
          joiningDate: checkinDate,
          monthlyRent: String(p.rentAmount || p.amount || 0),
          securityDeposit: String(p.depositAmount || 0),
          propertyName: pName,
          propertyAddress: p.propertyAddress || "",
        });
        if (p.houseRules) {
          agreementParams.set("houseRules", p.houseRules);
        }
        if (p.billingCycle) {
          agreementParams.set("billingCycle", p.billingCycle);
        }
        if (p.ownerName) {
          agreementParams.set("ownerName", p.ownerName);
        }
        const pdfUrl = `${baseUrl}/api/agreement/pdf?${agreementParams.toString()}`;
        const safeName = (payload.recipientName || "Resident").replace(/[^a-zA-Z0-9_-]/g, "_");
        const safeRoom = (p.roomNumber || "Room").replace(/[^a-zA-Z0-9_-]/g, "_");
        const fileName = `Rental_Agreement_${safeName}_${safeRoom}.pdf`;

        // 📎 Send official Rental Agreement PDF as a native WhatsApp Document Attachment
        requestBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "document",
          document: {
            link: pdfUrl,
            filename: fileName,
            caption: `🎉 Welcome to ${pName}, ${payload.recipientName}!\n\nAttached is your official digitally attested Residential Tenancy & Lease Agreement (Room ${roomStay}).\n\nCheck-In Date: ${checkinDate}\n\n— Management Desk`,
          },
        };
      } else if (payload.type === "ONBOARDING_INVITE") {
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` - ${p.bedCode}` : ""}`;
        const checkinDate = p.paidDate || p.dueDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const tariffStr = String(p.amount || "12000");

        if (!p.onboardUrl) {
          requestBody = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "template",
            template: {
              name: "pg_welcome_onboarding",
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: payload.recipientName },
                    { type: "text", text: pName },
                    { type: "text", text: roomStay },
                    { type: "text", text: checkinDate },
                  ],
                },
              ],
            },
          };
        } else {
          // Attempt dedicated Self-KYC Invite Link template
          requestBody = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "template",
            template: {
              name: "pg_self_kyc_invite_link",
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: pName },
                    { type: "text", text: payload.recipientName },
                    { type: "text", text: roomStay },
                    { type: "text", text: tariffStr },
                    { type: "text", text: p.onboardUrl },
                  ],
                },
              ],
            },
          };
        }
      } else if (payload.type === "PAYMENT_RECEIPT") {
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const receiptNoStr = p.receiptId || `RCP-${Date.now().toString().slice(-6)}`;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tenopilot.com";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` (${p.bedCode})` : ""}`;
        const amountStr = Number(p.amount || 0).toLocaleString("en-IN");
        const paidDateStr = p.paidDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const modeStr = p.paymentMode || "UPI";

        // Construct dynamic direct PDF streaming URL
        const pdfParams = new URLSearchParams({
          receiptNo: receiptNoStr,
          propertyName: pName,
          residentName: payload.recipientName,
          roomNumber: p.roomNumber || "N/A",
          bedCode: p.bedCode || "Bed 1",
          amount: String(p.amount || 0),
          paidDate: paidDateStr,
          paymentMode: modeStr,
          paidTo: p.bankLabel || "Main Business Pool",
          isDeposit: receiptNoStr.startsWith("DEP") ? "true" : "false",
        });

        if (p.month) {
          pdfParams.set("month", p.month);
        }
        if (p.rentAmount !== undefined) {
          pdfParams.set("rentAmount", String(p.rentAmount));
        }
        if (p.depositAmount !== undefined) {
          pdfParams.set("depositAmount", String(p.depositAmount));
        }
        if (p.parkingAmount !== undefined) {
          pdfParams.set("parkingAmount", String(p.parkingAmount));
        }
        if (p.managerPhone) {
          pdfParams.set("managerPhone", p.managerPhone);
        }

        const pdfUrl = `${baseUrl}/api/receipt/pdf?${pdfParams.toString()}`;
        const fileName = `${receiptNoStr}_${payload.recipientName.replace(/\s+/g, "_")}.pdf`;

        // 📎 First priority: Send pre-approved Meta Document-Header Template outside 24h window
        requestBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_rent_payment_receipt_doc",
            language: { code: "en_US" },
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "document",
                    document: {
                      link: pdfUrl,
                      filename: fileName,
                    },
                  },
                ],
              },
              {
                type: "body",
                parameters: [
                  { type: "text", text: pName },
                  { type: "text", text: payload.recipientName },
                  { type: "text", text: receiptNoStr },
                  { type: "text", text: amountStr },
                  { type: "text", text: paidDateStr },
                  { type: "text", text: modeStr },
                  { type: "text", text: roomStay },
                ],
              },
            ],
          },
        };
      } else if (payload.type === "OWNER_WELCOME") {
        const p = payload.params || {};
        const pName = payload.propertyName || "Your Property";
        const ownerPhone = p.ownerPhone || payload.toPhone || "your registered mobile";
        const ownerEmail = p.ownerEmail || p.recipientEmail || "your registered email";

        requestBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_owner_workspace_ready",
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: payload.recipientName || "Property Owner" },
                  { type: "text", text: pName },
                  { type: "text", text: ownerPhone },
                  { type: "text", text: ownerEmail },
                ],
              },
            ],
          },
        };
      } else if (payload.type === "SUBSCRIPTION_INVOICE") {
        const p = payload.params || {};
        const invoiceNo = p.receiptId || `INV-${Date.now().toString().slice(-6)}`;
        const pName = payload.propertyName || "Your Property";
        const fileName = `TenoPilot_Tax_Invoice_${invoiceNo}.pdf`;
        const origin = process.env.NEXT_PUBLIC_APP_URL || "https://www.tenopilot.com";
        const pdfUrl = p.receiptUrl || `${origin}/api/subscription/invoice/pdf?invoiceNo=${encodeURIComponent(invoiceNo)}`;

        requestBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_subscription_receipt_doc",
            language: { code: "en_US" },
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "document",
                    document: {
                      link: pdfUrl,
                      filename: fileName,
                    },
                  },
                ],
              },
              {
                type: "body",
                parameters: [
                  { type: "text", text: payload.recipientName || "Property Partner" },
                  { type: "text", text: pName },
                  { type: "text", text: invoiceNo },
                ],
              },
            ],
          },
        };
      } else {
        requestBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            preview_url: true,
            body: messageBody,
          },
        };
      }

      let response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${metaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      let resData = await response.json();

      // Graceful fallback: If dedicated invite template is pending review, fallback to approved pg_welcome_onboarding
      if (!response.ok && requestBody?.template?.name === "pg_self_kyc_invite_link") {
        console.warn("Notice: pg_self_kyc_invite_link is pending or returned error, falling back to pg_welcome_onboarding:", resData?.error?.message);
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` - ${p.bedCode}` : ""}`;
        const checkinDate = p.paidDate || p.dueDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        
        const fallbackBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_welcome_onboarding",
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: payload.recipientName },
                  { type: "text", text: pName },
                  { type: "text", text: roomStay },
                  { type: "text", text: checkinDate },
                ],
              },
            ],
          },
        };
        response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackBody),
        });
        resData = await response.json();
      }

      // Graceful fallback: If direct document attachment fails due to 24h conversation policy, fallback to pg_welcome_onboarding template
      if (!response.ok && requestBody?.type === "document" && payload.type === "TENANT_WELCOME") {
        console.warn("Notice: Direct WhatsApp document attachment requires active window, falling back to pg_welcome_onboarding:", resData?.error?.message);
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` - ${p.bedCode}` : ""}`;
        const checkinDate = p.paidDate || p.dueDate || p.joiningDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        
        const fallbackBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_welcome_onboarding",
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: payload.recipientName },
                  { type: "text", text: pName },
                  { type: "text", text: roomStay },
                  { type: "text", text: checkinDate },
                ],
              },
            ],
          },
        };
        response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackBody),
        });
        resData = await response.json();
      }

      // Automatic Graceful Fallback for RENT_REMINDER if pg_rent_due_v2 is pending review or unavailable
      if (!response.ok && payload.type === "RENT_REMINDER" && requestBody?.template?.name === "pg_rent_due_v2") {
        console.warn("Retrying RENT_REMINDER with pg_rent_due_friendly fallback...");
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` - ${p.bedCode}` : ""}`;
        const amountStr = Number(p.amount || 0).toLocaleString("en-IN");
        const dueDateStr = p.dueDate || "5th of this month";
        const isCash = p.upiId === "CASH_PAYMENT" || p.upiId === "CASH" || p.upiId?.toLowerCase().includes("cash") || p.accountType === "CASH_DESK";
        const upiStr = isCash ? (p.bankLabel ? `Cash at Desk (${p.bankLabel})` : "Cash at Front Desk / Reception") : (p.upiId || "PG Reception / Manager UPI");

        const fallbackBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_rent_due_friendly",
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: pName },
                  { type: "text", text: payload.recipientName },
                  { type: "text", text: roomStay },
                  { type: "text", text: amountStr },
                  { type: "text", text: dueDateStr },
                  { type: "text", text: upiStr },
                ],
              },
            ],
          },
        };

        response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackBody),
        });
        resData = await response.json();
      }

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

      const sendResult: WhatsAppSendResult = {
        success: true,
        messageId: resData.messages?.[0]?.id || `wamid-${Date.now()}`,
        mode: "LIVE_META_API",
        recipientPhone: formattedPhone,
        recipientName: payload.recipientName,
        timestamp: new Date().toISOString(),
      };

      // Record outbound session context for deterministic inbound reply routing
      await recordOutboundDispatchLog(payload, sendResult);

      return sendResult;
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
  await new Promise((resolve) => setTimeout(resolve, 350));

  console.info(`[WhatsApp Simulator 🟢] Dispatched to +${formattedPhone} for ${payload.recipientName}:`, messageBody);

  const simResult: WhatsAppSendResult = {
    success: true,
    messageId: `sim-wamid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    mode: "SIMULATOR_SANDBOX",
    recipientPhone: formattedPhone,
    recipientName: payload.recipientName,
    timestamp: new Date().toISOString(),
  };

  // Record outbound session context
  await recordOutboundDispatchLog(payload, simResult);

  return simResult;
}

/**
 * Record outbound dispatch metadata in Firestore SSOT to guarantee 100% accurate
 * inbound message session routing back to the originating property and tenant profile.
 */
export async function recordOutboundDispatchLog(payload: WhatsAppSendParams, result?: Partial<WhatsAppSendResult>) {
  try {
    if (!db) return;
    const cleanDigits = payload.toPhone.replace(/\D/g, "").slice(-10);
    if (!cleanDigits || cleanDigits.length < 10) return;
    const docId = `dispatch_${cleanDigits}`;
    const p = payload.params || {};

    const dispatchDoc = {
      id: docId,
      wamid: result?.messageId || `wamid_manual_${Date.now()}`,
      toPhoneClean: cleanDigits,
      toPhoneFormatted: formatIndianPhoneNumber(payload.toPhone),
      recipientName: payload.recipientName,
      propertyId: payload.propertyId,
      propertyName: payload.propertyName || "TenoPilot PG",
      occupantId: payload.occupantId || null,
      roomNumber: p.roomNumber || null,
      bedCode: p.bedCode || null,
      amountDue: p.amount ? Number(p.amount) : null,
      type: payload.type || "RENT_REMINDER",
      dispatchedAt: new Date().toISOString(),
      timestamp: Date.now(),
      mode: result?.mode || "LIVE_META_API",
    };

    // Save in global fast-lookup table
    await setDoc(doc(db, "whatsapp_outbound_dispatches", docId), dispatchDoc, { merge: true });

    // Also update occupants_by_phone index
    await setDoc(
      doc(db, "occupants_by_phone", cleanDigits),
      {
        phone: cleanDigits,
        occupantId: payload.occupantId || `occ_${cleanDigits}`,
        occupantName: payload.recipientName,
        propertyId: payload.propertyId,
        propertyName: payload.propertyName || "TenoPilot PG",
        roomNumber: p.roomNumber || null,
        bedCode: p.bedCode || null,
        rentAmount: p.amount ? Number(p.amount) : 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Also record in property-scoped history
    if (payload.propertyId) {
      await setDoc(
        doc(db, `properties/${payload.propertyId}/whatsapp_dispatches`, `msg_${Date.now()}_${cleanDigits}`),
        dispatchDoc,
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("Notice recording WhatsApp outbound dispatch log:", err);
  }
}

export interface SendWhatsAppAuthOtpResult {
  success: boolean;
  messageId: string;
  mode: "LIVE_META_API" | "SIMULATOR_SANDBOX";
  recipientPhone: string;
  error?: string;
  timestamp: string;
}

/**
 * 📲 Send WhatsApp Authentication OTP via Meta Cloud API using the approved template
 * Default template name: user_authcode_tenopilot
 */
export async function sendWhatsAppAuthOtp(
  toPhone: string,
  otpCode: string,
  templateName: string = process.env.WHATSAPP_AUTH_TEMPLATE_NAME || "user_authcode_tenopilot"
): Promise<SendWhatsAppAuthOtpResult> {
  const formattedPhone = formatIndianPhoneNumber(toPhone);
  const metaToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (metaToken && phoneNumberId) {
    const languagesToTry = [
      process.env.WHATSAPP_AUTH_TEMPLATE_LANG || "en_US",
      "en",
      "en_GB",
    ];

    let lastError = "";

    for (const lang of languagesToTry) {
      try {
        const requestBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: lang },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: otpCode,
                  },
                ],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [
                  {
                    type: "text",
                    text: otpCode,
                  },
                ],
              },
            ],
          },
        };

        const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const resData = await response.json();

        if (response.ok) {
          return {
            success: true,
            messageId: resData.messages?.[0]?.id || `wamid-${Date.now()}`,
            mode: "LIVE_META_API",
            recipientPhone: formattedPhone,
            timestamp: new Date().toISOString(),
          };
        }

        const errMsg = resData.error?.message || "";
        const errCode = resData.error?.code;
        lastError = errMsg;

        // If error indicates locale mismatch, try next language
        if (errCode === 132001 || errMsg.includes("translated language") || errMsg.includes("does not exist in")) {
          console.warn(`Meta template '${templateName}' not found in locale '${lang}'. Trying next locale...`);
          continue;
        }

        // If error is about button structure, attempt body-only fallback
        if (errMsg.includes("button") || errCode === 132018) {
          const bodyOnlyPayload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "template",
            template: {
              name: templateName,
              language: { code: lang },
              components: [
                {
                  type: "body",
                  parameters: [
                    {
                      type: "text",
                      text: otpCode,
                    },
                  ],
                },
              ],
            },
          };

          const bodyResp = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${metaToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(bodyOnlyPayload),
          });

          const bodyData = await bodyResp.json();
          if (bodyResp.ok) {
            return {
              success: true,
              messageId: bodyData.messages?.[0]?.id || `wamid-${Date.now()}`,
              mode: "LIVE_META_API",
              recipientPhone: formattedPhone,
              timestamp: new Date().toISOString(),
            };
          }
          lastError = bodyData.error?.message || lastError;
        }

        break;
      } catch (err: any) {
        lastError = err.message || "Network exception contacting WhatsApp Cloud API";
        break;
      }
    }

    return {
      success: false,
      messageId: `err-${Date.now()}`,
      mode: "LIVE_META_API",
      recipientPhone: formattedPhone,
      error: lastError || "Failed to deliver WhatsApp OTP via Meta Cloud API",
      timestamp: new Date().toISOString(),
    };
  }

  // Fallback simulator for local dev without credentials
  console.info(`[WhatsApp Simulator 🟢] Auth OTP code ${otpCode} sent to +${formattedPhone} (template: ${templateName})`);
  return {
    success: true,
    messageId: `sim-otp-${Date.now()}`,
    mode: "SIMULATOR_SANDBOX",
    recipientPhone: formattedPhone,
    timestamp: new Date().toISOString(),
  };
}

