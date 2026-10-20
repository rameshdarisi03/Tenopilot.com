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
    const discountPct = parseFloat(searchParams.get("discount") || searchParams.get("discountPercentage") || "0") || 0;
    const rawAmount = parseFloat(searchParams.get("totalAmount") || searchParams.get("amount") || "11489");
    const parsedAmount = !isNaN(rawAmount) && rawAmount > 0 ? rawAmount : 11489;

    let subtotal: number;
    let discountAmount: number = 0;
    let taxableAmount: number;
    let cgst: number;
    let sgst: number;
    let totalAmount: number;

    if (isInclusive) {
      totalAmount = parsedAmount;
      // Taxable amount before GST
      taxableAmount = Math.round((totalAmount / 1.18) * 100) / 100;
      if (discountPct > 0 && discountPct < 100) {
        // Original subtotal before discount
        subtotal = Math.round((taxableAmount / (1 - discountPct / 100)) * 100) / 100;
        discountAmount = Math.round((subtotal - taxableAmount) * 100) / 100;
      } else {
        subtotal = taxableAmount;
      }
      cgst = Math.round(((totalAmount - taxableAmount) / 2) * 100) / 100;
      sgst = Math.round((totalAmount - taxableAmount - cgst) * 100) / 100;
    } else {
      subtotal = parsedAmount;
      discountAmount = discountPct > 0 ? Math.round(((subtotal * discountPct) / 100) * 100) / 100 : 0;
      taxableAmount = Math.max(0, subtotal - discountAmount);
      cgst = Math.round(taxableAmount * 0.09 * 100) / 100;
      sgst = Math.round(taxableAmount * 0.09 * 100) / 100;
      totalAmount = Math.round((taxableAmount + cgst + sgst) * 100) / 100;
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
      discountPercentage: discountPct > 0 ? discountPct : undefined,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
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
