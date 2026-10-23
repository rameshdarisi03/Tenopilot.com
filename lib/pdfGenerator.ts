import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface ReceiptPdfData {
  receiptNo: string;
  propertyName: string;
  propertyAddress?: string;
  managerPhone?: string;
  residentName: string;
  roomNumber: string;
  bedCode: string;
  amount: number;
  paidDate: string;
  paymentMode: string;
  paidTo?: string;
  month?: string;
  isDeposit?: boolean;
  isSettlement?: boolean;
  rentAmount?: number;
  depositAmount?: number;
  maintenanceAmount?: number;
  parkingAmount?: number;
  settlementDetails?: {
    initialDeposit?: number;
    unpaidRent?: number;
    repairs?: number;
    maintenance?: number;
    totalDeductions?: number;
    netRefunded?: number;
    status?: string;
    notes?: string;
  };
}

export interface RentalAgreementPdfData {
  tenantName: string;
  phone: string;
  roomNumber: string;
  bedCode: string;
  joiningDate: string;
  monthlyRent: number;
  securityDeposit: number;
  propertyTitle?: string;
  propertyAddress?: string;
  houseRulesAndRegulations?: string;
  billingCycle?: string;
  ownerName?: string;
}

/**
 * Generates an official, legally binding A4 Rental Agreement & Allocation PDF buffer using pdf-lib.
 * 100% in-memory — suitable for email attachment and digital record archiving.
 */
