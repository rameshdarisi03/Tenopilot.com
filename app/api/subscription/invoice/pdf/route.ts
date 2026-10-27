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

    let resolvedPlanTitle = planName;
    let customItems = undefined;

    if (
      planName === "MULTI_PROPERTY_MONTHLY" ||
      planName.toLowerCase().includes("multi_property") ||
      planName.toLowerCase().includes("multi-property")
    ) {
      resolvedPlanTitle = "Multi-Property Add-on";
      customItems = [
        {
          sl: "01",
          title: "Multi-Property Expansion Add-on — Building Slot #2",
          subtitle: "Dedicated Multi-Building Layout Engine, Independent Ledgers & MPIN Access",
          sac: "998314",
          qty: "1 Month",
          rate: taxableAmount.toFixed(2),
        },
        {
          sl: "02",
          title: "Organization Portfolio Integration & Multi-Branch Flight Deck",
          subtitle: "Unified Owner Organization ID & Single-Sign-On Staff Delegation",
          sac: "998319",
          qty: "1 Add-on",
          rate: "0.00 (Included)",
        },
      ];
    } else if (planName === "PRO_MONTHLY") {
      resolvedPlanTitle = "Pro Monthly";
      customItems = [
        {
          sl: "01",
          title: "TenoPilot Pro Operating System - Monthly Subscription",
          subtitle: "Multi-Floor Layout Engine, Dual-Ledger Accounting, 2-Step MPIN",
          sac: "998314",
          qty: "1 Month",
          rate: taxableAmount.toFixed(2),
        },
        {
          sl: "02",
          title: "FastTrack 1-Click AI Register Migration & Onboarding",
          subtitle: "Full digital conversion of paper room/bed diaries into Cloud SSOT",
          sac: "998319",
          qty: "1 PG",
          rate: "0.00 (Free)",
        },
      ];
    } else if (planName === "TENANT_EXTENSION_PACK_25") {
      resolvedPlanTitle = "Tenant Pack (+25)";
      customItems = [
        {
          sl: "01",
          title: "Active Resident Capacity Extension (+25 Tenant Slots)",
          subtitle: "High-Concurrency Cloud Ledger & Extended Occupant Threshold",
          sac: "998314",
          qty: "1 Pack",
          rate: taxableAmount.toFixed(2),
        },
      ];
    } else if (planName === "PRO_ANNUAL" || planName.includes("Annual")) {
      resolvedPlanTitle = "Pro Annual";
      customItems = [
        {
          sl: "01",
          title: "TenoPilot Pro Operating System - Annual Subscription",
          subtitle: "Multi-Floor Layout Engine, Dual-Ledger Accounting, 2-Step MPIN",
          sac: "998314",
          qty: "1 Yr",
          rate: (taxableAmount * 0.85).toFixed(2),
        },
        {
          sl: "02",
          title: "Meta WhatsApp Cloud Credits Package (Growth Tier)",
          subtitle: "1,500 High-Deliverability Automated Rent Invoices & Reminders",
          sac: "998413",
          qty: "1 Pack",
          rate: (taxableAmount * 0.15).toFixed(2),
        },
        {
          sl: "03",
          title: "FastTrack 1-Click AI Register Migration & Onboarding",
          subtitle: "Full digital conversion of paper room/bed diaries into Cloud SSOT",
          sac: "998319",
          qty: "1 PG",
          rate: "0.00 (Free)",
        },
      ];
    }

    const pdfBuffer = await generateSubscriptionInvoicePdfBuffer({
      invoiceNumber,
      invoiceDate,
      validityPeriod,
      planName: resolvedPlanTitle,
      ownerName,
      propertyName,
      propertyLocation,
      ownerEmail,
      ownerPhone,
      items: customItems,
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
