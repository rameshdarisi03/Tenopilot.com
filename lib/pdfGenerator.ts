import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

export interface ReceiptPdfData {
  receiptNo: string;
  propertyName: string;
  propertyAddress?: string;
  managerPhone?: string;
  ownerName?: string;
  signatureUrl?: string;
  joiningDate?: string;
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
  isVoided?: boolean;
  voidReason?: string;
  replacesReceiptNo?: string;
  replacedByReceiptNo?: string;
  rentAmount?: number;
  depositAmount?: number;
  maintenanceAmount?: number;
  parkingAmount?: number;
  settlementDetails?: {
    initialDeposit?: number;
    unpaidDeposit?: number;
    unpaidRent?: number;
    repairs?: number;
    maintenance?: number;
    totalDeductions?: number;
    netRefunded?: number;
    netDeficit?: number;
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

export function resolveBillingCycleMonth(month?: string, dateStr?: string, joiningDateStr?: string): string {
  if (month && !month.toLowerCase().includes("deposit")) {
    return month;
  }
  const candidate = dateStr || joiningDateStr;
  if (candidate) {
    const parsed = new Date(candidate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    }
    const parts = candidate.split(/[\s\-/.]+/);
    if (parts.length >= 3) {
      const m = parts[1];
      const y = parts[2].length === 4 ? parts[2] : `20${parts[2]}`;
      const monthsMap: Record<string, string> = {
        jan: "January", feb: "February", mar: "March", apr: "April",
        may: "May", jun: "June", jul: "July", aug: "August",
        sep: "September", oct: "October", nov: "November", dec: "December"
      };
      const fullMonth = monthsMap[m.toLowerCase().slice(0, 3)];
      if (fullMonth) return `${fullMonth} ${y}`;
    }
  }
  return new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
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
  const width = 595.28;
  const height = 841.89; // Standard A4 dimensions
  const page = pdfDoc.addPage([width, height]);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

  // Classic Navy & Slate Color Palette
  const navyDeep = rgb(0.08, 0.16, 0.32);     // #142952
  const slateDark = rgb(0.12, 0.14, 0.18);    // #1f242e
  const slateMuted = rgb(0.42, 0.46, 0.54);   // #6b758a
  const gridBorder = rgb(0.20, 0.28, 0.42);   // #33476b
  const emeraldBg = rgb(0.93, 0.98, 0.95);    // #eefaf2
  const emeraldDark = rgb(0.04, 0.48, 0.32);  // #0a7a52

  // Authentic Voucher Frame Boundaries
  const frameX = 46;
  const frameY = 50;
  const frameW = width - frameX - 38;
  const frameH = height - frameY - 45;

  // 1. Classic Perforated Voucher Stub Guide on Left Margin
  const stubX = frameX - 15;
  for (let y = frameY + 10; y < frameY + frameH - 10; y += 12) {
    page.drawLine({
      start: { x: stubX, y },
      end: { x: stubX, y: y + 6 },
      thickness: 1,
      color: rgb(0.78, 0.80, 0.84),
    });
  }

  // 2. Authentic Double Outer Border
  page.drawRectangle({
    x: frameX,
    y: frameY,
    width: frameW,
    height: frameH,
    borderColor: navyDeep,
    borderWidth: 1.8,
  });

  page.drawRectangle({
    x: frameX + 4,
    y: frameY + 4,
    width: frameW - 8,
    height: frameH - 8,
    borderColor: navyDeep,
    borderWidth: 0.8,
  });

  // Vertical tracker starting from top of frame
  let curY = frameY + frameH - 32;

  // 3. Header Box 1: PG Name (Centered, auto-fitting font scale)
  const pName = (data.propertyName || "TenoPilot Coliving PG").toUpperCase();
  let pNameSize = 17.5;
  while (pNameSize > 11 && fontBold.widthOfTextAtSize(pName, pNameSize) > (frameW - 40)) {
    pNameSize -= 0.5;
  }
  const pNameW = fontBold.widthOfTextAtSize(pName, pNameSize);
  page.drawText(pName, {
    x: frameX + (frameW - pNameW) / 2,
    y: curY,
    size: pNameSize,
    font: fontBold,
    color: navyDeep,
  });

  curY -= 20;

  // 4. Header Box 2: Property Address (Centered, dynamic multi-line wrapping)
  const rawAddress = data.propertyAddress || "Verified Student & Professional Accommodation";
  const words = rawAddress.split(" ");
  const addrLines: string[] = [];
  let curLine = "";
  for (const w of words) {
    if ((curLine + " " + w).trim().length > 64) {
      addrLines.push(curLine.trim());
      curLine = w;
    } else {
      curLine = curLine ? curLine + " " + w : w;
    }
  }
  if (curLine) addrLines.push(curLine.trim());

  for (const line of addrLines) {
    const lineW = fontRegular.widthOfTextAtSize(line, 9.5);
    page.drawText(line, {
      x: frameX + (frameW - lineW) / 2,
      y: curY,
      size: 9.5,
      font: fontRegular,
      color: slateDark,
    });
    curY -= 14;
  }

  curY -= 2;

  // 5. Header Box 3: Manager Contact Mobile (Centered)
  const mobText = `Mob : ${data.managerPhone || "+91 92066 51295"}`;
  const mobW = fontBold.widthOfTextAtSize(mobText, 10.5);
  page.drawText(mobText, {
    x: frameX + (frameW - mobW) / 2,
    y: curY,
    size: 10.5,
    font: fontBold,
    color: navyDeep,
  });

  curY -= 20;

  // Horizontal dividing line
  page.drawLine({
    start: { x: frameX + 12, y: curY },
    end: { x: frameX + frameW - 12, y: curY },
    thickness: 1,
    color: gridBorder,
  });

  curY -= 22;

  // 6. Meta Line: Receipt No | Room | Date
  const rcptStr = `Receipt No.:  ${data.receiptNo}`;
  page.drawText(rcptStr, {
    x: frameX + 18,
    y: curY,
    size: 10.5,
    font: fontBold,
    color: slateDark,
  });

  const roomDisplay = data.bedCode
    ? `Room:  ${data.roomNumber} (${data.bedCode})`
    : `Room:  ${data.roomNumber}`;
  const roomW = fontBold.widthOfTextAtSize(roomDisplay, 10.5);
  page.drawText(roomDisplay, {
    x: frameX + (frameW - roomW) / 2,
    y: curY,
    size: 10.5,
    font: fontBold,
    color: slateDark,
  });

  const dateStr = `Date:  ${data.paidDate}`;
  const dateW = fontBold.widthOfTextAtSize(dateStr, 10.5);
  page.drawText(dateStr, {
    x: frameX + frameW - 18 - dateW,
    y: curY,
    size: 10.5,
    font: fontBold,
    color: slateDark,
  });

  curY -= 32;

  // Detect whether this receipt is for Security Deposit
  const isDeposit = Boolean(
    data.isDeposit ||
    data.receiptNo?.startsWith("DEP") ||
    data.month?.toLowerCase().includes("deposit") ||
    (data.depositAmount !== undefined && data.depositAmount > 0 && (!data.rentAmount || data.rentAmount === 0))
  );

  // 7. Pill Banner: [ GUEST DETAILS / RESIDENT DETAILS / SETTLEMENT DETAILS ]
  const pillTitle = data.isSettlement
    ? "SETTLEMENT & NO-DUES DETAILS"
    : isDeposit
    ? "SECURITY DEPOSIT DETAILS"
    : "GUEST DETAILS";

  const pillW = Math.max(150, fontBold.widthOfTextAtSize(pillTitle, 10) + 36);
  const pillH = 22;
  const pillX = frameX + (frameW - pillW) / 2;
  page.drawRectangle({
    x: pillX,
    y: curY - 4,
    width: pillW,
    height: pillH,
    color: navyDeep,
  });

  const pTitleW = fontBold.widthOfTextAtSize(pillTitle, 10);
  page.drawText(pillTitle, {
    x: pillX + (pillW - pTitleW) / 2,
    y: curY + 3,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  curY -= 36;

  // 8. Resident / Guest Name with clean underline
  const labelName = "Guest Name : ";
  const valName = data.residentName || "Resident";
  page.drawText(labelName, {
    x: frameX + 22,
    y: curY,
    size: 11,
    font: fontBold,
    color: navyDeep,
  });
  const labelNameW = fontBold.widthOfTextAtSize(labelName, 11);
  page.drawText(valName, {
    x: frameX + 22 + labelNameW + 4,
    y: curY,
    size: 11,
    font: fontBold,
    color: slateDark,
  });

  page.drawLine({
    start: { x: frameX + 22 + labelNameW, y: curY - 3 },
    end: { x: frameX + frameW - 22, y: curY - 3 },
    thickness: 0.8,
    color: rgb(0.65, 0.70, 0.78),
  });

  curY -= 34;

  // 9. Billing Period with clean underline (Check-in Date omitted per user request)
  const labelCycle = "Billing Period : ";
  const valCycle = resolveBillingCycleMonth(data.month, data.paidDate, data.joiningDate);
  page.drawText(labelCycle, {
    x: frameX + 22,
    y: curY,
    size: 10.5,
    font: fontBold,
    color: navyDeep,
  });
  const labelCycleW = fontBold.widthOfTextAtSize(labelCycle, 10.5);
  page.drawText(valCycle, {
    x: frameX + 22 + labelCycleW + 4,
    y: curY,
    size: 10.5,
    font: fontRegular,
    color: slateDark,
  });

  page.drawLine({
    start: { x: frameX + 22 + labelCycleW, y: curY - 3 },
    end: { x: frameX + frameW - 22, y: curY - 3 },
    thickness: 0.8,
    color: rgb(0.65, 0.70, 0.78),
  });

  curY -= 40;

  // 10. Financial Box (Structured Grid)
  const gridX = frameX + 16;
  const gridW = frameW - 32;
  const gridH = 126;
  const gridY = curY - gridH;

  page.drawRectangle({
    x: gridX,
    y: gridY,
    width: gridW,
    height: gridH,
    borderColor: navyDeep,
    borderWidth: 1.2,
  });

  // Vertical Middle Separator in Grid
  const midX = gridX + gridW / 2;
  page.drawLine({
    start: { x: midX, y: gridY + 36 },
    end: { x: midX, y: gridY + gridH },
    thickness: 0.8,
    color: rgb(0.65, 0.70, 0.78),
  });

  // Horizontal Grid Row Divider
  page.drawLine({
    start: { x: gridX, y: gridY + gridH - 44 },
    end: { x: gridX + gridW, y: gridY + gridH - 44 },
    thickness: 0.8,
    color: rgb(0.65, 0.70, 0.78),
  });

  const r1Y = gridY + gridH - 28;
  const r2Y = gridY + gridH - 72;

  if (data.isSettlement && data.settlementDetails) {
    // Settlement Grid
    page.drawText("Initial Deposit Held :", { x: gridX + 14, y: r1Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(`INR ${Number(data.settlementDetails.initialDeposit || 0).toLocaleString("en-IN")}`, { x: gridX + 130, y: r1Y, size: 10.5, font: fontMono, color: slateDark });

    const totalDeds = (data.settlementDetails.totalDeductions ?? ((data.settlementDetails.unpaidRent || 0) + (data.settlementDetails.repairs || 0) + (data.settlementDetails.maintenance || 0)));
    page.drawText("Total Deductions :", { x: midX + 14, y: r1Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(`INR ${Number(totalDeds).toLocaleString("en-IN")}`, { x: midX + 125, y: r1Y, size: 10.5, font: fontMono, color: rgb(0.7, 0.2, 0.2) });

    page.drawText("Unpaid Dues / Repairs :", { x: gridX + 14, y: r2Y, size: 10, font: fontBold, color: navyDeep });
    page.drawText(`Rent: ${data.settlementDetails.unpaidRent || 0} • Repairs: ${data.settlementDetails.repairs || 0}`, { x: gridX + 14, y: r2Y - 12, size: 8.5, font: fontRegular, color: slateMuted });

    page.drawText("Settlement Status :", { x: midX + 14, y: r2Y, size: 10, font: fontBold, color: navyDeep });
    page.drawText("Bed Vacated & Ledger Finalized", { x: midX + 14, y: r2Y - 12, size: 8.5, font: fontBold, color: emeraldDark });
  } else if (isDeposit) {
    // Deposit Grid (Hyphen '-' for zero/non-applicable values per user request)
    const depositAmt = data.depositAmount && data.depositAmount > 0 ? data.depositAmount : data.amount;
    page.drawText("Deposit :", { x: gridX + 14, y: r1Y, size: 11, font: fontBold, color: navyDeep });
    page.drawText(`INR ${Number(depositAmt).toLocaleString("en-IN")}`, { x: gridX + 75, y: r1Y, size: 11, font: fontMono, color: slateDark });

    page.drawText("Rent :", { x: midX + 14, y: r1Y, size: 11, font: fontBold, color: navyDeep });
    page.drawText("-", { x: midX + 65, y: r1Y, size: 11, font: fontBold, color: slateMuted });

    page.drawText("Parking fee :", { x: gridX + 14, y: r2Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText("-", { x: gridX + 88, y: r2Y, size: 11, font: fontBold, color: slateMuted });

    page.drawText("Maintenance :", { x: midX + 14, y: r2Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText("-", { x: midX + 96, y: r2Y, size: 11, font: fontBold, color: slateMuted });
  } else {
    // Standard Rent Grid (Hyphen '-' for zero values per user request)
    const effectiveDeposit = data.depositAmount || 0;
    const effectiveParking = data.parkingAmount || 0;
    const effectiveMaint = data.maintenanceAmount || 0;
    const effectiveRent = data.rentAmount !== undefined
      ? data.rentAmount
      : Math.max(0, data.amount - effectiveDeposit - effectiveParking - effectiveMaint);

    page.drawText("Deposit :", { x: gridX + 14, y: r1Y, size: 11, font: fontBold, color: navyDeep });
    page.drawText(effectiveDeposit > 0 ? `INR ${Number(effectiveDeposit).toLocaleString("en-IN")}` : "-", {
      x: gridX + 75,
      y: r1Y,
      size: 11,
      font: effectiveDeposit > 0 ? fontMono : fontBold,
      color: effectiveDeposit > 0 ? slateDark : slateMuted,
    });

    page.drawText("Rent :", { x: midX + 14, y: r1Y, size: 11, font: fontBold, color: navyDeep });
    page.drawText(effectiveRent > 0 ? `INR ${Number(effectiveRent).toLocaleString("en-IN")}` : "-", {
      x: midX + 65,
      y: r1Y,
      size: 11,
      font: effectiveRent > 0 ? fontMono : fontBold,
      color: effectiveRent > 0 ? slateDark : slateMuted,
    });

    page.drawText("Parking fee :", { x: gridX + 14, y: r2Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(effectiveParking > 0 ? `INR ${Number(effectiveParking).toLocaleString("en-IN")}` : "-", {
      x: gridX + 88,
      y: r2Y,
      size: 11,
      font: effectiveParking > 0 ? fontMono : fontBold,
      color: effectiveParking > 0 ? slateDark : slateMuted,
    });

    page.drawText("Maintenance :", { x: midX + 14, y: r2Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(effectiveMaint > 0 ? `INR ${Number(effectiveMaint).toLocaleString("en-IN")}` : "-", {
      x: midX + 96,
      y: r2Y,
      size: 11,
      font: effectiveMaint > 0 ? fontMono : fontBold,
      color: effectiveMaint > 0 ? slateDark : slateMuted,
    });
  }

  // Row 3: Highlighted Total Received & Cleared Bar
  const r3H = 36;
  page.drawRectangle({
    x: gridX,
    y: gridY,
    width: gridW,
    height: r3H,
    color: emeraldBg,
    borderColor: rgb(0.55, 0.85, 0.70),
    borderWidth: 1,
  });

  const totText = data.isSettlement
    ? `NET REFUNDED :  INR ${Number(data.amount || 0).toLocaleString("en-IN")}`
    : `TOTAL RECEIVED :  INR ${Number(data.amount || 0).toLocaleString("en-IN")}`;

  page.drawText(totText, {
    x: gridX + 14,
    y: gridY + 12,
    size: 11.5,
    font: fontBold,
    color: emeraldDark,
  });

  const modeStr = `Mode: ${data.paymentMode || "UPI"}`;
  const modeW = fontBold.widthOfTextAtSize(modeStr, 9);
  page.drawText(modeStr, {
    x: gridX + gridW - 14 - modeW,
    y: gridY + 13,
    size: 9,
    font: fontBold,
    color: slateDark,
  });

  // 11. Signatures Section (Brought down so signatures don't hug the financial border)
  curY = gridY - 80;

  const sigLineW = 195;
  const ownerSigX = frameX + 24;
  const guestSigX = frameX + frameW - 24 - sigLineW;
  const sigBoxY = curY;

  // Embedded Owner Signature (If uploaded) OR Elegant Calligraphic Fallback
  let imageEmbedded = false;
  if (data.signatureUrl && typeof data.signatureUrl === "string" && data.signatureUrl.trim().length > 0) {
    try {
      let imageBytes: Uint8Array | null = null;
      if (data.signatureUrl.startsWith("http://") || data.signatureUrl.startsWith("https://")) {
        const res = await fetch(data.signatureUrl);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          imageBytes = new Uint8Array(ab);
        }
      } else {
        const rawBase64 = data.signatureUrl.includes("base64,")
          ? data.signatureUrl.split("base64,")[1]
          : data.signatureUrl;
        imageBytes = Buffer.from(rawBase64, "base64");
      }

      if (imageBytes && imageBytes.length > 0) {
        let embeddedImg: any = null;
        try {
          embeddedImg = await pdfDoc.embedJpg(imageBytes);
        } catch {
          try {
            embeddedImg = await pdfDoc.embedPng(imageBytes);
          } catch (e2) {
            console.warn("Could not embed signature as JPG or PNG:", e2);
          }
        }

        if (embeddedImg) {
          const imgDims = embeddedImg.scaleToFit(140, 38);
          page.drawImage(embeddedImg, {
            x: ownerSigX + (sigLineW - imgDims.width) / 2,
            y: sigBoxY + 14,
            width: imgDims.width,
            height: imgDims.height,
          });
          imageEmbedded = true;
        }
      }
    } catch (sigErr) {
      console.warn("Notice: could not embed owner signature image, using script signature fallback:", sigErr);
    }
  }

  if (!imageEmbedded) {
    const ownerNameText = data.ownerName || data.propertyName || "Authorized Desk";
    page.drawText(ownerNameText, {
      x: ownerSigX + 12,
      y: sigBoxY + 18,
      size: 15,
      font: fontOblique,
      color: rgb(0.08, 0.22, 0.52),
    });
  }

  // Left Underline: Owners Signature
  page.drawLine({
    start: { x: ownerSigX, y: sigBoxY + 10 },
    end: { x: ownerSigX + sigLineW, y: sigBoxY + 10 },
    thickness: 1,
    color: navyDeep,
  });

  page.drawText("Owners Signature", {
    x: ownerSigX + 32,
    y: sigBoxY - 5,
    size: 10,
    font: fontBold,
    color: navyDeep,
  });

  const ownerTitle = data.ownerName ? `Authorized Signatory • ${data.ownerName}` : "Authorized Signatory • Property Management";
  page.drawText(ownerTitle, {
    x: ownerSigX + 8,
    y: sigBoxY - 18,
    size: 8,
    font: fontRegular,
    color: slateMuted,
  });

  // Right: Guest Signature (Box left completely empty for resident/occupant physical or digital signature)
  page.drawLine({
    start: { x: guestSigX, y: sigBoxY + 10 },
    end: { x: guestSigX + sigLineW, y: sigBoxY + 10 },
    thickness: 1,
    color: navyDeep,
  });

  page.drawText("Guest Signature", {
    x: guestSigX + 46,
    y: sigBoxY - 5,
    size: 10,
    font: fontBold,
    color: navyDeep,
  });

  page.drawText("Tenant / Resident Confirmation", {
    x: guestSigX + 28,
    y: sigBoxY - 18,
    size: 8,
    font: fontRegular,
    color: slateMuted,
  });

  curY = sigBoxY - 58;

  // 12. Notice Board Footer
  page.drawLine({
    start: { x: frameX + 12, y: curY + 16 },
    end: { x: frameX + frameW - 12, y: curY + 16 },
    thickness: 0.8,
    color: gridBorder,
  });

  const ruleText = "*   Guests are subject to the rules and regulations outlined on the notice board.   *";
  const ruleW = fontBold.widthOfTextAtSize(ruleText, 9.5);
  page.drawText(ruleText, {
    x: frameX + (frameW - ruleW) / 2,
    y: curY,
    size: 9.5,
    font: fontBold,
    color: navyDeep,
  });

  // Micro Income Tax HRA Exemption declaration at bottom
  const compText = "Authentic electronic receipt issued via TenoPilot Property OS • Valid for Income Tax HRA Exemption under Sec 10(13A)";
  const compW = fontRegular.widthOfTextAtSize(compText, 7.5);
  page.drawText(compText, {
    x: frameX + (frameW - compW) / 2,
    y: frameY + 12,
    size: 7.5,
    font: fontRegular,
    color: slateMuted,
  });

  // 13. VOIDED Watermark (If cancelled)
  if (data.isVoided) {
    page.drawText("VOIDED / CANCELLED", {
      x: frameX + 35,
      y: frameY + frameH / 2 - 40,
      size: 46,
      font: fontBold,
      color: rgb(0.85, 0.2, 0.2),
      opacity: 0.22,
      rotate: degrees(38),
    });
  }

  return await pdfDoc.save();
}