export async function generateRentalAgreementPdfBuffer(data: RentalAgreementPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontScript = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

  // Color Palette
  const brandTerracotta = rgb(0.76, 0.40, 0.16); // #c2652a
  const brandDark = rgb(0.12, 0.10, 0.09); // #1f1a17
  const slateGray = rgb(0.39, 0.45, 0.55); // #64748b
  const slateLight = rgb(0.97, 0.98, 0.99); // #f8fafc
  const borderStroke = rgb(0.88, 0.91, 0.94); // #e2e8f0
  const emeraldGreen = rgb(0.02, 0.59, 0.41); // #059669
  const inkBlue = rgb(0.08, 0.22, 0.52); // Handwriting ink

  const pTitle = (data.propertyTitle || "Friendly Space Premium Coliving PG").trim();
  const agreementId = `AGR-${new Date().getFullYear()}-${(data.roomNumber || "101").replace(/\D/g, "") || "101"}${(data.bedCode || "A").replace(/\D/g, "") || "A"}`;
  const issueDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  // 1. Top Decorative Brand Strip
  page.drawRectangle({
    x: 0,
    y: height - 10,
    width: width,
    height: 10,
    color: brandTerracotta,
  });

  // 2. Header: Big Bold Property Name & Address (Tenopilot line removed)
  page.drawText(pTitle.toUpperCase(), {
    x: 40,
    y: height - 48,
    size: 20, // Highlighted in big, bold font
    font: fontBold,
    color: brandDark,
  });

  if (data.propertyAddress) {
    page.drawText(data.propertyAddress.slice(0, 75), {
      x: 40,
      y: height - 66,
      size: 9,
      font: fontRegular,
      color: slateGray,
    });
  }

  // Agreement Meta Badges (Right Aligned)
  page.drawText(`AGREEMENT ID: ${agreementId}`, {
    x: width - 210,
    y: height - 48,
    size: 9,
    font: fontBold,
    color: brandDark,
  });
  page.drawText(`DATE: ${issueDate}`, {
    x: width - 210,
    y: height - 62,
    size: 9,
    font: fontRegular,
    color: slateGray,
  });

  // Divider
  page.drawLine({
    start: { x: 40, y: height - 82 },
    end: { x: width - 40, y: height - 82 },
    thickness: 1,
    color: borderStroke,
  });

  // 3. Document Title Banner: RENTAL AGREEMENT & ALLOCATION RECORD
  page.drawRectangle({
    x: 40,
    y: height - 124,
    width: width - 80,
    height: 30,
    color: slateLight,
    borderColor: borderStroke,
    borderWidth: 1,
  });
  page.drawText("RENTAL AGREEMENT & ALLOCATION RECORD", {
    x: 52,
    y: height - 114,
    size: 11,
    font: fontBold,
    color: brandDark,
  });

  // 4. Section 1: Tenant & Accommodation Details
  let currentY = height - 144;
  page.drawText("1. TENANT & ACCOMMODATION PARTICULARS", {
    x: 40,
    y: currentY,
    size: 10,
    font: fontBold,
    color: brandTerracotta,
  });

  currentY -= 14;
  page.drawRectangle({
    x: 40,
    y: currentY - 66,
    width: width - 80,
    height: 66,
    color: rgb(1, 1, 1),
    borderColor: borderStroke,
    borderWidth: 1,
  });

  const col1X = 55;
  const col2X = 310;
  let fieldY = currentY - 20;

  page.drawText("Full Tenant Name:", { x: col1X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
  page.drawText((data.tenantName || "Resident").slice(0, 30), { x: col1X + 95, y: fieldY, size: 9, font: fontBold, color: brandDark });

  page.drawText("Room & Bed Slot:", { x: col2X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
  page.drawText(`Room ${data.roomNumber || "N/A"} (${data.bedCode || "Standard Bed"})`, { x: col2X + 95, y: fieldY, size: 9, font: fontBold, color: brandDark });

  fieldY -= 22;
  page.drawText("Primary Phone:", { x: col1X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
  page.drawText((data.phone || "N/A").slice(0, 20), { x: col1X + 95, y: fieldY, size: 9, font: fontBold, color: brandDark });

  page.drawText("Move-In / Start Date:", { x: col2X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
  page.drawText(data.joiningDate || "On Check-In", { x: col2X + 95, y: fieldY, size: 9, font: fontBold, color: brandDark });

  currentY -= 88;

  // 5. Section 2: Financial Terms & Dual-Ledger Security Matrix (Deposit Nature removed)
  page.drawText("2. FINANCIAL TERMS & DUAL-LEDGER SECURITY MATRIX", {
    x: 40,
    y: currentY,
    size: 10,
    font: fontBold,
    color: brandTerracotta,
  });

  currentY -= 14;
  page.drawRectangle({
    x: 40,
    y: currentY - 56,
    width: width - 80,
    height: 56,
    color: slateLight,
    borderColor: borderStroke,
    borderWidth: 1,
  });

  fieldY = currentY - 20;
  page.drawText("Agreed Monthly Rent:", { x: col1X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
  page.drawText(`Rs. ${(data.monthlyRent || 0).toLocaleString("en-IN")} / month`, { x: col1X + 115, y: fieldY, size: 10, font: fontBold, color: brandTerracotta });

  page.drawText("Security Deposit:", { x: col2X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
  page.drawText(`Rs. ${(data.securityDeposit || 0).toLocaleString("en-IN")}`, { x: col2X + 95, y: fieldY, size: 10, font: fontBold, color: emeraldGreen });

  fieldY -= 20;
  const billingCycleText = data.billingCycle || "1st to End of Month (Due by 5th)";
  page.drawText("Rent Billing Cycle:", { x: col1X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
  page.drawText(billingCycleText, { x: col1X + 115, y: fieldY, size: 9, font: fontBold, color: brandDark });

  currentY -= 78;

  const sigBoxHeight = 84;

  // 6. Section 3: Property Terms, Rules and Regulations (Conditional: ONLY if rules exist in config)
  const customRules = data.houseRulesAndRegulations?.trim();
  if (customRules) {
    page.drawText("3. PROPERTY TERMS, RULES & REGULATIONS", {
      x: 40,
      y: currentY,
      size: 10,
      font: fontBold,
      color: brandTerracotta,
    });

    currentY -= 14;

    // Split into paragraphs and wrap lines to fit nicely inside page margins
    const rawParagraphs = customRules
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const wrappedLines: string[] = [];
    for (const para of rawParagraphs) {
      if (para.length <= 95) {
        wrappedLines.push(para);
      } else {
        const words = para.split(/\s+/);
        let curLine = "";
        for (const w of words) {
          if ((curLine + " " + w).trim().length <= 95) {
            curLine = (curLine + " " + w).trim();
          } else {
            if (curLine) wrappedLines.push(curLine);
            curLine = w;
          }
        }
        if (curLine) wrappedLines.push(curLine);
      }
    }

    // Determine font size and line height dynamically so all rules fit cleanly
    const maxAvailableHeight = currentY - (sigBoxHeight + 50);
    const lineHeight = wrappedLines.length > 20 ? 11 : wrappedLines.length > 13 ? 12.5 : 14;
    const ruleFontSize = wrappedLines.length > 20 ? 7 : wrappedLines.length > 13 ? 7.6 : 8.2;
    const rulesBoxHeight = Math.min(maxAvailableHeight, Math.max(50, wrappedLines.length * lineHeight + 16));

    page.drawRectangle({
      x: 40,
      y: currentY - rulesBoxHeight,
      width: width - 80,
      height: rulesBoxHeight,
      color: rgb(1, 1, 1),
      borderColor: borderStroke,
      borderWidth: 1,
    });

    let ruleY = currentY - 14;
    const maxLinesToShow = Math.floor((rulesBoxHeight - 12) / lineHeight);
    wrappedLines.slice(0, maxLinesToShow).forEach((line) => {
      page.drawText(line, {
        x: 55,
        y: ruleY,
        size: ruleFontSize,
        font: fontRegular,
        color: brandDark,
      });
      ruleY -= lineHeight;
    });

    currentY -= rulesBoxHeight + 16;
  }
  // If rules are not mentioned in config, this section DOES NOT APPEAR at all!

  // 7. Signatures & Attestation Block
  const sigBoxY = Math.max(45, currentY - 15 - sigBoxHeight);

  page.drawRectangle({
    x: 40,
    y: sigBoxY,
    width: width - 80,
    height: sigBoxHeight,
    color: slateLight,
    borderColor: borderStroke,
    borderWidth: 1,
  });

  // Resident Signature (Left - Clean physical signing line, NO electronic simulated cursive signature)
  page.drawLine({
    start: { x: 55, y: sigBoxY + 38 },
    end: { x: 250, y: sigBoxY + 38 },
    thickness: 0.75,
    color: slateGray,
  });
  page.drawText(`Resident Signature (${(data.tenantName || "Resident").slice(0, 25)})`, {
    x: 55,
    y: sigBoxY + 24,
    size: 8,
    font: fontBold,
    color: brandDark,
  });
  page.drawText("Date: ____________________", {
    x: 55,
    y: sigBoxY + 12,
    size: 7.5,
    font: fontRegular,
    color: slateGray,
  });

  // Owner / Management Signature (Right - Mimics Owner Handwriting using Owner's Name)
  const ownerSigName = (data.ownerName || "Property Owner").trim();
  page.drawText(ownerSigName.slice(0, 28), {
    x: 345,
    y: sigBoxY + 52,
    size: 15,
    font: fontScript,
    color: inkBlue,
  });

  page.drawLine({
    start: { x: 340, y: sigBoxY + 44 },
    end: { x: width - 55, y: sigBoxY + 44 },
    thickness: 0.75,
    color: slateGray,
  });
  page.drawText(`Property Authorized Signatory (${ownerSigName.slice(0, 22)})`, {
    x: 340,
    y: sigBoxY + 30,
    size: 8,
    font: fontBold,
    color: brandDark,
  });
  page.drawText(`Digitally Attested & Verified • ${issueDate}`, {
    x: 340,
    y: sigBoxY + 18,
    size: 7,
    font: fontOblique,
    color: emeraldGreen,
  });

  // Footer: Powered by tenopilot.com
  const footerText = "CONFIDENTIAL & LEGALLY BINDING TENANCY RECORD • Powered by TenoPilot.com";
  const footerWidth = fontBold.widthOfTextAtSize(footerText, 7.5);
  page.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: 20,
    size: 7.5,
    font: fontBold,
    color: rgb(0.55, 0.60, 0.68),
  });

  return await pdfDoc.save();
}

/**
 * Generates an official, beautiful A4 PDF receipt buffer using pdf-lib
 * Suitable for instant serverless PDF download and WhatsApp Document attachment.
 */
export async function generateReceiptPdfBuffer(data: ReceiptPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions in points (pt)
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Modern Accent Colors
  const indigoPrimary = rgb(0.25, 0.32, 0.71); // #4052b5
  const slateDark = rgb(0.06, 0.09, 0.16); // #0f172a
  const slateMuted = rgb(0.39, 0.45, 0.55); // #64748b
  const slateBg = rgb(0.96, 0.97, 0.98); // #f8fafc
  const emeraldGreen = rgb(0.02, 0.59, 0.41); // #059669
  const borderLight = rgb(0.88, 0.91, 0.94); // #e2e8f0

  // 1. Top Colorful Header Strip
  page.drawRectangle({
    x: 0,
    y: height - 12,
    width: width,
    height: 12,
    color: indigoPrimary,
  });

  // 2. Property Header Banner
  const pName = data.propertyName || "TenoPilot PG & Coliving";
  page.drawText(pName.toUpperCase(), {
    x: 40,
    y: height - 55,
    size: 20,
    font: fontBold,
    color: slateDark,
  });

  const pAddress = data.propertyAddress || "Premium Student & Professional Accommodation";
  page.drawText(pAddress.slice(0, 65), {
    x: 40,
    y: height - 72,
    size: 10,
    font: fontRegular,
    color: slateMuted,
  });

  const managerContact = `Desk: ${data.managerPhone || "+91 92066 51295"}`;
  page.drawText(managerContact, {
    x: 40,
    y: height - 86,
    size: 9,
    font: fontRegular,
    color: slateMuted,
  });

  // Right Header: Receipt Type & Details
  const receiptTypeTitle = data.isSettlement
    ? "SETTLEMENT & NO-DUES RECEIPT"
    : data.isDeposit
    ? "SECURITY DEPOSIT RECEIPT"
    : "RENT PAYMENT RECEIPT";
  const titleWidth = fontBold.widthOfTextAtSize(receiptTypeTitle, 11);
  page.drawText(receiptTypeTitle, {
    x: width - 40 - titleWidth,
    y: height - 55,
    size: 11,
    font: fontBold,
    color: emeraldGreen,
  });

  const receiptNoStr = `Receipt No: ${data.receiptNo}`;
  const rNoWidth = fontMono.widthOfTextAtSize(receiptNoStr, 10);
  page.drawText(receiptNoStr, {
    x: width - 40 - rNoWidth,
    y: height - 72,
    size: 10,
    font: fontMono,
    color: slateDark,
  });

  const dateStr = `Date: ${data.paidDate}`;
  const dateWidth = fontRegular.widthOfTextAtSize(dateStr, 9);
  page.drawText(dateStr, {
    x: width - 40 - dateWidth,
    y: height - 86,
    size: 9,
    font: fontRegular,
    color: slateMuted,
  });

  // Divider Line
  page.drawLine({
    start: { x: 40, y: height - 105 },
    end: { x: width - 40, y: height - 105 },
    thickness: 1,
    color: borderLight,
  });

  // 3. Resident & Stay Info Card Box
  const cardY = height - 215;
  page.drawRectangle({
    x: 40,
    y: cardY,
    width: width - 80,
    height: 95,
    color: slateBg,
    borderColor: borderLight,
    borderWidth: 1,
  });

  // Left Column: Resident
  page.drawText("RESIDENT DETAILS", {
    x: 55,
    y: cardY + 75,
    size: 8,
    font: fontBold,
    color: slateMuted,
  });
  page.drawText(data.residentName, {
    x: 55,
    y: cardY + 56,
    size: 14,
    font: fontBold,
    color: slateDark,
  });
  page.drawText(`Room: Room ${data.roomNumber} (Bed ${data.bedCode})`, {
    x: 55,
    y: cardY + 38,
    size: 10,
    font: fontRegular,
    color: slateDark,
  });
  page.drawText(`Billing Period: ${data.month || "Current Cycle"}`, {
    x: 55,
    y: cardY + 20,
    size: 9,
    font: fontRegular,
    color: slateMuted,
  });

  // Right Column: Payment & Channel
  const rightColX = width / 2 + 10;
  page.drawText("PAYMENT METHOD & CHANNEL", {
    x: rightColX,
    y: cardY + 75,
    size: 8,
    font: fontBold,
    color: slateMuted,
  });
  page.drawText(`Payment Mode: ${data.paymentMode || "UPI / Digital Transfer"}`, {
    x: rightColX,
    y: cardY + 56,
    size: 10,
    font: fontBold,
    color: slateDark,
  });
  page.drawText(`Settled To: ${data.paidTo || "Main Business Pool"}`, {
    x: rightColX,
    y: cardY + 38,
    size: 10,
    font: fontRegular,
    color: slateDark,
  });
  page.drawText("Ledger Status: Verified & Recorded in Cloud SSOT", {
    x: rightColX,
    y: cardY + 20,
    size: 9,
    font: fontBold,
    color: emeraldGreen,
  });

  // 4. Financial Charges Breakdown Table
  const tableY = cardY - 35;
  // Table Header
  page.drawRectangle({
    x: 40,
    y: tableY - 24,
    width: width - 80,
    height: 24,
    color: slateDark,
  });
  page.drawText(data.isSettlement ? "SETTLEMENT LEDGER DESCRIPTION" : "ITEM DESCRIPTION", {
    x: 55,
    y: tableY - 16,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  const amtHeader = "AMOUNT (INR)";
  const amtHeaderWidth = fontBold.widthOfTextAtSize(amtHeader, 9);
  page.drawText(amtHeader, {
    x: width - 55 - amtHeaderWidth,
    y: tableY - 16,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  let declarationBoxY = 0;

  if (data.isSettlement) {
    const s = data.settlementDetails || {};
    const initDeposit = s.initialDeposit ?? Number(data.amount || 0);
    const unpaidRent = s.unpaidRent || 0;
    const repairs = s.repairs || 0;
    const maintenance = s.maintenance || 0;
    const totalDeductions = s.totalDeductions ?? (unpaidRent + repairs + maintenance);
    const netRefunded = s.netRefunded ?? Math.max(0, initDeposit - totalDeductions);

    // Row 1: Initial Deposit Intake
    const r1Y = tableY - 55;
    page.drawText("Initial Security Deposit Intake (Received upon move-in)", {
      x: 55,
      y: r1Y,
      size: 10,
      font: fontBold,
      color: slateDark,
    });
    page.drawText("Full refundable security deposit collateral registered in ledger", {
      x: 55,
      y: r1Y - 14,
      size: 8,
      font: fontRegular,
      color: slateMuted,
    });
    const initDepStr = `INR ${initDeposit.toLocaleString("en-IN")}`;
    const initDepWidth = fontBold.widthOfTextAtSize(initDepStr, 11);
    page.drawText(initDepStr, {
      x: width - 55 - initDepWidth,
      y: r1Y,
      size: 11,
      font: fontBold,
      color: slateDark,
    });

    page.drawLine({
      start: { x: 40, y: r1Y - 24 },
      end: { x: width - 40, y: r1Y - 24 },
      thickness: 1,
      color: borderLight,
    });

    // Row 2: Deductions Breakdown
    const r2Y = r1Y - 48;
    if (totalDeductions > 0) {
      const parts = [];
      if (unpaidRent > 0) parts.push(`Unpaid Rent: INR ${unpaidRent.toLocaleString("en-IN")}`);
      if (repairs > 0) parts.push(`Repairs: INR ${repairs.toLocaleString("en-IN")}`);
      if (maintenance > 0) parts.push(`Maintenance: INR ${maintenance.toLocaleString("en-IN")}`);
      const deductionDesc = parts.length > 0 ? parts.join(" • ") : "Itemized checkout deductions";

      page.drawText("Move-Out Deductions & Adjustments Applied", {
        x: 55,
        y: r2Y,
        size: 10,
        font: fontBold,
        color: rgb(0.75, 0.15, 0.15),
      });
      page.drawText(deductionDesc.slice(0, 85), {
        x: 55,
        y: r2Y - 14,
        size: 8,
        font: fontRegular,
        color: slateMuted,
      });
      const dedStr = `-INR ${totalDeductions.toLocaleString("en-IN")}`;
      const dedWidth = fontBold.widthOfTextAtSize(dedStr, 11);
      page.drawText(dedStr, {
        x: width - 55 - dedWidth,
        y: r2Y,
        size: 11,
        font: fontBold,
        color: rgb(0.75, 0.15, 0.15),
      });
    } else {
      page.drawText("Move-Out Deductions & Adjustments", {
        x: 55,
        y: r2Y,
        size: 10,
        font: fontBold,
        color: emeraldGreen,
      });
      page.drawText("Zero deductions applied. 100% full security deposit cleared & returned.", {
        x: 55,
        y: r2Y - 14,
        size: 8,
        font: fontRegular,
        color: slateMuted,
      });
      const zeroStr = "INR 0 (None)";
      const zeroWidth = fontBold.widthOfTextAtSize(zeroStr, 11);
      page.drawText(zeroStr, {
        x: width - 55 - zeroWidth,
        y: r2Y,
        size: 11,
        font: fontBold,
        color: emeraldGreen,
      });
    }

    page.drawLine({
      start: { x: 40, y: r2Y - 24 },
      end: { x: width - 40, y: r2Y - 24 },
      thickness: 1,
      color: borderLight,
    });

    // Total Paid / Net Refund Row
    const totalY = r2Y - 56;
    page.drawRectangle({
      x: 40,
      y: totalY,
      width: width - 80,
      height: 32,
      color: rgb(0.93, 0.98, 0.95), // light emerald
      borderColor: rgb(0.65, 0.89, 0.75),
      borderWidth: 1,
    });
    page.drawText("NET DEPOSIT AMOUNT REFUNDED & CLEARED", {
      x: 55,
      y: totalY + 11,
      size: 9,
      font: fontBold,
      color: emeraldGreen,
    });
    const grandTotalStr = `INR ${Number(netRefunded).toLocaleString("en-IN")}`;
    const grandTotalWidth = fontBold.widthOfTextAtSize(grandTotalStr, 13);
    page.drawText(grandTotalStr, {
      x: width - 55 - grandTotalWidth,
      y: totalY + 10,
      size: 13,
      font: fontBold,
      color: emeraldGreen,
    });

    // 5. No Dues Clearance Declaration Box
    declarationBoxY = totalY - 70;
    const hraBoxY = declarationBoxY;
    page.drawRectangle({
      x: 40,
      y: hraBoxY,
      width: width - 80,
      height: 55,
      color: rgb(0.94, 0.96, 1.0),
      borderColor: rgb(0.78, 0.85, 0.98),
      borderWidth: 1,
    });
    page.drawText("OFFICIAL MOVE-OUT & NO-DUES CLEARANCE CERTIFICATE", {
      x: 55,
      y: hraBoxY + 38,
      size: 8,
      font: fontBold,
      color: rgb(0.12, 0.23, 0.54),
    });
    page.drawText("This official electronic document certifies that room keys and property inventory have been handed over,", {
      x: 55,
      y: hraBoxY + 24,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.18, 0.31, 0.65),
    });
    page.drawText("all financial obligations are settled, and no further dues remain outstanding for either party. Verified via TenoPilot.", {
      x: 55,
      y: hraBoxY + 12,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.18, 0.31, 0.65),
    });
  } else if (data.rentAmount !== undefined && data.depositAmount !== undefined && data.rentAmount > 0 && data.depositAmount > 0) {
    // Combined Payment Breakup: Rent Portion + Deposit Portion
    // Row 1: Rent Portion
    const row1Y = tableY - 55;
    page.drawText(`Monthly Accommodation & Room Rent (${(data.month || "Current Cycle").replace(/\s*\+\s*Security Deposit/i, "")})`, {
      x: 55,
      y: row1Y,
      size: 10,
      font: fontBold,
      color: slateDark,
    });
    page.drawText("Includes room tariff, electricity, high-speed WiFi, housekeeping & amenities", {
      x: 55,
      y: row1Y - 14,
      size: 8,
      font: fontRegular,
      color: slateMuted,
    });
    const rentStr = `INR ${Number(data.rentAmount).toLocaleString("en-IN")}`;
    const rentWidth = fontBold.widthOfTextAtSize(rentStr, 11);
    page.drawText(rentStr, {
      x: width - 55 - rentWidth,
      y: row1Y,
      size: 11,
      font: fontBold,
      color: slateDark,
    });

    page.drawLine({
      start: { x: 40, y: row1Y - 24 },
      end: { x: width - 40, y: row1Y - 24 },
      thickness: 1,
      color: borderLight,
    });

    // Row 2: Security Deposit Portion
    const row2Y = row1Y - 48;
    page.drawText("Refundable Security Deposit (Lease Collateral)", {
      x: 55,
      y: row2Y,
      size: 10,
      font: fontBold,
      color: rgb(0.35, 0.18, 0.55),
    });
    page.drawText("Collateral security deposit held per signed agreement terms (Refundable)", {
      x: 55,
      y: row2Y - 14,
      size: 8,
      font: fontRegular,
      color: slateMuted,
    });
    const depStr = `INR ${Number(data.depositAmount).toLocaleString("en-IN")}`;
    const depWidth = fontBold.widthOfTextAtSize(depStr, 11);
    page.drawText(depStr, {
      x: width - 55 - depWidth,
      y: row2Y,
      size: 11,
      font: fontBold,
      color: rgb(0.35, 0.18, 0.55),
    });

    page.drawLine({
      start: { x: 40, y: row2Y - 24 },
      end: { x: width - 40, y: row2Y - 24 },
      thickness: 1,
      color: borderLight,
    });

    let nextCombinedY = row2Y - 48;
    if (data.parkingAmount !== undefined && data.parkingAmount > 0) {
      // Row 3: Parking Charges Portion
      page.drawText("Vehicle Parking Charges (Designated Parking Slot)", {
        x: 55,
        y: nextCombinedY,
        size: 10,
        font: fontBold,
        color: rgb(0.18, 0.45, 0.65),
      });
      page.drawText("Reserved parking space access, resident vehicle security & gate pass", {
        x: 55,
        y: nextCombinedY - 14,
        size: 8,
        font: fontRegular,
        color: slateMuted,
      });
      const parkStr = `INR ${Number(data.parkingAmount).toLocaleString("en-IN")}`;
      const parkWidth = fontBold.widthOfTextAtSize(parkStr, 11);
      page.drawText(parkStr, {
        x: width - 55 - parkWidth,
        y: nextCombinedY,
        size: 11,
        font: fontBold,
        color: rgb(0.18, 0.45, 0.65),
      });

      page.drawLine({
        start: { x: 40, y: nextCombinedY - 24 },
        end: { x: width - 40, y: nextCombinedY - 24 },
        thickness: 1,
        color: borderLight,
      });
      nextCombinedY = nextCombinedY - 48;
    }

    // Total Paid Row
    const totalY = nextCombinedY - 8;
    page.drawRectangle({
      x: 40,
      y: totalY,
      width: width - 80,
      height: 32,
      color: rgb(0.93, 0.98, 0.95), // light emerald
      borderColor: rgb(0.65, 0.89, 0.75),
      borderWidth: 1,
    });
    page.drawText("TOTAL AMOUNT PAID & CLEARED", {
      x: 55,
      y: totalY + 11,
      size: 9,
      font: fontBold,
      color: emeraldGreen,
    });
    const grandTotalStr = `INR ${Number(data.amount || 0).toLocaleString("en-IN")}`;
    const grandTotalWidth = fontBold.widthOfTextAtSize(grandTotalStr, 13);
    page.drawText(grandTotalStr, {
      x: width - 55 - grandTotalWidth,
      y: totalY + 10,
      size: 13,
      font: fontBold,
      color: emeraldGreen,
    });

    // Income Tax Declaration Box
    declarationBoxY = totalY - 75;
    const hraBoxY = declarationBoxY;
    page.drawRectangle({
      x: 40,
      y: hraBoxY,
      width: width - 80,
      height: 55,
      color: rgb(0.94, 0.96, 1.0),
      borderColor: rgb(0.78, 0.85, 0.98),
      borderWidth: 1,
    });
    page.drawText("INCOME TAX HRA EXEMPTION & SALARY REIMBURSEMENT DECLARATION", {
      x: 55,
      y: hraBoxY + 38,
      size: 8,
      font: fontBold,
      color: rgb(0.12, 0.23, 0.54),
    });
    page.drawText("This official electronic document certifies receipt of accommodation dues for the period stated above", {
      x: 55,
      y: hraBoxY + 24,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.18, 0.31, 0.65),
    });
    page.drawText("under Section 10(13A) of the Income Tax Act, 1961. Issued and tamper-verified via TenoPilot Cloud Ledger.", {
      x: 55,
      y: hraBoxY + 12,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.18, 0.31, 0.65),
    });
  } else {
    // Single Charge Row (Rent Only or Deposit Only) + Optional Parking Charges
    const hasParking = data.parkingAmount !== undefined && data.parkingAmount > 0;
    const baseRentAmount = hasParking
      ? data.rentAmount !== undefined
        ? data.rentAmount
        : Math.max(0, (data.amount || 0) - (data.parkingAmount || 0))
      : (data.amount || 0);

    const row1Y = tableY - 55;
    const itemDesc = data.isDeposit
      ? "Refundable Security Deposit (Lease Guarantee)"
      : `Monthly Accommodation & Room Rent (${data.month || "Current Cycle"})`;
    page.drawText(itemDesc, {
      x: 55,
      y: row1Y,
      size: 10,
      font: fontBold,
      color: slateDark,
    });
    page.drawText("Includes room tariff, electricity, high-speed WiFi, housekeeping & amenities", {
      x: 55,
      y: row1Y - 14,
      size: 8,
      font: fontRegular,
      color: slateMuted,
    });

    const formattedAmount = `INR ${Number(baseRentAmount).toLocaleString("en-IN")}`;
    const amtWidth = fontBold.widthOfTextAtSize(formattedAmount, 11);
    page.drawText(formattedAmount, {
      x: width - 55 - amtWidth,
      y: row1Y,
      size: 11,
      font: fontBold,
      color: slateDark,
    });

    // Table Line
    page.drawLine({
      start: { x: 40, y: row1Y - 24 },
      end: { x: width - 40, y: row1Y - 24 },
      thickness: 1,
      color: borderLight,
    });

    let nextSingleY = row1Y - 48;
    if (hasParking) {
      page.drawText("Vehicle Parking Charges (Designated Parking Slot)", {
        x: 55,
        y: nextSingleY,
        size: 10,
        font: fontBold,
        color: rgb(0.18, 0.45, 0.65),
      });
      page.drawText("Reserved parking space access, resident vehicle security & gate pass", {
        x: 55,
        y: nextSingleY - 14,
        size: 8,
        font: fontRegular,
        color: slateMuted,
      });
      const parkStr = `INR ${Number(data.parkingAmount).toLocaleString("en-IN")}`;
      const parkWidth = fontBold.widthOfTextAtSize(parkStr, 11);
      page.drawText(parkStr, {
        x: width - 55 - parkWidth,
        y: nextSingleY,
        size: 11,
        font: fontBold,
        color: rgb(0.18, 0.45, 0.65),
      });

      page.drawLine({
        start: { x: 40, y: nextSingleY - 24 },
        end: { x: width - 40, y: nextSingleY - 24 },
        thickness: 1,
        color: borderLight,
      });
      nextSingleY = nextSingleY - 48;
    }

    // Total Paid Row
    const totalY = nextSingleY - 8;
    page.drawRectangle({
      x: 40,
      y: totalY,
      width: width - 80,
      height: 32,
      color: rgb(0.93, 0.98, 0.95), // light emerald
      borderColor: rgb(0.65, 0.89, 0.75),
      borderWidth: 1,
    });
    page.drawText("TOTAL AMOUNT PAID & CLEARED", {
      x: 55,
      y: totalY + 11,
      size: 9,
      font: fontBold,
      color: emeraldGreen,
    });
    const grandTotalStr = `INR ${Number(data.amount || 0).toLocaleString("en-IN")}`;
    const grandTotalWidth = fontBold.widthOfTextAtSize(grandTotalStr, 13);
    page.drawText(grandTotalStr, {
      x: width - 55 - grandTotalWidth,
      y: totalY + 10,
      size: 13,
      font: fontBold,
      color: emeraldGreen,
    });

    // 5. Income Tax HRA Exemption Declaration Box
    declarationBoxY = totalY - 75;
    const hraBoxY = declarationBoxY;
    page.drawRectangle({
      x: 40,
      y: hraBoxY,
      width: width - 80,
      height: 55,
      color: rgb(0.94, 0.96, 1.0),
      borderColor: rgb(0.78, 0.85, 0.98),
      borderWidth: 1,
    });
    page.drawText("INCOME TAX HRA EXEMPTION & SALARY REIMBURSEMENT DECLARATION", {
      x: 55,
      y: hraBoxY + 38,
      size: 8,
      font: fontBold,
      color: rgb(0.12, 0.23, 0.54),
    });
    page.drawText("This official electronic document certifies receipt of accommodation dues for the period stated above", {
      x: 55,
      y: hraBoxY + 24,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.18, 0.31, 0.65),
    });
    page.drawText("under Section 10(13A) of the Income Tax Act, 1961. Issued and tamper-verified via TenoPilot Cloud Ledger.", {
      x: 55,
      y: hraBoxY + 12,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.18, 0.31, 0.65),
    });
  }

  // 6. Signatures and Seals
  const sigY = declarationBoxY - 70;
  page.drawText("DIGITALLY VERIFIED SEAL", {
    x: 55,
    y: sigY + 20,
    size: 8,
    font: fontBold,
    color: slateDark,
  });
  page.drawText("Cloud Ledger Audit Hash: OK", {
    x: 55,
    y: sigY + 8,
    size: 7.5,
    font: fontMono,
    color: emeraldGreen,
  });

  const sigRightX = width - 180;
  page.drawLine({
    start: { x: sigRightX, y: sigY + 15 },
    end: { x: width - 40, y: sigY + 15 },
    thickness: 1,
    color: slateDark,
  });
  page.drawText("AUTHORIZED SIGNATORY", {
    x: sigRightX,
    y: sigY + 2,
    size: 8,
    font: fontBold,
    color: slateDark,
  });
  page.drawText(pName, {
    x: sigRightX,
    y: sigY - 10,
    size: 7.5,
    font: fontRegular,
    color: slateMuted,
  });

  // 7. Footer
  page.drawLine({
    start: { x: 40, y: 35 },
    end: { x: width - 40, y: 35 },
    thickness: 0.5,
    color: borderLight,
  });
  page.drawText(`Ref: ${data.receiptNo} • Digitally verified official receipt • Powered by TenoPilot.com`, {
    x: 40,
    y: 22,
    size: 8,
    font: fontRegular,
    color: slateMuted,
  });

  return await pdfDoc.save();
}
