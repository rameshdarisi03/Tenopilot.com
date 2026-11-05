import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { executePlanActivationPipeline } from "@/lib/planActivationProvisioner";
import { sendSESEmail } from "@/lib/sesService";
import { sendWhatsAppMessage, formatIndianPhoneNumber } from "@/lib/whatsappService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      email,
      phone,
      plan = "PRO_MONTHLY",
      durationDays = 30,
      paymentMode = "UPI",
      amountPaid = 999,
      discountPercentage = 0,
      receiptNumber = "",
      receiptUrl = "",
      notes = "",
      activatedBy = "Founder Console",
      requestId = null,
      propertyId = null,
      credits = null,
      customCredits = null,
    } = body;

    if (!email && !userId && !propertyId) {
      return NextResponse.json(
        { success: false, message: "Customer email, userId, or propertyId is required." },
        { status: 400 }
      );
    }

    const cleanEmail = (email || "").toLowerCase().trim();

    // 🚀 Execute Master Life-After-Activation Provisioning Pipeline
    const activationResult = await executePlanActivationPipeline({
      userId,
      email: cleanEmail,
      phone,
      propertyId,
      plan,
      durationDays: Number(durationDays) || 30,
      paymentMode,
      amountPaid: Number(amountPaid) || 0,
      discountPercentage: Number(discountPercentage) || 0,
      receiptNumber,
      receiptUrl,
      notes,
      activatedBy,
      requestId,
      credits,
      customCredits,
    });

    // Special Add-ons handling: Multi-Property and Tenant Extension Packs
    if (plan === "MULTI_PROPERTY_MONTHLY" || plan === "TENANT_EXTENSION_PACK_25") {
      try {
        if (userId) {
          const uSnap = await getDoc(doc(db, "users", userId));
          if (uSnap.exists()) {
            const uData = uSnap.data();
            const updates: Record<string, any> = {
              hasCustomLimitsOverride: true,
              customLimitsOverrideAt: new Date().toISOString(),
            };
            if (plan === "MULTI_PROPERTY_MONTHLY") {
              updates.maxPropertiesAllowed = (Number(uData.maxPropertiesAllowed) || 1) + 1;
            }
            if (plan === "TENANT_EXTENSION_PACK_25") {
              updates.tenantExtensionPacks = (Number(uData.tenantExtensionPacks) || 0) + 1;
            }
            await setDoc(doc(db, "users", userId), updates, { merge: true });
          }
        }
      } catch (addonErr) {
        console.warn("Add-on capacity update notice:", addonErr);
      }
    }

    // 📬 Deliver Subscription Tax Invoice (PDF + Email + WhatsApp)
    const isTrialExtension = plan === "TRIAL_EXTENSION" || plan === "10_DAY_TRIAL" || plan === "trial";
    if (!isTrialExtension && !plan.startsWith("WHATSAPP") && !plan.startsWith("pack-") && typeof credits !== "number") {
      try {
        // Resolve customer details for invoice
        let customerName = "Property Partner";
        let customerPhone = phone || "";
        let customerPropName = "TenoPilot Coliving";
        const primaryPropId = activationResult.targetPropertyIds[0] || propertyId || "platform";

        if (userId) {
          try {
            const uSnap = await getDoc(doc(db, "users", userId));
            if (uSnap.exists()) {
              const u = uSnap.data();
              if (u.displayName || u.name) customerName = u.displayName || u.name;
              if (u.phone && !customerPhone) customerPhone = u.phone;
              if (u.propertyName || u.pgName) customerPropName = u.propertyName || u.pgName;
            }
          } catch (e) {}
        }

        const invoiceNumber = receiptNumber || `INV-${Date.now().toString().slice(-6)}`;
        const origin = process.env.NEXT_PUBLIC_APP_URL || "https://www.tenopilot.com";
        const validityPeriodStr = `${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} - ${new Date(activationResult.planExpiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
        const invoicePdfUrl = `${origin}/api/subscription/invoice/pdf?invoiceNo=${encodeURIComponent(invoiceNumber)}&ownerName=${encodeURIComponent(customerName)}&propertyName=${encodeURIComponent(customerPropName)}&ownerEmail=${encodeURIComponent(cleanEmail)}&ownerPhone=${encodeURIComponent(customerPhone)}&planName=${encodeURIComponent(activationResult.plan)}&amount=${amountPaid}${Number(discountPercentage) > 0 ? `&discount=${encodeURIComponent(String(discountPercentage))}` : ""}&validityPeriod=${encodeURIComponent(validityPeriodStr)}`;

        // Dispatch Email Invoice
        if (cleanEmail && cleanEmail.includes("@")) {
          sendSESEmail({
            toEmail: cleanEmail,
            recipientName: customerName,
            propertyId: primaryPropId,
            propertyName: customerPropName,
            type: "SUBSCRIPTION_INVOICE",
            params: {
              receiptId: invoiceNumber,
              receiptUrl: invoicePdfUrl,
              amount: amountPaid,
              planName: activationResult.plan,
              validityPeriod: validityPeriodStr,
            },
          }).catch((err) => console.warn("Invoice email dispatch notice:", err));
        }

        // Dispatch WhatsApp Invoice
        if (customerPhone && customerPhone.length >= 10) {
          sendWhatsAppMessage({
            toPhone: formatIndianPhoneNumber(customerPhone),
            recipientName: customerName,
            propertyId: primaryPropId,
            propertyName: customerPropName,
            type: "SUBSCRIPTION_INVOICE",
            params: {
              receiptId: invoiceNumber,
              receiptUrl: invoicePdfUrl,
              amount: amountPaid,
              planName: activationResult.plan,
            },
          }).catch((err) => console.warn("Invoice WhatsApp dispatch notice:", err));
        }
      } catch (invErr) {
        console.warn("Invoice delivery notice:", invErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: activationResult.message,
      transactionId: activationResult.transactionId,
      planExpiresAt: activationResult.planExpiresAt,
      provisionedCredits: activationResult.provisionedCredits,
      propertyWalletBalances: activationResult.propertyWalletBalances,
      targetPropertyIds: activationResult.targetPropertyIds,
    });
  } catch (err: any) {
    console.error("POST /api/apex/activate-plan error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to activate customer plan" },
      { status: 500 }
    );
  }
}
