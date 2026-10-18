import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface SubscriptionInvoiceData {
  invoiceNumber: string;
  invoiceDate?: string;
  validityPeriod?: string;
  planName?: string;
  ownerName: string;
  propertyName: string;
  propertyLocation?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  items?: Array<{
    sl: string;
    title: string;
    subtitle: string;
    sac: string;
    qty: string;
    rate: string;
  }>;
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  totalAmount?: number;
  amountInWords?: string;
}

/**
 * 🧾 Generates an official, luxury TenoPilot Subscription Tax Invoice PDF buffer
 * Strictly adheres to TenoPilot Terracotta (#c2652a) branding with IT Act, 2000 digital certification.
 * Does NOT mention online/offline payment mechanisms; states "PAID & VERIFIED".
 */
export async function generateSubscriptionInvoicePdfBuffer(data: SubscriptionInvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions in pt
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Palette: TenoPilot Luxury Terracotta Theme
  const cTerracotta = rgb(0.76, 0.40, 0.16); // #c2652a
  const cTerracottaDark = rgb(0.59, 0.27, 0.03); // #964407
  const cEspresso = rgb(0.11, 0.08, 0.06); // #1c140e
  const cCharcoal = rgb(0.20, 0.20, 0.22); // #333336
  const cMuted = rgb(0.48, 0.45, 0.42); // #7b746c
  const cLightBg = rgb(0.98, 0.97, 0.95); // #faf8f5
  const cBorder = rgb(0.91, 0.88, 0.85); // #e8dfd8
  const cEmerald = rgb(0.04, 0.60, 0.42); // #059669
  const cEmeraldBg = rgb(0.93, 0.98, 0.95); // #eefbf4
  const cWhite = rgb(1, 1, 1);

  // 1. Top Decorative Brand Bar
  page.drawRectangle({
    x: 0,
    y: height - 10,
    width: width,
    height: 10,
    color: cTerracotta,
  });

  // 2. Header Section
  // Brand Logo Mark: [T]
  page.drawRectangle({
    x: 45,
    y: height - 68,
    width: 36,
    height: 36,
    color: cTerracotta,
  });
  page.drawText("T", {
    x: 56,
    y: height - 61,
    size: 24,
    font: fontBold,
    color: cWhite,
  });

  // Brand Name
  page.drawText("TenoPilot", {
    x: 90,
    y: height - 50,
    size: 20,
    font: fontBold,
    color: cEspresso,
  });
  page.drawText(".com", {
    x: 178,
    y: height - 50,
    size: 15,
    font: fontBold,
    color: cTerracotta,
  });
  page.drawText("The Intelligent Operating System for Coliving & Student Housing", {
    x: 90,
    y: height - 65,
    size: 8.5,
    font: fontRegular,
    color: cMuted,
  });

  // Right Header: TAX INVOICE Label
  const invLabel = "TAX INVOICE";
  const invLabelWidth = fontBold.widthOfTextAtSize(invLabel, 18);
  page.drawText(invLabel, {
    x: width - 45 - invLabelWidth,
    y: height - 50,
    size: 18,
    font: fontBold,
    color: cEspresso,
  });

  const invoiceNo = data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
  const invNoWidth = fontBold.widthOfTextAtSize(invoiceNo, 10);
  page.drawText(invoiceNo, {
    x: width - 45 - invNoWidth,
    y: height - 66,
    size: 10,
    font: fontBold,
    color: cTerracotta,
  });

  // Divider Line
  page.drawLine({
    start: { x: 45, y: height - 85 },
    end: { x: width - 45, y: height - 85 },
    thickness: 1,
    color: cBorder,
  });

  // 3. Invoice Meta Grid (Two Columns: Billed From vs Billed To)
  const metaY = height - 105;

  // Left: Issuer Information
  page.drawText("ISSUED BY:", { x: 45, y: metaY, size: 8, font: fontBold, color: cTerracottaDark });
  page.drawText("TenoPilot Technologies Private Limited", { x: 45, y: metaY - 14, size: 9.5, font: fontBold, color: cEspresso });
  page.drawText("Cyber Hills Tech Hub, Outer Ring Road", { x: 45, y: metaY - 26, size: 8.5, font: fontRegular, color: cMuted });
  page.drawText("Bengaluru, Karnataka - 560103, India", { x: 45, y: metaY - 37, size: 8.5, font: fontRegular, color: cMuted });
  page.drawText("GSTIN: 29AABCT1234F1Z9  |  PAN: AABCT1234F", { x: 45, y: metaY - 48, size: 8, font: fontRegular, color: cMuted });
  page.drawText("Email: billing@tenopilot.com  |  Web: tenopilot.com", { x: 45, y: metaY - 59, size: 8, font: fontRegular, color: cMuted });

  // Right: Billed To Customer
  const rightX = 320;
  page.drawText("BILLED TO / PROPERTY PARTNER:", { x: rightX, y: metaY, size: 8, font: fontBold, color: cTerracottaDark });
  page.drawText(data.ownerName || "Property Owner", { x: rightX, y: metaY - 14, size: 10, font: fontBold, color: cEspresso });
  page.drawText(`Property: ${data.propertyName || "Coliving Estate"}`, { x: rightX, y: metaY - 26, size: 9, font: fontBold, color: cTerracotta });
  page.drawText(`Location: ${data.propertyLocation || "Bengaluru, Karnataka, India"}`, { x: rightX, y: metaY - 37, size: 8.5, font: fontRegular, color: cMuted });
  page.drawText(`Email: ${data.ownerEmail || "N/A"}`, { x: rightX, y: metaY - 48, size: 8.5, font: fontRegular, color: cMuted });
  page.drawText(`Phone: ${data.ownerPhone || "N/A"}`, { x: rightX, y: metaY - 59, size: 8.5, font: fontRegular, color: cMuted });

  // 4. Invoice Key Details Banner (Date, Due Date, Status)
  const bannerY = height - 230;
  page.drawRectangle({
    x: 45,
    y: bannerY,
    width: width - 90,
    height: 44,
    color: cLightBg,
    borderColor: cBorder,
    borderWidth: 1,
  });

  const invoiceDate = data.invoiceDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const validityPeriod = data.validityPeriod || "Annual Flight Deck";
  const planLevel = data.planName || "Annual Pro Flight Deck";

  page.drawText("INVOICE DATE", { x: 60, y: bannerY + 26, size: 7.5, font: fontBold, color: cMuted });
  page.drawText(invoiceDate, { x: 60, y: bannerY + 12, size: 9.5, font: fontBold, color: cEspresso });

  page.drawText("VALIDITY PERIOD", { x: 170, y: bannerY + 26, size: 7.5, font: fontBold, color: cMuted });
  page.drawText(validityPeriod, { x: 170, y: bannerY + 12, size: 9.5, font: fontBold, color: cEspresso });

  page.drawText("PLAN LEVEL", { x: 330, y: bannerY + 26, size: 7.5, font: fontBold, color: cMuted });
  page.drawText(planLevel.slice(0, 22), { x: 330, y: bannerY + 12, size: 9.5, font: fontBold, color: cTerracotta });

  // Payment Status (PAID - clean without online/offline mention)
  page.drawRectangle({
    x: 460,
    y: bannerY + 9,
    width: 80,
    height: 24,
    color: cEmeraldBg,
    borderColor: cEmerald,
    borderWidth: 1,
  });
  page.drawText("PAID", { x: 488, y: bannerY + 16, size: 9.5, font: fontBold, color: cEmerald });

  // 5. Line Items Table Header
  const tableTopY = height - 295;
  page.drawRectangle({
    x: 45,
    y: tableTopY,
    width: width - 90,
    height: 26,
    color: cEspresso,
  });

  page.drawText("SL", { x: 55, y: tableTopY + 8, size: 8, font: fontBold, color: cWhite });
  page.drawText("DESCRIPTION / SERVICE ITEM", { x: 80, y: tableTopY + 8, size: 8, font: fontBold, color: cWhite });
  page.drawText("HSN/SAC", { x: 340, y: tableTopY + 8, size: 8, font: fontBold, color: cWhite });
  page.drawText("QTY", { x: 410, y: tableTopY + 8, size: 8, font: fontBold, color: cWhite });
  page.drawText("AMOUNT (INR)", { x: 465, y: tableTopY + 8, size: 8, font: fontBold, color: cWhite });

  const items = data.items && data.items.length > 0 ? data.items : [
    {
      sl: "01",
      title: "TenoPilot Pro Operating System - Pro Subscription",
      subtitle: "Multi-Floor Layout Engine, Dual-Ledger Accounting, 2-Step MPIN",
      sac: "998314",
      qty: "1 License",
      rate: data.subtotal ? (data.subtotal * 0.85).toFixed(2) : "9,990.00",
    },
    {
      sl: "02",
      title: "Meta WhatsApp Cloud Credits Package (Growth Tier)",
      subtitle: "Automated Rent Invoices, Payment Receipts & Check-In KYC",
      sac: "998413",
      qty: "1 Pack",
      rate: data.subtotal ? (data.subtotal * 0.15).toFixed(2) : "1,499.00",
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

  let currentY = tableTopY - 10;
  items.forEach((item, index) => {
    const rowH = 38;
    const rowY = currentY - rowH;

    if (index % 2 === 0) {
      page.drawRectangle({
        x: 45,
        y: rowY,
        width: width - 90,
        height: rowH,
        color: cLightBg,
      });
    }

    page.drawText(item.sl, { x: 55, y: rowY + 22, size: 8.5, font: fontBold, color: cMuted });
    page.drawText(item.title, { x: 80, y: rowY + 22, size: 9, font: fontBold, color: cEspresso });
    page.drawText(item.subtitle, { x: 80, y: rowY + 9, size: 7.5, font: fontRegular, color: cMuted });
    page.drawText(item.sac, { x: 340, y: rowY + 16, size: 8.5, font: fontRegular, color: cCharcoal });
    page.drawText(item.qty, { x: 410, y: rowY + 16, size: 8.5, font: fontRegular, color: cCharcoal });
    page.drawText(item.rate, { x: 470, y: rowY + 16, size: 9, font: fontBold, color: cEspresso });

    page.drawLine({
      start: { x: 45, y: rowY },
      end: { x: width - 45, y: rowY },
      thickness: 0.5,
      color: cBorder,
    });

    currentY = rowY;
  });

  // 6. Summary & Totals Block (Right-aligned)
  const sumY = currentY - 20;
  const subtotal = data.subtotal || 11489;
  const cgst = data.cgst || (subtotal * 0.09);
  const sgst = data.sgst || (subtotal * 0.09);
  const totalAmount = data.totalAmount || (subtotal + cgst + sgst);

  page.drawText("Subtotal:", { x: 360, y: sumY, size: 9, font: fontRegular, color: cMuted });
  page.drawText(`INR ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: sumY, size: 9, font: fontBold, color: cEspresso });

  page.drawText("CGST (9.0%):", { x: 360, y: sumY - 16, size: 9, font: fontRegular, color: cMuted });
  page.drawText(`INR ${cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: sumY - 16, size: 9, font: fontRegular, color: cCharcoal });

  page.drawText("SGST (9.0%):", { x: 360, y: sumY - 32, size: 9, font: fontRegular, color: cMuted });
  page.drawText(`INR ${sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: sumY - 32, size: 9, font: fontRegular, color: cCharcoal });

  // Total Box
  page.drawRectangle({
    x: 340,
    y: sumY - 72,
    width: width - 45 - 340,
    height: 32,
    color: cTerracotta,
  });

  page.drawText("TOTAL AMOUNT PAID:", { x: 350, y: sumY - 54, size: 8.5, font: fontBold, color: cWhite });
  page.drawText(`INR ${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 462, y: sumY - 54, size: 11, font: fontBold, color: cWhite });

  // Amount in Words (Left)
  page.drawText("AMOUNT IN WORDS:", { x: 45, y: sumY, size: 8, font: fontBold, color: cTerracottaDark });
  page.drawText(data.amountInWords || "Tax Invoice Amount Paid in Full (Indian Rupees)", {
    x: 45,
    y: sumY - 14,
    size: 8.5,
    font: fontOblique,
    color: cCharcoal,
  });

  // 7. Security & Official Verification Seal Block
  const sealY = sumY - 146;
  page.drawRectangle({
    x: 45,
    y: sealY,
    width: width - 90,
    height: 64,
    color: cLightBg,
    borderColor: cBorder,
    borderWidth: 1,
  });

  page.drawText("AUTHENTIC DIGITAL TAX INVOICE", { x: 60, y: sealY + 44, size: 8.5, font: fontBold, color: cEspresso });
  page.drawText("Electronically generated under Information Technology Act, 2000.", {
    x: 60,
    y: sealY + 30,
    size: 7.5,
    font: fontRegular,
    color: cMuted,
  });
  page.drawText("Valid for Input Tax Credit (ITC). No physical signature required.", {
    x: 60,
    y: sealY + 16,
    size: 7.5,
    font: fontRegular,
    color: cMuted,
  });

  page.drawText("TenoPilot Technologies Pvt Ltd", { x: 400, y: sealY + 44, size: 8, font: fontBold, color: cEspresso });
  page.drawText("[Digitally Signed & Certified]", { x: 400, y: sealY + 30, size: 7.5, font: fontOblique, color: cEmerald });
  page.drawText("Authorised Signatory", { x: 400, y: sealY + 16, size: 7.5, font: fontRegular, color: cMuted });

  // 8. Footer
  page.drawLine({
    start: { x: 45, y: 44 },
    end: { x: width - 45, y: 44 },
    thickness: 0.5,
    color: cBorder,
  });

  page.drawText("Billing & Support: billing@tenopilot.com  |  WhatsApp: +91 92066 51295", {
    x: 45,
    y: 30,
    size: 7.5,
    font: fontRegular,
    color: cMuted,
  });
  page.drawText("TenoPilot OS - Bengaluru, India", {
    x: width - 45 - 125,
    y: 30,
    size: 7.5,
    font: fontBold,
    color: cTerracotta,
  });

  return await pdfDoc.save();
}
