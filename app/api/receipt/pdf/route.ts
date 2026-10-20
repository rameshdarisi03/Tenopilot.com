import { NextRequest, NextResponse } from "next/server";
import { generateReceiptPdfBuffer, ReceiptPdfData } from "@/lib/pdfGenerator";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const receiptNo = searchParams.get("receiptNo") || `RCP-${Date.now().toString().slice(-6)}`;
    const propertyName = searchParams.get("propertyName") || "TenoPilot Coliving";
    const propertyAddress = searchParams.get("propertyAddress") || "Premium Student & Professional Housing";
    const managerPhone = searchParams.get("managerPhone") || "+91 92066 51295";
    const residentName = searchParams.get("residentName") || "Resident";
    const roomNumber = searchParams.get("roomNumber") || "N/A";
    const bedCode = searchParams.get("bedCode") || "Bed 1";
    const amount = Number(searchParams.get("amount") || 0);
    const paidDate = searchParams.get("paidDate") || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const paymentMode = searchParams.get("paymentMode") || "UPI / Digital Transfer";
    const paidTo = searchParams.get("paidTo") || "Main Business Pool";
    const month = searchParams.get("month") || "Current Cycle";
    const isDeposit = searchParams.get("isDeposit") === "true" || receiptNo.startsWith("DEP");
    const isSettlement = searchParams.get("isSettlement") === "true" || receiptNo.startsWith("REF") || receiptNo.startsWith("SETTLE");
    const rentAmount = searchParams.get("rentAmount") ? Number(searchParams.get("rentAmount")) : undefined;
    const depositAmount = searchParams.get("depositAmount") ? Number(searchParams.get("depositAmount")) : undefined;

    const pdfData: ReceiptPdfData = {
      receiptNo,
      propertyName,
      propertyAddress,
      managerPhone,
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
      rentAmount,
      depositAmount,
      settlementDetails: isSettlement
        ? {
            initialDeposit: searchParams.get("initialDeposit") ? Number(searchParams.get("initialDeposit")) : amount,
            unpaidRent: searchParams.get("unpaidRent") ? Number(searchParams.get("unpaidRent")) : 0,
            repairs: searchParams.get("repairs") ? Number(searchParams.get("repairs")) : 0,
            maintenance: searchParams.get("maintenance") ? Number(searchParams.get("maintenance")) : 0,
            totalDeductions: searchParams.get("totalDeductions") ? Number(searchParams.get("totalDeductions")) : 0,
            netRefunded: searchParams.get("netRefunded") ? Number(searchParams.get("netRefunded")) : amount,
            status: searchParams.get("status") || "SETTLED & CLOSED",
            notes: searchParams.get("notes") || undefined,
          }
        : undefined,
    };

    const pdfBuffer = await generateReceiptPdfBuffer(pdfData);

    const safeFilename = `${receiptNo}_${residentName.replace(/\s+/g, "_")}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("Error generating receipt PDF:", error);
    return NextResponse.json({ error: "Failed to generate receipt PDF", details: error.message }, { status: 500 });
  }
}
