import { doc, setDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

export interface WhatsAppSendParams {
  toPhone: string; // E.164 without leading plus or 10-digit Indian mobile number
  recipientName: string;
  propertyId: string;
  propertyName?: string;
  occupantId?: string;
  type: "RENT_REMINDER" | "PAYMENT_RECEIPT" | "ONBOARDING_INVITE" | "TENANT_WELCOME" | "COMPLAINT_UPDATE" | "CHECKOUT_THANK_YOU" | "OWNER_WELCOME" | "SUBSCRIPTION_INVOICE" | "KYC_CORRECTION_REQUEST" | "PAYMENT_PROOF_ALERT" | "CUSTOM";
  params?: {
    roomNumber?: string;
    bedCode?: string;
    amount?: number | string;
    breakupNote?: string;
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
    category?: string;
    payUrl?: string;
    proofId?: string;
    utrNumber?: string;
    partnerName?: string;
    partnerPhone?: string;
    propertyPhone?: string;
    replacesReceiptNo?: string;
    isVoided?: boolean;
    isReplacement?: boolean;
    isCorrected?: boolean;
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
        `**${pName}**\n\n` +
        `Hello ${payload.recipientName},\n\n` +
        `This is a friendly reminder regarding your monthly accommodation rent for ${p.roomNumber || "N/A"}${p.bedCode ? ` - ${p.bedCode}` : ""}:\n\n` +
        `💰 Amount Due: INR ${Number(p.amount || 0).toLocaleString("en-IN")}${p.breakupNote ? `\n(${p.breakupNote})` : ""}\n` +
        `📅 Due Date: ${p.dueDate || "5th of this month"}\n` +
        `💳 ${payHeader}: ${payDest}\n\n` +
        (!isCash && p.payUrl ? `👉 *Tap to Pay (PhonePe / GPay / Paytm / UPI)*:\n${p.payUrl}\n\n` : "") +
        `Kindly clear your dues and share transaction proof for your digital receipt.\n\n` +
        `Thank you for being a valued resident!\n\n` +
        `- ${pName}`
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

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tenopilot.com";
      const agreementParams = new URLSearchParams({
        propertyId: payload.propertyId,
        tenantName: payload.recipientName,
        phone: payload.toPhone,
        roomNumber: p.roomNumber || "N/A",
        bedCode: p.bedCode || "Standard Bed",
        joiningDate: checkinDate,
        monthlyRent: String(p.rentAmount || p.amount || 0),
        securityDeposit: String(p.depositAmount || 0),
        propertyName: pName,
        propertyAddress: p.propertyAddress || "",
        houseRules: p.houseRules || "",
        billingCycle: p.billingCycle || "",
        ownerName: p.ownerName || "",
      });
      const agreementUrl = `${baseUrl}/api/agreement/pdf?${agreementParams.toString()}`;

      return (
        `*${pName}*\n` +
        `Welcome to ${pName}! 🎉\n\n` +
        `Dear *${payload.recipientName}*,\n\n` +
        `Congratulations! Your resident check-in and KYC documents have been officially *APPROVED* by management. 🥳\n\n` +
        `🏠 *Allocated Stay*: Room ${roomStay}\n` +
        `📅 *Move-In Date*: ${checkinDate}` +
        tariffStr + `\n\n` +
        `📎 *ATTACHMENT*: Official Residential Tenancy Agreement (PDF) is attached to this message.\n` +
        `📄 _Download Agreement:_ ${agreementUrl}\n\n` +
        (p.onboardUrl ? `🔗 *Resident Portal*: ${p.onboardUrl}\n\n` : "") +
        `Your room key and welcome kit are ready at reception. We are thrilled to have you with us!\n\n` +
        `Warm regards,\n` +
        `*${pName} Management Desk*`
      );
    }

    case "COMPLAINT_UPDATE": {
      const statusEmoji = p.complaintStatus === "RESOLVED" ? "🟢" : p.complaintStatus === "IN_PROGRESS" ? "🟡" : p.complaintStatus === "REJECTED" ? "⚪" : "🔴";
      const statusLabel = (p.complaintStatus || "IN_PROGRESS").replace("_", " ");
      const notes = p.customMessage ? `\n💬 *Manager Note*: ${p.customMessage}` : "";
      const roomStr = p.roomNumber ? `\n🏠 *Location*: ${p.roomNumber}` : "";
      const catStr = p.category ? `\n🔧 *Category*: ${p.category}` : "";
      const trackUrl = `https://www.tenopilot.com/p/${payload.propertyId}/public-complaint`;

      return (
        `🏢 *${pName} Maintenance Desk*\n\n` +
        `Hello *${payload.recipientName}*,\n\n` +
        `Your maintenance request has been updated:\n\n` +
        `🎫 *Ticket ID*: #${p.complaintId || "CARE"}${roomStr}${catStr}\n` +
        `📝 *Issue*: ${p.complaintTitle || "Maintenance request"}\n\n` +
        `📌 *Current Status*: ${statusEmoji} *${statusLabel}*${notes}\n\n` +
        `🔍 *Track Live Status*:\n${trackUrl}\n\n` +
        `Thank you,\n` +
        `*${pName} Operations*`
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

    case "PAYMENT_PROOF_ALERT": {
      const partnerName = payload.recipientName || "Property Partner";
      const amtStr = Number(p.amount || 0).toLocaleString("en-IN");
      const reviewUrl = p.receiptUrl || (p.proofId ? `https://www.tenopilot.com/p/${payload.propertyId}/tenants?proof=${p.proofId}` : `https://www.tenopilot.com/p/${payload.propertyId}/tenants`);
      const utrStr = p.utrNumber || "Screenshot Attached";
      const upiStr = p.upiId || "Partner UPI Account";
      const residentStay = p.roomNumber ? `Room ${p.roomNumber}` : "Resident Accommodation";

      return (
        `*${pName}* 🏢\n` +
        `⚡ *New Direct Payment Reported!*\n\n` +
        `Hello *${partnerName}*,\n\n` +
        `A resident has reported a direct UPI payment to your bank account (*${upiStr}*):\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 *Amount Reported*: ₹${amtStr}\n` +
        `🏠 *Stay*: ${residentStay}\n` +
        `🔢 *UTR / Ref*: ${utrStr}\n` +
        `🏢 *Property*: ${pName}\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👉 *Review & Record in TenoPilot*:\n` +
        `${reviewUrl}\n\n` +
        `_Please verify your bank statement. Once verified, click 'Collect Rent' to generate their official digital receipt._\n\n` +
        `- *Team TenoPilot* 🏢`
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
        const baseAmountStr = Number(p.amount || 0).toLocaleString("en-IN");
        const amountStr = p.breakupNote ? `${baseAmountStr} (${p.breakupNote})` : baseAmountStr;
        const dueDateStr = p.dueDate || "5th of this month";

        const isCash = p.upiId === "CASH_PAYMENT" || p.upiId === "CASH" || p.upiId?.toLowerCase().includes("cash") || p.accountType === "CASH_DESK";
        const isBank = p.accountType === "BANK_TRANSFER" || (!isCash && !p.upiId?.includes("@") && Boolean(p.bankLabel));

        const payHeader = isCash ? "Pay via Cash" : isBank ? "Pay to Bank" : "Pay to UPI";
        const payDest = isCash
          ? (p.bankLabel ? `Cash at Desk (${p.bankLabel})` : "Cash at Front Desk / Reception")
          : (p.upiId || "PG Reception / Manager UPI");

        const tokenParam = p.payUrl ? (p.payUrl.split("/pay/")[1] || "") : "";

        if (isCash) {
          requestBody = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "template",
            template: {
              name: "pg_rent_due_cash_v1",
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
                    { type: "text", text: payDest },
                  ],
                },
              ],
            },
          };
        } else if (tokenParam) {
          requestBody = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "template",
            template: {
              name: "pg_rent_due_actions_v1",
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
                    { type: "text", text: payDest },
                  ],
                },
                {
                  type: "button",
                  sub_type: "url",
                  index: "0",
                  parameters: [
                    { type: "text", text: `${tokenParam}?view=pay` },
                  ],
                },
                {
                  type: "button",
                  sub_type: "url",
                  index: "1",
                  parameters: [
                    { type: "text", text: `${tokenParam}?view=proof` },
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
            type: "template",
            template: {
              name: "pg_rent_due_v4",
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
        }
      } else if (payload.type === "TENANT_WELCOME") {
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` (${p.bedCode})` : ""}`;
        
        // Clean display formatting for joining / check-in date (e.g. "26 Oct 2026")
        const rawDate = p.joiningDate || p.paidDate || p.dueDate;
        let checkinDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        if (rawDate) {
          if (/[a-zA-Z]/.test(rawDate) && rawDate.includes(" ")) {
            checkinDate = rawDate;
          } else {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed.getTime())) {
              checkinDate = parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            } else {
              checkinDate = rawDate;
            }
          }
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tenopilot.com";
        const agreementParams = new URLSearchParams({
          propertyId: payload.propertyId,
          tenantName: payload.recipientName,
          phone: formattedPhone,
          roomNumber: p.roomNumber || "N/A",
          bedCode: p.bedCode || "Standard Bed",
          joiningDate: checkinDate,
          monthlyRent: String(p.rentAmount || p.amount || 0),
          securityDeposit: String(p.depositAmount || 0),
          propertyName: pName,
          propertyAddress: p.propertyAddress || "",
          houseRules: p.houseRules || "",
          billingCycle: p.billingCycle || "",
          ownerName: p.ownerName || "",
        });
        const agreementUrl = `${baseUrl}/api/agreement/pdf?${agreementParams.toString()}`;
        const fileName = `Rental_Agreement_${payload.recipientName.replace(/\s+/g, "_")}.pdf`;
        const tariffFormatted = Number(p.rentAmount || p.amount || 0).toLocaleString("en-IN");
        const rawManagerPhone = p.managerPhone || p.propertyPhone || p.ownerPhone || "9206651295";
        const cleanManagerPhone = rawManagerPhone.replace(/\D/g, "").slice(-10) || "9206651295";
        const agreementBtnParam = `agreement?view=agreement&${agreementParams.toString()}`;

        // 🚀 Primary: New Meta WhatsApp Template "pg_welcome_agreement_actions_v1" with PDF Header + Download & Call buttons
        requestBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_welcome_agreement_actions_v1",
            language: { code: "en_US" },
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "document",
                    document: {
                      link: agreementUrl,
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
                  { type: "text", text: roomStay },
                  { type: "text", text: checkinDate },
                  { type: "text", text: tariffFormatted },
                ],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [
                  { type: "text", text: agreementBtnParam },
                ],
              },
              {
                type: "button",
                sub_type: "url",
                index: "1",
                parameters: [
                  { type: "text", text: cleanManagerPhone },
                ],
              },
            ],
          },
        };
      } else if (payload.type === "ONBOARDING_INVITE") {
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` - ${p.bedCode}` : ""}`;
        const checkinDate = p.paidDate || p.dueDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const tariffStr = String(p.amount || "12000");
        const rawManagerPhone = p.managerPhone || p.propertyPhone || p.ownerPhone || "9206651295";
        const cleanManagerPhone = rawManagerPhone.replace(/\D/g, "").slice(-10) || "9206651295";
        const onboardTokenParam = p.onboardUrl ? (p.onboardUrl.split("/self-onboard/")[1] || "") : "";

        if (onboardTokenParam) {
          // 🚀 Primary: New Meta WhatsApp Template "pg_self_kyc_invite_actions_v1" with Complete KYC & Call Desk buttons
          requestBody = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "template",
            template: {
              name: "pg_self_kyc_invite_actions_v1",
              language: { code: "en_US" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: pName },
                    { type: "text", text: payload.recipientName },
                    { type: "text", text: roomStay },
                    { type: "text", text: tariffStr },
                  ],
                },
                {
                  type: "button",
                  sub_type: "url",
                  index: "0",
                  parameters: [
                    { type: "text", text: onboardTokenParam },
                  ],
                },
                {
                  type: "button",
                  sub_type: "url",
                  index: "1",
                  parameters: [
                    { type: "text", text: cleanManagerPhone },
                  ],
                },
              ],
            },
          };
        } else if (!p.onboardUrl) {
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

        const isCorrectedReceipt = Boolean(p.replacesReceiptNo || p.isReplacement || p.isCorrected);
        const activeTemplateName = isCorrectedReceipt
          ? "pg_rent_receipt_corrected_v1"
          : "pg_rent_payment_receipt_actions_v1";

        const rawManagerPhone = p.managerPhone || p.propertyPhone || p.ownerPhone || "9206651295";
        const cleanManagerPhone = rawManagerPhone.replace(/\D/g, "").slice(-10) || "9206651295";
        const receiptBtnParam = `receipt?view=receipt&${pdfParams.toString()}`;

        // 📎 Primary: Send Action Template with Document Header + Download & Call Buttons
        requestBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: activeTemplateName,
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
                  { type: "text", text: roomStay },
                  { type: "text", text: receiptNoStr },
                  { type: "text", text: amountStr },
                  { type: "text", text: paidDateStr },
                  { type: "text", text: modeStr },
                ],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [
                  { type: "text", text: receiptBtnParam },
                ],
              },
              {
                type: "button",
                sub_type: "url",
                index: "1",
                parameters: [
                  { type: "text", text: cleanManagerPhone },
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
      } else if (payload.type === "COMPLAINT_UPDATE") {
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot Living";
        const statusEmoji = p.complaintStatus === "RESOLVED" ? "🟢" : p.complaintStatus === "IN_PROGRESS" ? "🟡" : p.complaintStatus === "REJECTED" ? "⚪" : "🔴";
        const statusStr = `${statusEmoji} ${(p.complaintStatus || "IN_PROGRESS").replace(/_/g, " ")}`;

        requestBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_complaint_status_update",
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: payload.recipientName || "Resident" },
                  { type: "text", text: pName },
                  { type: "text", text: p.complaintId || "CARE" },
                  { type: "text", text: p.roomNumber || "N/A" },
                  { type: "text", text: p.category || "General Maintenance" },
                  { type: "text", text: p.complaintTitle || "Maintenance request" },
                  { type: "text", text: statusStr },
                  { type: "text", text: p.customMessage || "Status updated by property manager." },
                ],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [
                  { type: "text", text: payload.propertyId || "default" },
                ],
              },
            ],
          },
        };
      } else if (payload.type === "PAYMENT_PROOF_ALERT") {
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const partnerName = payload.recipientName || "Property Partner";
        const amtStr = Number(p.amount || 0).toLocaleString("en-IN");
        const roomStay = p.roomNumber ? `Room ${p.roomNumber}` : "Accommodation";
        const utrStr = p.utrNumber || "Screenshot Attached";
        const proofParam = p.proofId || "";

        const upiDest = p.upiId || "Partner Bank Account";

        requestBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "partner_payment_alert_v1",
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: pName },
                  { type: "text", text: partnerName },
                  { type: "text", text: upiDest },
                  { type: "text", text: amtStr },
                  { type: "text", text: roomStay },
                  { type: "text", text: utrStr },
                ],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [
                  { type: "text", text: `${payload.propertyId}/tenants?proof=${proofParam}` },
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

      // Graceful fallback: If action-based receipt templates are pending approval or error, fallback to approved pg_rent_payment_receipt_doc
      if (!response.ok && payload.type === "PAYMENT_RECEIPT" && (requestBody?.template?.name === "pg_rent_receipt_corrected_v1" || requestBody?.template?.name === "pg_rent_payment_receipt_actions_v1")) {
        console.warn("Notice: Action receipt template pending approval, falling back to pg_rent_payment_receipt_doc:", resData?.error?.message);
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const receiptNoStr = p.receiptId || `RCP-${Date.now().toString().slice(-6)}`;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tenopilot.com";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` (${p.bedCode})` : ""}`;
        const amountStr = Number(p.amount || 0).toLocaleString("en-IN");
        const paidDateStr = p.paidDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const modeStr = p.paymentMode || "UPI";

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

        const pdfUrl = `${baseUrl}/api/receipt/pdf?${pdfParams.toString()}`;
        const fileName = `${receiptNoStr}_${payload.recipientName.replace(/\s+/g, "_")}.pdf`;

        const fallbackBody = {
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

      // Graceful fallback: If pg_welcome_agreement_actions_v1 is pending, fallback to pg_welcome_agreement_doc
      if (!response.ok && payload.type === "TENANT_WELCOME" && requestBody?.template?.name === "pg_welcome_agreement_actions_v1") {
        console.warn("Notice: pg_welcome_agreement_actions_v1 pending approval, falling back to pg_welcome_agreement_doc:", resData?.error?.message);
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` (${p.bedCode})` : ""}`;
        const rawDate = p.joiningDate || p.paidDate || p.dueDate;
        let checkinDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        if (rawDate) {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            checkinDate = parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
          } else {
            checkinDate = rawDate;
          }
        }
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tenopilot.com";
        const agreementParams = new URLSearchParams({
          propertyId: payload.propertyId,
          tenantName: payload.recipientName,
          phone: formattedPhone,
          roomNumber: p.roomNumber || "N/A",
          bedCode: p.bedCode || "Standard Bed",
          joiningDate: checkinDate,
          monthlyRent: String(p.rentAmount || p.amount || 0),
          securityDeposit: String(p.depositAmount || 0),
          propertyName: pName,
        });
        const agreementUrl = `${baseUrl}/api/agreement/pdf?${agreementParams.toString()}`;
        const fileName = `Rental_Agreement_${payload.recipientName.replace(/\s+/g, "_")}.pdf`;
        const tariffFormatted = Number(p.rentAmount || p.amount || 0).toLocaleString("en-IN");

        const fallbackBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_welcome_agreement_doc",
            language: { code: "en_US" },
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "document",
                    document: {
                      link: agreementUrl,
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
                  { type: "text", text: roomStay },
                  { type: "text", text: checkinDate },
                  { type: "text", text: tariffFormatted },
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

      // Graceful fallback: If dedicated invite template is pending review, fallback to approved pg_welcome_onboarding
      if (!response.ok && (requestBody?.template?.name === "pg_self_kyc_invite_link" || requestBody?.template?.name === "pg_self_kyc_invite_actions_v1")) {
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

      // Graceful fallback: If pg_welcome_agreement_doc is pending approval or direct document attachment fails, fallback to pg_welcome_onboarding template
      if (!response.ok && (requestBody?.type === "document" || requestBody?.template?.name === "pg_welcome_agreement_doc") && payload.type === "TENANT_WELCOME") {
        console.warn("Notice: pg_welcome_agreement_doc document template pending approval or error, falling back to pg_welcome_onboarding:", resData?.error?.message);
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

      // Automatic Graceful Fallback: If pg_rent_due_actions_v1 is pending Meta review, fallback to approved pg_rent_due_upi_v1
      if (!response.ok && payload.type === "RENT_REMINDER" && requestBody?.template?.name === "pg_rent_due_actions_v1") {
        console.warn("Notice: pg_rent_due_actions_v1 pending approval, falling back to pg_rent_due_upi_v1:", resData?.error?.message);
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` - ${p.bedCode}` : ""}`;
        const baseAmountStr = Number(p.amount || 0).toLocaleString("en-IN");
        const amountStr = p.breakupNote ? `${baseAmountStr} (${p.breakupNote})` : baseAmountStr;
        const dueDateStr = p.dueDate || "5th of this month";
        const isCash = p.upiId === "CASH_PAYMENT" || p.upiId === "CASH" || p.upiId?.toLowerCase().includes("cash") || p.accountType === "CASH_DESK";
        const payDest = isCash
          ? (p.bankLabel ? `Cash at Desk (${p.bankLabel})` : "Cash at Front Desk / Reception")
          : (p.upiId || "PG Reception / Manager UPI");
        const tokenParam = p.payUrl ? (p.payUrl.split("/pay/")[1] || "") : "";

        const upiFallback = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_rent_due_upi_v1",
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
                  { type: "text", text: payDest },
                ],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [
                  { type: "text", text: tokenParam },
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
          body: JSON.stringify(upiFallback),
        });
        resData = await response.json();
      }

      // Automatic Graceful Fallback: If pg_rent_due_cash_v1 is pending Meta review, fallback to approved pg_rent_due_v4
      if (!response.ok && payload.type === "RENT_REMINDER" && requestBody?.template?.name === "pg_rent_due_cash_v1") {
        console.warn("Notice: pg_rent_due_cash_v1 pending approval, falling back to pg_rent_due_v4:", resData?.error?.message);
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` - ${p.bedCode}` : ""}`;
        const baseAmountStr = Number(p.amount || 0).toLocaleString("en-IN");
        const amountStr = p.breakupNote ? `${baseAmountStr} (${p.breakupNote})` : baseAmountStr;
        const dueDateStr = p.dueDate || "5th of this month";
        const payDest = p.bankLabel ? `Cash at Desk (${p.bankLabel})` : "Cash at Front Desk / Reception";

        const cashFallback = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_rent_due_v4",
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
                  { type: "text", text: "Payment Mode" },
                  { type: "text", text: payDest },
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
          body: JSON.stringify(cashFallback),
        });
        resData = await response.json();
      }

      // Automatic Graceful Fallback: If pg_rent_due_upi_v1 is pending Meta review, fallback to approved pg_rent_due_v4
      if (!response.ok && payload.type === "RENT_REMINDER" && requestBody?.template?.name === "pg_rent_due_upi_v1") {
        console.warn("Notice: pg_rent_due_upi_v1 is pending approval, falling back to pg_rent_due_v4:", resData?.error?.message);
        const p = payload.params || {};
        const pName = payload.propertyName || "TenoPilot PG & Living";
        const roomStay = `${p.roomNumber || "N/A"}${p.bedCode ? ` - ${p.bedCode}` : ""}`;
        const baseAmountStr = Number(p.amount || 0).toLocaleString("en-IN");
        const amountStr = p.breakupNote ? `${baseAmountStr} (${p.breakupNote})` : baseAmountStr;
        const dueDateStr = p.dueDate || "5th of this month";
        const isCash = p.upiId === "CASH_PAYMENT" || p.upiId === "CASH" || p.upiId?.toLowerCase().includes("cash") || p.accountType === "CASH_DESK";
        const isBank = p.accountType === "BANK_TRANSFER" || (!isCash && !p.upiId?.includes("@") && Boolean(p.bankLabel));
        const payHeader = isCash ? "Pay via Cash" : isBank ? "Pay to Bank" : "Pay to UPI";
        const payDest = isCash
          ? (p.bankLabel ? `Cash at Desk (${p.bankLabel})` : "Cash at Front Desk / Reception")
          : (p.upiId || "PG Reception / Manager UPI");

        const v4Fallback = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "pg_rent_due_v4",
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

        response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(v4Fallback),
        });
        resData = await response.json();
      }

      // Automatic Graceful Fallback for RENT_REMINDER if pg_rent_due_v4 is pending review or unavailable
      if (!response.ok && payload.type === "RENT_REMINDER" && (requestBody?.template?.name === "pg_rent_due_v4" || requestBody?.template?.name === "pg_rent_due_v3" || requestBody?.template?.name === "pg_rent_due_v2")) {
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

      // Graceful fallback for partner_payment_alert_v1 if template is pending review or not found
      if (!response.ok && payload.type === "PAYMENT_PROOF_ALERT" && requestBody?.template?.name === "partner_payment_alert_v1") {
        console.warn("partner_payment_alert_v1 pending approval or error, falling back to direct text:", resData?.error?.message);
        const fallbackTextBody = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            preview_url: true,
            body: messageBody,
          },
        };
        response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackTextBody),
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

