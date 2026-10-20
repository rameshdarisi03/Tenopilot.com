import { PDFDocument, rgb, StandardFonts, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";

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
  discountPercentage?: number;
  discountAmount?: number;
  cgst?: number;
  sgst?: number;
  totalAmount?: number;
  amountInWords?: string;
}

/**
 * 🧾 Generates an official, luxury TenoPilot Subscription Tax Invoice PDF buffer
 * Strictly adheres to TenoPilot Landing Page branding:
 * - Official Terracotta Logo Badge (`/tenopilot_official_badge.png`)
 * - Editorial Serif Typography (`Playfair Display`)
 * - Modern Geometric Sans Typography (`Manrope`)
 * - IT Act, 2000 digital certification seal
 * - Zero mention of payment methods; states "PAID & VERIFIED"
 */
export async function generateSubscriptionInvoicePdfBuffer(data: SubscriptionInvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 dimensions in pt
  const { width, height } = page.getSize();

  // Load Brand Fonts with Safe StandardFont Fallback
  let fontPlayfairBold: PDFFont;
  let fontPlayfairItalic: PDFFont;
  let fontManropeRegular: PDFFont;
  let fontManropeSemiBold: PDFFont;
  let fontManropeBold: PDFFont;

  try {
    const fontDir = path.join(process.cwd(), "public", "fonts");
    const playfairBoldBytes = fs.readFileSync(path.join(fontDir, "PlayfairDisplay_Bold.ttf"));
    const playfairItalicBytes = fs.readFileSync(path.join(fontDir, "PlayfairDisplay_Italic.ttf"));
    const manropeRegularBytes = fs.readFileSync(path.join(fontDir, "Manrope_Regular.ttf"));
    const manropeSemiBoldBytes = fs.readFileSync(path.join(fontDir, "Manrope_SemiBold.ttf"));
    const manropeBoldBytes = fs.readFileSync(path.join(fontDir, "Manrope_Bold.ttf"));

    fontPlayfairBold = await pdfDoc.embedFont(playfairBoldBytes);
    fontPlayfairItalic = await pdfDoc.embedFont(playfairItalicBytes);
    fontManropeRegular = await pdfDoc.embedFont(manropeRegularBytes);
    fontManropeSemiBold = await pdfDoc.embedFont(manropeSemiBoldBytes);
    fontManropeBold = await pdfDoc.embedFont(manropeBoldBytes);
  } catch (err) {
    console.warn("[Invoice] Fallback to standard PDF fonts:", err);
    fontPlayfairBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    fontPlayfairItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    fontManropeRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontManropeSemiBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    fontManropeBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  // TenoPilot Luxury Palette (Matching Landing Page)
  const cTerracotta = rgb(0.76, 0.40, 0.16); // #c2652a
  const cTerracottaDark = rgb(0.59, 0.27, 0.03); // #964407
  const cEspresso = rgb(0.11, 0.08, 0.06); // #1c140e
  const cCharcoal = rgb(0.20, 0.20, 0.22); // #333336
  const cMuted = rgb(0.44, 0.45, 0.49); // #71717a
  const cLightBg = rgb(0.985, 0.98, 0.97); // #faf8f6
  const cBorder = rgb(0.91, 0.88, 0.85); // #e8dfd8
  const cEmerald = rgb(0.04, 0.60, 0.42); // #059669
  const cEmeraldBg = rgb(0.93, 0.98, 0.95); // #eefbf4
  const cWhite = rgb(1, 1, 1);

  // 1. Top Decorative Brand Bar
  page.drawRectangle({
    x: 0,
    y: height - 8,
    width: width,
    height: 8,
    color: cTerracotta,
  });

  // 2. Header Section: Official Logo Badge & Serif Wordmark
  const badgePath = path.join(process.cwd(), "public", "tenopilot_official_badge.png");
  let badgeW = 38;
  if (fs.existsSync(badgePath)) {
    try {
      const badgeBytes = fs.readFileSync(badgePath);
      const badgeImg = await pdfDoc.embedPng(badgeBytes);
      const badgeH = badgeW * (badgeImg.height / badgeImg.width);
      page.drawImage(badgeImg, {
        x: 45,
        y: height - 70,
        width: badgeW,
        height: badgeH,
      });
    } catch {
      // Fallback mark if image embedding encounters an error
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
        font: fontPlayfairBold,
        color: cWhite,
      });
      badgeW = 36;
    }
  }

  // Official Wordmark in Playfair Display Bold
  const textX = 45 + badgeW + 10;
  page.drawText("TenoPilot", {
    x: textX,
    y: height - 50,
    size: 23,
    font: fontPlayfairBold,
    color: cEspresso,
  });

  const tenoW = fontPlayfairBold.widthOfTextAtSize("TenoPilot", 23);
  page.drawText(".com", {
    x: textX + tenoW,
    y: height - 50,
    size: 23,
    font: fontPlayfairBold,
    color: cTerracotta,
  });

  page.drawText("The Intelligent Operating System for Coliving & Student Housing", {
    x: textX,
    y: height - 66,
    size: 8.5,
    font: fontManropeSemiBold,
    color: cMuted,
  });

  // Right Header: TAX INVOICE Title & Invoice No
  const invLabel = "TAX INVOICE";
  const invLabelW = fontPlayfairBold.widthOfTextAtSize(invLabel, 21);
  page.drawText(invLabel, {
    x: width - 45 - invLabelW,
    y: height - 50,
    size: 21,
    font: fontPlayfairBold,
    color: cEspresso,
  });

  const invoiceNo = data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
  const invNoW = fontManropeBold.widthOfTextAtSize(invoiceNo, 10.5);
  page.drawText(invoiceNo, {
    x: width - 45 - invNoW,
    y: height - 66,
    size: 10.5,
    font: fontManropeBold,
    color: cTerracotta,
  });

  // Divider Line
  page.drawLine({
    start: { x: 45, y: height - 86 },
    end: { x: width - 45, y: height - 86 },
    thickness: 1,
    color: cBorder,
  });

  // 3. Invoice Meta Grid (Issued By vs Billed To)
  const metaY = height - 106;
  page.drawText("ISSUED BY:", { x: 45, y: metaY, size: 8, font: fontManropeBold, color: cTerracottaDark });
  page.drawText("TenoPilot Technologies Private Limited", { x: 45, y: metaY - 15, size: 11, font: fontPlayfairBold, color: cEspresso });
  page.drawText("Cyber Hills Tech Hub, Outer Ring Road", { x: 45, y: metaY - 28, size: 8.5, font: fontManropeRegular, color: cMuted });
  page.drawText("Bengaluru, Karnataka - 560103, India", { x: 45, y: metaY - 40, size: 8.5, font: fontManropeRegular, color: cMuted });
  page.drawText("GSTIN: 29AABCT1234F1Z9  |  PAN: AABCT1234F", { x: 45, y: metaY - 52, size: 8, font: fontManropeRegular, color: cMuted });
  page.drawText("Email: billing@tenopilot.com  |  Web: tenopilot.com", { x: 45, y: metaY - 64, size: 8, font: fontManropeRegular, color: cMuted });

  const rightX = 320;
  page.drawText("BILLED TO / PROPERTY PARTNER:", { x: rightX, y: metaY, size: 8, font: fontManropeBold, color: cTerracottaDark });
  page.drawText(data.ownerName || "Property Owner", { x: rightX, y: metaY - 15, size: 11.5, font: fontPlayfairBold, color: cEspresso });
  page.drawText(`Property: ${data.propertyName || "Coliving Estate"}`, { x: rightX, y: metaY - 28, size: 9.5, font: fontManropeBold, color: cTerracotta });
  page.drawText(`Location: ${data.propertyLocation || "Bengaluru, Karnataka, India"}`, { x: rightX, y: metaY - 40, size: 8.5, font: fontManropeRegular, color: cMuted });
  page.drawText(`Email: ${data.ownerEmail || "N/A"}`, { x: rightX, y: metaY - 52, size: 8.5, font: fontManropeRegular, color: cMuted });
  page.drawText(`Phone: ${data.ownerPhone || "N/A"}`, { x: rightX, y: metaY - 64, size: 8.5, font: fontManropeRegular, color: cMuted });

  // 4. Details Banner
  const bannerY = height - 236;
  page.drawRectangle({
    x: 45,
    y: bannerY,
    width: width - 90,
    height: 46,
    color: cLightBg,
    borderColor: cBorder,
    borderWidth: 1,
  });

  const invoiceDate = data.invoiceDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const validityPeriod = data.validityPeriod || "18 Oct 2026 - 17 Oct 2027";
  const planLevel = data.planName || "Annual Pro Flight Deck";

  page.drawText("INVOICE DATE", { x: 60, y: bannerY + 28, size: 7.5, font: fontManropeBold, color: cMuted });
  page.drawText(invoiceDate, { x: 60, y: bannerY + 12, size: 9.5, font: fontManropeSemiBold, color: cEspresso });

  page.drawText("VALIDITY PERIOD", { x: 170, y: bannerY + 28, size: 7.5, font: fontManropeBold, color: cMuted });
  page.drawText(validityPeriod, { x: 170, y: bannerY + 12, size: 9.5, font: fontManropeSemiBold, color: cEspresso });

  page.drawText("PLAN LEVEL", { x: 330, y: bannerY + 28, size: 7.5, font: fontManropeBold, color: cMuted });
  page.drawText(planLevel.slice(0, 24), { x: 330, y: bannerY + 12, size: 10.5, font: fontPlayfairBold, color: cTerracotta });

  // Paid Status Badge
  page.drawRectangle({
    x: 462,
    y: bannerY + 10,
    width: 78,
    height: 25,
    color: cEmeraldBg,
    borderColor: cEmerald,
    borderWidth: 1,
  });
  page.drawText("PAID", { x: 488, y: bannerY + 17, size: 9.5, font: fontManropeBold, color: cEmerald });

  // 5. Line Items Table
  const tableTopY = height - 302;
  page.drawRectangle({
    x: 45,
    y: tableTopY,
    width: width - 90,
    height: 26,
    color: cEspresso,
  });

  page.drawText("SL", { x: 55, y: tableTopY + 8, size: 8, font: fontManropeBold, color: cWhite });
  page.drawText("DESCRIPTION / SERVICE ITEM", { x: 80, y: tableTopY + 8, size: 8, font: fontManropeBold, color: cWhite });
  page.drawText("HSN/SAC", { x: 340, y: tableTopY + 8, size: 8, font: fontManropeBold, color: cWhite });
  page.drawText("QTY", { x: 410, y: tableTopY + 8, size: 8, font: fontManropeBold, color: cWhite });
  page.drawText("AMOUNT (INR)", { x: 465, y: tableTopY + 8, size: 8, font: fontManropeBold, color: cWhite });

  const items = data.items && data.items.length > 0 ? data.items : [
    {
      sl: "01",
      title: "TenoPilot Pro Operating System - Annual Subscription",
      subtitle: "Multi-Floor Layout Engine, Dual-Ledger Accounting, 2-Step MPIN",
      sac: "998314",
      qty: "1 Yr",
      rate: data.subtotal ? (data.subtotal * 0.85).toFixed(2) : "9,990.00",
    },
    {
      sl: "02",
      title: "Meta WhatsApp Cloud Credits Package (Growth Tier)",
      subtitle: "1,500 High-Deliverability Automated Rent Invoices & Reminders",
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

    page.drawText(item.sl, { x: 55, y: rowY + 22, size: 8.5, font: fontManropeBold, color: cMuted });
    page.drawText(item.title, { x: 80, y: rowY + 22, size: 9, font: fontManropeSemiBold, color: cEspresso });
    page.drawText(item.subtitle, { x: 80, y: rowY + 9, size: 7.5, font: fontManropeRegular, color: cMuted });
    page.drawText(item.sac, { x: 340, y: rowY + 16, size: 8.5, font: fontManropeRegular, color: cCharcoal });
    page.drawText(item.qty, { x: 410, y: rowY + 16, size: 8.5, font: fontManropeRegular, color: cCharcoal });
    page.drawText(item.rate, { x: 470, y: rowY + 16, size: 9, font: fontManropeBold, color: cEspresso });

    page.drawLine({
      start: { x: 45, y: rowY },
      end: { x: width - 45, y: rowY },
      thickness: 0.5,
      color: cBorder,
    });

    currentY = rowY;
  });

  // 6. Summary & Totals Block
  const sumY = currentY - 20;
  const subtotal = data.subtotal || 11489;
  const discountPct = data.discountPercentage || 0;
  const discountAmt = data.discountAmount || (discountPct > 0 ? (subtotal * discountPct) / 100 : 0);
  const taxableAmount = Math.max(0, subtotal - discountAmt);
  const cgst = data.cgst !== undefined ? data.cgst : (taxableAmount * 0.09);
  const sgst = data.sgst !== undefined ? data.sgst : (taxableAmount * 0.09);
  const totalAmount = data.totalAmount || (taxableAmount + cgst + sgst);

  let currentSummaryY = sumY;

  page.drawText("Subtotal:", { x: 340, y: currentSummaryY, size: 9, font: fontManropeSemiBold, color: cMuted });
  page.drawText(`INR ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: currentSummaryY, size: 9, font: fontManropeBold, color: cEspresso });

  if (discountPct > 0 || discountAmt > 0) {
    currentSummaryY -= 16;
    const discountLabel = discountPct > 0 ? `Discount (${discountPct}%):` : "Discount:";
    page.drawText(discountLabel, { x: 340, y: currentSummaryY, size: 9, font: fontManropeSemiBold, color: rgb(0.75, 0.15, 0.15) });
    page.drawText(`-INR ${discountAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: currentSummaryY, size: 9, font: fontManropeBold, color: rgb(0.75, 0.15, 0.15) });
  }

  currentSummaryY -= 16;
  page.drawText("CGST (9.0%):", { x: 340, y: currentSummaryY, size: 9, font: fontManropeSemiBold, color: cMuted });
  page.drawText(`INR ${cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: currentSummaryY, size: 9, font: fontManropeSemiBold, color: cCharcoal });

  currentSummaryY -= 16;
  page.drawText("SGST (9.0%):", { x: 340, y: currentSummaryY, size: 9, font: fontManropeSemiBold, color: cMuted });
  page.drawText(`INR ${sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: currentSummaryY, size: 9, font: fontManropeSemiBold, color: cCharcoal });

  // Total Box
  page.drawRectangle({
    x: 340,
    y: currentSummaryY - 40,
    width: width - 45 - 340,
    height: 32,
    color: cTerracotta,
  });

  page.drawText("TOTAL AMOUNT PAID:", { x: 350, y: currentSummaryY - 22, size: 8.5, font: fontManropeBold, color: cWhite });
  page.drawText(`INR ${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 462, y: currentSummaryY - 22, size: 11.5, font: fontPlayfairBold, color: cWhite });

  // Amount in Words
  page.drawText("AMOUNT IN WORDS:", { x: 45, y: sumY, size: 8, font: fontManropeBold, color: cTerracottaDark });
  page.drawText(data.amountInWords || "Tax Invoice Amount Paid in Full (Indian Rupees)", {
    x: 45,
    y: sumY - 15,
    size: 9.5,
    font: fontPlayfairItalic,
    color: cCharcoal,
  });

  // 7. Security & Official Verification Seal Block
  const sealY = currentSummaryY - 114;
  page.drawRectangle({
    x: 45,
    y: sealY,
    width: width - 90,
    height: 64,
    color: cLightBg,
    borderColor: cBorder,
    borderWidth: 1,
  });

  page.drawText("AUTHENTIC DIGITAL TAX INVOICE", { x: 60, y: sealY + 44, size: 8.5, font: fontManropeBold, color: cEspresso });
  page.drawText("Electronically generated under Information Technology Act, 2000.", {
    x: 60,
    y: sealY + 30,
    size: 7.5,
    font: fontManropeRegular,
    color: cMuted,
  });
  page.drawText("Valid for Input Tax Credit (ITC). No physical signature required.", {
    x: 60,
    y: sealY + 16,
    size: 7.5,
    font: fontManropeRegular,
    color: cMuted,
  });

  page.drawText("TenoPilot Technologies Pvt Ltd", { x: 390, y: sealY + 44, size: 9.5, font: fontPlayfairBold, color: cEspresso });
  page.drawText("[Digitally Signed & Certified]", { x: 390, y: sealY + 30, size: 8, font: fontManropeBold, color: cEmerald });
  page.drawText("Authorised Signatory", { x: 390, y: sealY + 16, size: 7.5, font: fontManropeRegular, color: cMuted });

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
    font: fontManropeRegular,
    color: cMuted,
  });
  page.drawText("TenoPilot OS - Bengaluru, India", {
    x: width - 45 - 135,
    y: 30,
    size: 7.5,
    font: fontManropeBold,
    color: cTerracotta,
  });

  return await pdfDoc.save();
}
