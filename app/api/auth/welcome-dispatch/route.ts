import { NextRequest, NextResponse } from "next/server";
import { sendSESEmail } from "@/lib/sesService";
import { sendWhatsAppMessage, formatIndianPhoneNumber } from "@/lib/whatsappService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ownerName = "Property Owner",
      propertyName = "Your Property",
      ownerEmail = "",
      ownerPhone = "",
      propertyId = "prop-onboard",
    } = body;

    const cleanEmail = (ownerEmail || "").toLowerCase().trim();
    const cleanPhone = (ownerPhone || "").replace(/\D/g, "");

    let emailSent = false;
    let whatsappSent = false;

    // 1. Dispatch Luxury Welcome Email if email exists
    if (cleanEmail && cleanEmail.includes("@") && !cleanEmail.includes("tenopilot.auth")) {
      try {
        const sesRes = await sendSESEmail({
          toEmail: cleanEmail,
          recipientName: ownerName,
          propertyId: propertyId,
          propertyName: propertyName,
          type: "OWNER_WELCOME",
          params: {
            managerPhone: cleanPhone,
          },
        });
        emailSent = sesRes.success;
      } catch (emailErr) {
        console.warn("Welcome email dispatch notice:", emailErr);
      }
    }

    // 2. Dispatch WhatsApp Welcome Message if phone exists
    if (cleanPhone && cleanPhone.length >= 10) {
      try {
        const formattedPhone = formatIndianPhoneNumber(cleanPhone);
        const waRes = await sendWhatsAppMessage({
          toPhone: formattedPhone,
          recipientName: ownerName,
          propertyId: propertyId,
          propertyName: propertyName,
          type: "OWNER_WELCOME",
          params: {
            managerPhone: cleanPhone,
            recipientEmail: cleanEmail,
          },
        });
        whatsappSent = waRes.success;
      } catch (waErr) {
        console.warn("Welcome WhatsApp dispatch notice:", waErr);
      }
    }

    return NextResponse.json({
      success: true,
      emailSent,
      whatsappSent,
      message: "Welcome notifications processed.",
    });
  } catch (error: any) {
    console.error("POST /api/auth/welcome-dispatch error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
