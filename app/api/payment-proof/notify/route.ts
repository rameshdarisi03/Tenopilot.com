import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsappService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let {
      proofId,
      propertyId,
      propertyName,
      partnerPhone,
      partnerName,
      tenantName,
      roomNumber,
      amount,
      utrNumber,
      upiId,
    } = body;

    if (!propertyId) {
      return NextResponse.json({ success: false, message: "propertyId is required" }, { status: 400 });
    }

    // Fallback: If partnerPhone is missing, query property document / settings in Firestore
    if (!partnerPhone && db) {
      try {
        const propDoc = await getDoc(doc(db, "properties", propertyId));
        if (propDoc.exists()) {
          const pData = propDoc.data();
          partnerPhone = pData.ownerPhone || pData.phone || pData.contactPhone || pData.managerPhone;
          if (!partnerName) partnerName = pData.ownerName || pData.name || "Master Admin";
          if (!propertyName) propertyName = pData.propertyName || pData.name;
        }

        if (!partnerPhone) {
          const settingsDoc = await getDoc(doc(db, "properties", propertyId, "settings", "current"));
          if (settingsDoc.exists()) {
            const sData = settingsDoc.data();
            partnerPhone = sData.phone || sData.ownerPhone;
            if (!partnerName) partnerName = sData.ownerName || "Master Admin";
            if (!propertyName) propertyName = sData.propertyName;
          }
        }
      } catch (e) {
        console.warn("Notice looking up property phone for payment proof alert:", e);
      }
    }

    if (!partnerPhone) {
      return NextResponse.json({ success: false, message: "No phone number available to notify" }, { status: 400 });
    }

    const result = await sendWhatsAppMessage({
      toPhone: partnerPhone,
      recipientName: partnerName || "Property Partner",
      propertyId,
      propertyName: propertyName || "TenoPilot PG",
      type: "PAYMENT_PROOF_ALERT",
      params: {
        amount,
        roomNumber,
        utrNumber: utrNumber || "Screenshot Attached",
        upiId,
        proofId,
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("Payment proof notify error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
