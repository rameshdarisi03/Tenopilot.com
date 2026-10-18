import { NextRequest, NextResponse } from "next/server";
import { generateSubscriptionInvoicePdfBuffer } from "@/lib/subscriptionInvoiceGenerator";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const invoiceNumber = searchParams.get("invoiceNo") || `INV-${Date.now().toString().slice(-6)}`;
    const ownerName = searchParams.get("ownerName") || "Property Partner";
    const propertyName = searchParams.get("propertyName") || "TenoPilot Coliving";
    const propertyLocation = searchParams.get("propertyLocation") || "Bengaluru, Karnataka, India";
    const ownerEmail = searchParams.get("ownerEmail") || "";
    const ownerPhone = searchParams.get("ownerPhone") || "";
    const planName = searchParams.get("planName") || "Annual Pro Flight Deck";
    const validityPeriod = searchParams.get("validityPeriod") || "Annual Flight Deck";
    const invoiceDate = searchParams.get("invoiceDate") || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const isInclusive = searchParams.get("inclusive") !== "false";
    const rawAmount = parseFloat(searchParams.get("totalAmount") || searchParams.get("amount") || "11489");
    const parsedAmount = !isNaN(rawAmount) && rawAmount > 0 ? rawAmount : 11489;

    let subtotal: number;
    let cgst: number;
    let sgst: number;
    let totalAmount: number;

    if (isInclusive) {
      totalAmount = parsedAmount;
      subtotal = Math.round((totalAmount / 1.18) * 100) / 100;
      cgst = Math.round(((totalAmount - subtotal) / 2) * 100) / 100;
      sgst = Math.round((totalAmount - subtotal - cgst) * 100) / 100;
    } else {
      subtotal = parsedAmount;
      cgst = Math.round(subtotal * 0.09 * 100) / 100;
      sgst = Math.round(subtotal * 0.09 * 100) / 100;
      totalAmount = Math.round((subtotal + cgst + sgst) * 100) / 100;
    }

    const pdfBuffer = await generateSubscriptionInvoicePdfBuffer({
      invoiceNumber,
      invoiceDate,
      validityPeriod,
      planName,
      ownerName,
      propertyName,
      propertyLocation,
      ownerEmail,
      ownerPhone,
      subtotal,
      cgst,
      sgst,
      totalAmount,
      amountInWords: "Tax Invoice Amount Paid in Full (Indian Rupees)",
    });

    const safeFilename = `TenoPilot_Invoice_${invoiceNumber}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error: any) {
    console.error("GET /api/subscription/invoice/pdf error:", error);
    return NextResponse.json(
      { error: "Failed to generate subscription invoice PDF." },
      { status: 500 }
    );
  }
}
