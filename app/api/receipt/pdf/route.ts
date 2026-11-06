import { NextRequest, NextResponse } from "next/server";
import { generateReceiptPdfBuffer, ReceiptPdfData } from "@/lib/pdfGenerator";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId") || undefined;
    const receiptNo = searchParams.get("receiptNo") || `RCP-${Date.now().toString().slice(-6)}`;
    let propertyName = searchParams.get("propertyName") || "TenoPilot Coliving";
    let propertyAddress = searchParams.get("propertyAddress") || "Premium Student & Professional Housing";
    let managerPhone = searchParams.get("managerPhone") || "+91 92066 51295";
    let ownerName = searchParams.get("ownerName") || undefined;
    let signatureUrl = searchParams.get("signatureUrl") || undefined;
    const residentName = searchParams.get("residentName") || "Resident";
    const roomNumber = searchParams.get("roomNumber") || "N/A";
    const bedCode = searchParams.get("bedCode") || "Bed 1";
    const amount = Number(searchParams.get("amount") || 0);
    const paidDate = searchParams.get("paidDate") || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const paymentMode = searchParams.get("paymentMode") || "UPI / Digital Transfer";
    const paidTo = searchParams.get("paidTo") || "Main Business Pool";
    const month = searchParams.get("month") || "Current Cycle";
    const joiningDate = searchParams.get("joiningDate") || undefined;
    const rentAmountParam = searchParams.get("rentAmount");
    const depositAmountParam = searchParams.get("depositAmount");
    const parkingAmountParam = searchParams.get("parkingAmount");
    const rentAmount = rentAmountParam !== null && rentAmountParam !== "" ? Number(rentAmountParam) : undefined;
    const depositAmount = depositAmountParam !== null && depositAmountParam !== "" ? Number(depositAmountParam) : undefined;
    const parkingAmount = parkingAmountParam !== null && parkingAmountParam !== "" ? Number(parkingAmountParam) : undefined;
    const maintenanceAmountParam = searchParams.get("maintenanceAmount") || searchParams.get("maintenance");
    const maintenanceAmount = maintenanceAmountParam !== null && maintenanceAmountParam !== "" ? Number(maintenanceAmountParam) : undefined;
    const isDeposit =
      searchParams.get("isDeposit") === "true" ||
      receiptNo.startsWith("DEP") ||
      month.toLowerCase().includes("deposit") ||
      Boolean(depositAmount && depositAmount > 0 && (!rentAmount || rentAmount === 0));
    const isSettlement = searchParams.get("isSettlement") === "true" || receiptNo.startsWith("REF") || receiptNo.startsWith("SETTLE");
    const stayType = searchParams.get("stayType") || undefined;
    const isGuest =
      searchParams.get("isGuest") === "true" ||
      stayType === "Guest" ||
      receiptNo.includes("GUEST") ||
      month.toLowerCase().includes("guest") ||
      month.toLowerCase().includes("short stay");
    const checkInDate = searchParams.get("checkInDate") || joiningDate || undefined;
    const checkOutDate = searchParams.get("checkOutDate") || searchParams.get("checkoutDate") || undefined;
    const stayDurationDays = searchParams.get("stayDurationDays") ? Number(searchParams.get("stayDurationDays")) : undefined;
    const dailyRate = searchParams.get("dailyRate") ? Number(searchParams.get("dailyRate")) : undefined;
    const totalTariff = searchParams.get("totalTariff") ? Number(searchParams.get("totalTariff")) : undefined;
    const totalPaid = searchParams.get("totalPaid") ? Number(searchParams.get("totalPaid")) : undefined;
    const isVoided = searchParams.get("isVoided") === "true";
    const voidReason = searchParams.get("voidReason") || undefined;
    const replacesReceiptNo = searchParams.get("replacesReceiptNo") || undefined;
    const replacedByReceiptNo = searchParams.get("replacedByReceiptNo") || undefined;

    // Dedicated Guest Parameters
    const guestMobile = searchParams.get("guestMobile") || undefined;
    const purpose = searchParams.get("purpose") || undefined;
    const initialPayment = searchParams.get("initialPayment") ? Number(searchParams.get("initialPayment")) : undefined;
    const initialPaymentDate = searchParams.get("initialPaymentDate") || undefined;
    const finalPayment = searchParams.get("finalPayment") ? Number(searchParams.get("finalPayment")) : undefined;
    const finalPaymentDate = searchParams.get("finalPaymentDate") || undefined;
    const balanceDue = searchParams.get("balanceDue") !== null && searchParams.get("balanceDue") !== "" ? Number(searchParams.get("balanceDue")) : undefined;
    const totalStayAmount = searchParams.get("totalStayAmount") ? Number(searchParams.get("totalStayAmount")) : totalTariff;

    let additionalCharges = [];
    try {
      const addChargesRaw = searchParams.get("additionalCharges");
      if (addChargesRaw) additionalCharges = JSON.parse(addChargesRaw);
    } catch (e) {
      // Ignore parse failure
    }

    if (propertyId && (!signatureUrl || !ownerName)) {
      try {
        const propSnap = await getDoc(doc(db, "properties", propertyId, "settings", "config"));
        if (propSnap.exists()) {
          const pData = propSnap.data();
          if (!signatureUrl && pData.signatureUrl) signatureUrl = pData.signatureUrl;
          if (!ownerName && pData.ownerName) ownerName = pData.ownerName;
          if (propertyName === "TenoPilot Coliving" && pData.propertyName) propertyName = pData.propertyName;
          if (propertyAddress === "Premium Student & Professional Housing" && pData.propertyAddress) propertyAddress = pData.propertyAddress;
          if (managerPhone === "+91 92066 51295" && pData.managerPhone) managerPhone = pData.managerPhone;
        }
      } catch (fsErr) {
        console.warn("Notice loading property settings for receipt PDF:", fsErr);
      }
    }

    const pdfData: ReceiptPdfData = {
      receiptNo,
      propertyName,
      propertyAddress,
      managerPhone,
      ownerName,
      signatureUrl,
      joiningDate,
      residentName,
      roomNumber,
      bedCode,
      amount,
      paidDate,
      paymentMode,
      paidTo,
      month,
      isDeposit,
      isSettlement,
      isVoided,
      voidReason,
      replacesReceiptNo,
      replacedByReceiptNo,
      rentAmount,
      depositAmount,
      parkingAmount,
      maintenanceAmount,
      stayType,
      isGuest,
      guestMobile,
      purpose,
      checkInDate,
      checkOutDate,
      stayDurationDays,
      dailyRate,
      totalStayAmount,
      initialPayment,
      initialPaymentDate,
      finalPayment,
      finalPaymentDate,
      balanceDue,
      additionalCharges,
      settlementDetails: isSettlement
        ? {
            initialDeposit: searchParams.get("initialDeposit") ? Number(searchParams.get("initialDeposit")) : (depositAmount || 0),
            unpaidDeposit: searchParams.get("unpaidDeposit") ? Number(searchParams.get("unpaidDeposit")) : 0,
            unpaidRent: searchParams.get("unpaidRent") ? Number(searchParams.get("unpaidRent")) : 0,
            repairs: searchParams.get("repairs") ? Number(searchParams.get("repairs")) : 0,
            maintenance: searchParams.get("maintenance") ? Number(searchParams.get("maintenance")) : 0,
            totalDeductions: searchParams.get("totalDeductions") ? Number(searchParams.get("totalDeductions")) : 0,
            netRefunded: searchParams.get("netRefunded") ? Number(searchParams.get("netRefunded")) : amount,
            netDeficit: searchParams.get("netDeficit") ? Number(searchParams.get("netDeficit")) : 0,
            totalTariff,
            totalPaid,
            status: searchParams.get("status") || "SETTLED & CLOSED",
            notes: searchParams.get("notes") || undefined,
          }
        : undefined,
    };

    const pdfBuffer = await generateReceiptPdfBuffer(pdfData);

    const safeFilename = `${receiptNo}_${residentName.replace(/\s+/g, "_")}.pdf`;

    const isDownload = searchParams.get("download") === "true";
    const dispositionType = isDownload ? "attachment" : "inline";

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${safeFilename}"`,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("Error generating receipt PDF:", error);
    return NextResponse.json({ error: "Failed to generate receipt PDF", details: error.message }, { status: 500 });
  }
}
