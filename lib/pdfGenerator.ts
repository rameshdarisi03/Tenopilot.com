import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

export interface GuestReceiptChargeItem {
  description: string;
  qty?: string | number;
  rate?: number;
  amount: number;
}

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
  stayType?: string;
  isGuest?: boolean;
  guestMobile?: string;
  purpose?: string;
  checkInDate?: string;
  checkOutDate?: string;
  stayDurationDays?: number;
  dailyRate?: number;
  totalStayAmount?: number;
  initialPayment?: number;
  initialPaymentDate?: string;
  finalPayment?: number;
  finalPaymentDate?: string;
  balanceDue?: number;
  additionalCharges?: GuestReceiptChargeItem[];
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
    totalTariff?: number;
    totalPaid?: number;
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
 * Helper to intelligently split addresses on commas for clean, multi-line receipt headers
 */
function splitAddressOnCommas(address: string): string[] {
  if (!address) return [];
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [address];
  if (parts.length === 2) return [`${parts[0]},`, parts[1]];
  if (parts.length === 3) return [`${parts[0]}, ${parts[1]},`, parts[2]];
  const mid = Math.ceil(parts.length / 2);
  const line1 = parts.slice(0, mid).join(', ') + ',';
  const line2 = parts.slice(mid).join(', ');
  return [line1, line2];
}

/**
 * Generates the Dedicated Purple High-Fidelity A4 Guest Stay Receipt Buffer using pdf-lib.
 * Matches the approved Tenopilot Stay Receipt design with 95%+ visual fidelity.
 */
export async function generateGuestStayReceiptPdfBuffer(data: ReceiptPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const width = 595.28;
  const height = 841.89; // Standard A4 dimensions
  const page = pdfDoc.addPage([width, height]);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Purple Executive Design Palette
  const purplePrimary = rgb(0.486, 0.227, 0.929); // #7c3aed
  const purpleDark = rgb(0.357, 0.133, 0.745);    // #5b21b6
  const purpleDeepIndigo = rgb(0.263, 0.220, 0.792); // #4338ca
  const purpleBg = rgb(0.961, 0.953, 1.0);        // #f5f3ff
  const purpleBorder = rgb(0.929, 0.914, 0.996);  // #ede9fe
  const slate900 = rgb(0.059, 0.090, 0.165);      // #0f172a
  const slate600 = rgb(0.392, 0.455, 0.545);      // #64748b
  const slate400 = rgb(0.580, 0.639, 0.722);      // #94a3b8
  const emeraldGreen = rgb(0.086, 0.639, 0.290);  // #16a34a
  const emeraldBg = rgb(0.863, 0.988, 0.906);     // #dcfce7
  const emeraldBorder = rgb(0.525, 0.937, 0.675); // #86efac

  // 1. Decorative Soft Radial Waves (Top-Right and Bottom-Left)
  page.drawRectangle({
    x: width - 150,
    y: height - 90,
    width: 150,
    height: 90,
    color: rgb(0.945, 0.930, 0.996),
  });
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 140,
    height: 80,
    color: rgb(0.945, 0.930, 0.996),
  });

  // Safe Margins
  const marginX = 42;
  const contentW = width - (marginX * 2);

  // Determine Scenario
  const isSettlement = Boolean(
    data.isSettlement ||
    data.receiptNo.startsWith("REF-GUEST") ||
    data.receiptNo.startsWith("SET") ||
    (data.month && (data.month.toLowerCase().includes("settlement") || data.month.toLowerCase().includes("checkout")))
  );
  const totalStay = data.totalStayAmount || data.amount;
  const isPartial = !isSettlement && (data.amount < totalStay);

  let scenario: "FULL_ONBOARD" | "PARTIAL_ADVANCE" | "CHECKOUT_SETTLED" = "FULL_ONBOARD";
  if (isSettlement) scenario = "CHECKOUT_SETTLED";
  else if (isPartial) scenario = "PARTIAL_ADVANCE";

  const additionalCharges = data.additionalCharges || [];
  const totalCharges = totalStay + additionalCharges.reduce((acc, c) => acc + (c.amount || 0), 0);
  const hasAdditionalCharges = additionalCharges.length > 0;

  const stayDays = data.stayDurationDays || 1;
  const dailyRate = data.dailyRate || Math.round(totalStay / stayDays);
  const checkIn = data.checkInDate || data.paidDate;
  const checkOut = data.checkOutDate || data.paidDate;

  let initialPay = data.initialPayment ?? (scenario === "CHECKOUT_SETTLED" ? Math.max(0, totalCharges - data.amount) : data.amount);
  let finalPay = data.finalPayment ?? (scenario === "CHECKOUT_SETTLED" ? data.amount : 0);
  let balDue = data.balanceDue ?? (scenario === "PARTIAL_ADVANCE" ? Math.max(0, totalCharges - data.amount) : 0);

  // 2. Top Header Bar (curY = 785)
  let curY = height - 48;

  // Left: PG Icon Badge (w: 36, h: 36)
  page.drawRectangle({
    x: marginX,
    y: curY - 36,
    width: 36,
    height: 36,
    color: purplePrimary,
  });
  page.drawText("PG", {
    x: marginX + 9,
    y: curY - 24,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Left: PG Name (auto-scaled)
  const pName = data.propertyName || "Sunrise PG";
  let pNameSize = 16;
  if (pName.length > 38) pNameSize = 11;
  else if (pName.length > 26) pNameSize = 12.5;
  else if (pName.length > 18) pNameSize = 14;

  page.drawText(pName, {
    x: marginX + 46,
    y: curY - 14,
    size: pNameSize,
    font: fontBold,
    color: slate900,
  });

  // Left: Smart Comma-Split Address
  const addrLines = splitAddressOnCommas(data.propertyAddress || "#12-3-45, Hitech City Road, Madhapur, Hyderabad - 500081");
  let addrY = curY - 27;
  for (const line of addrLines.slice(0, 2)) {
    page.drawText(line, {
      x: marginX + 46,
      y: addrY,
      size: 8,
      font: fontRegular,
      color: slate600,
    });
    addrY -= 11;
  }

  // Left: Manager Phone
  page.drawText(`Tel: ${data.managerPhone || "+91 92066 51295"}`, {
    x: marginX + 46,
    y: addrY,
    size: 8,
    font: fontBold,
    color: slate900,
  });

  // Right: STAY RECEIPT Title
  const mainTitle = "STAY RECEIPT";
  const titleW = fontBold.widthOfTextAtSize(mainTitle, 17);
  page.drawText(mainTitle, {
    x: width - marginX - titleW,
    y: curY - 13,
    size: 17,
    font: fontBold,
    color: purpleDeepIndigo,
  });

  // Right: Subtitle Pill
  const subtitle = scenario === "CHECKOUT_SETTLED" ? "Final Settlement" : "Short Stay / Day Stay";
  const subW = fontBold.widthOfTextAtSize(subtitle, 8.5);
  const pillW = subW + 16;
  const pillH = 15;
  const pillX = width - marginX - pillW;
  const pillY = curY - 33;
  page.drawRectangle({
    x: pillX,
    y: pillY,
    width: pillW,
    height: pillH,
    color: purpleBg,
    borderColor: purpleBorder,
    borderWidth: 1,
  });
  page.drawText(subtitle, {
    x: pillX + 8,
    y: pillY + 4,
    size: 8.5,
    font: fontBold,
    color: purpleDark,
  });

  // Right: Metadata Table
  let metaY = curY - 50;
  const metaRows = [
    { label: "Receipt No.", val: data.receiptNo, isMono: true },
    { label: "Issued On", val: data.paidDate, isMono: false },
    { label: "Payment Mode", val: data.paymentMode || "UPI", isMono: false },
    { label: "Purpose", val: data.purpose || (scenario === "CHECKOUT_SETTLED" ? "Short Stay - Final Settlement" : "Short Stay"), isMono: false },
  ];

  for (const row of metaRows) {
    page.drawText(row.label, {
      x: width - marginX - 180,
      y: metaY,
      size: 8.5,
      font: fontRegular,
      color: slate600,
    });
    const valFont = row.isMono ? fontMono : fontBold;
    const valW = valFont.widthOfTextAtSize(row.val, 8.5);
    page.drawText(row.val, {
      x: width - marginX - valW,
      y: metaY,
      size: 8.5,
      font: valFont,
      color: slate900,
    });
    metaY -= 12.5;
  }

  // Horizontal Header Divider
  curY = height - 128;
  page.drawLine({
    start: { x: marginX, y: curY },
    end: { x: width - marginX, y: curY },
    thickness: 0.8,
    color: rgb(0.94, 0.95, 0.97),
  });

  curY -= 14;

  // 3. Dual Cards: Guest Details & Stay Details
  const cardW = (contentW - 14) / 2;
  const cardH = 82;
  const card1X = marginX;
  const card2X = marginX + cardW + 14;
  const cardY = curY - cardH;

  // Card 1: Guest Details Box
  page.drawRectangle({
    x: card1X,
    y: cardY,
    width: cardW,
    height: cardH,
    color: rgb(1, 1, 1),
    borderColor: purpleBorder,
    borderWidth: 1,
  });
  // Card 1 Header Bar
  page.drawRectangle({
    x: card1X,
    y: cardY + cardH - 22,
    width: cardW,
    height: 22,
    color: purpleBg,
    borderColor: purpleBorder,
    borderWidth: 1,
  });
  page.drawText("Guest Details", {
    x: card1X + 12,
    y: cardY + cardH - 15,
    size: 9.5,
    font: fontBold,
    color: purpleDark,
  });
  // Card 1 Body
  page.drawText("Name", { x: card1X + 12, y: cardY + 40, size: 9, font: fontRegular, color: slate600 });
  page.drawText(`: ${data.residentName}`, { x: card1X + 68, y: cardY + 40, size: 9, font: fontBold, color: slate900 });
  page.drawText("Mobile", { x: card1X + 12, y: cardY + 22, size: 9, font: fontRegular, color: slate600 });
  page.drawText(`: ${data.guestMobile || "+91 91234 56789"}`, { x: card1X + 68, y: cardY + 22, size: 9, font: fontMono, color: slate900 });

  // Card 2: Stay Details Box
  page.drawRectangle({
    x: card2X,
    y: cardY,
    width: cardW,
    height: cardH,
    color: rgb(1, 1, 1),
    borderColor: purpleBorder,
    borderWidth: 1,
  });
  // Card 2 Header Bar
  page.drawRectangle({
    x: card2X,
    y: cardY + cardH - 22,
    width: cardW,
    height: 22,
    color: purpleBg,
    borderColor: purpleBorder,
    borderWidth: 1,
  });
  page.drawText("Stay Details", {
    x: card2X + 12,
    y: cardY + cardH - 15,
    size: 9.5,
    font: fontBold,
    color: purpleDark,
  });
  // Card 2 Body
  page.drawText("Check-in", { x: card2X + 12, y: cardY + 46, size: 8.5, font: fontRegular, color: slate600 });
  page.drawText(`: ${checkIn}`, { x: card2X + 72, y: cardY + 46, size: 8.5, font: fontBold, color: slate900 });

  page.drawText("Check-out", { x: card2X + 12, y: cardY + 33, size: 8.5, font: fontRegular, color: slate600 });
  page.drawText(`: ${checkOut}`, { x: card2X + 72, y: cardY + 33, size: 8.5, font: fontBold, color: slate900 });

  page.drawText("Room", { x: card2X + 12, y: cardY + 20, size: 8.5, font: fontRegular, color: slate600 });
  page.drawText(`: ${data.roomNumber} (${data.bedCode})`, { x: card2X + 72, y: cardY + 20, size: 8.5, font: fontBold, color: slate900 });

  page.drawText("No. of Days", { x: card2X + 12, y: cardY + 7, size: 8.5, font: fontRegular, color: slate600 });
  page.drawText(`: ${stayDays} Days`, { x: card2X + 72, y: cardY + 7, size: 8.5, font: fontBold, color: slate900 });

  // 4. Harmonized Itemized Table
  curY = cardY - 20;

  // Table Outer Frame Box
  const tableX = marginX;
  const col1W = contentW * 0.44;
  const col2W = contentW * 0.18;
  const col3W = contentW * 0.18;
  const col4W = contentW * 0.20;

  // Header Row (h: 24)
  page.drawRectangle({
    x: tableX,
    y: curY - 24,
    width: contentW,
    height: 24,
    color: purpleBg,
    borderColor: purpleBorder,
    borderWidth: 1,
  });
  page.drawText("Description", { x: tableX + 12, y: curY - 16, size: 9, font: fontBold, color: purpleDark });
  page.drawText("Qty / Days", { x: tableX + col1W + 16, y: curY - 16, size: 9, font: fontBold, color: purpleDark });
  page.drawText("Rate (per Day)", { x: tableX + col1W + col2W + 8, y: curY - 16, size: 9, font: fontBold, color: purpleDark });
  page.drawText("Amount", { x: tableX + contentW - 55, y: curY - 16, size: 9, font: fontBold, color: purpleDark });

  curY -= 24;

  // Base Item Row: Room Stay (h: 26)
  page.drawRectangle({
    x: tableX,
    y: curY - 26,
    width: contentW,
    height: 26,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.95, 0.95, 0.96),
    borderWidth: 0.8,
  });
  const roomDesc = `Room Stay (${data.roomNumber} - ${data.bedCode})`;
  page.drawText(roomDesc, { x: tableX + 12, y: curY - 17, size: 9.5, font: fontBold, color: slate900 });
  page.drawText(`${stayDays} Days`, { x: tableX + col1W + 24, y: curY - 17, size: 9.5, font: fontRegular, color: slate900 });
  page.drawText(`INR ${dailyRate.toLocaleString("en-IN")}`, { x: tableX + col1W + col2W + 12, y: curY - 17, size: 9.5, font: fontRegular, color: slate900 });
  const totalStayStr = `INR ${Number(totalStay).toLocaleString("en-IN")}`;
  const totalStayW = fontBold.widthOfTextAtSize(totalStayStr, 9.5);
  page.drawText(totalStayStr, { x: tableX + contentW - 12 - totalStayW, y: curY - 17, size: 9.5, font: fontBold, color: slate900 });

  curY -= 26;

  // Additional Charges Rows (if any)
  for (const addon of additionalCharges) {
    page.drawRectangle({
      x: tableX,
      y: curY - 24,
      width: contentW,
      height: 24,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.95, 0.95, 0.96),
      borderWidth: 0.8,
    });
    page.drawText(addon.description, { x: tableX + 12, y: curY - 16, size: 9, font: fontBold, color: slate900 });
    page.drawText(String(addon.qty || "1"), { x: tableX + col1W + 24, y: curY - 16, size: 9, font: fontRegular, color: slate900 });
    page.drawText(addon.rate ? `INR ${Number(addon.rate).toLocaleString("en-IN")}` : "-", { x: tableX + col1W + col2W + 12, y: curY - 16, size: 9, font: fontRegular, color: slate900 });
    const addonStr = `INR ${Number(addon.amount).toLocaleString("en-IN")}`;
    const addonW = fontBold.widthOfTextAtSize(addonStr, 9);
    page.drawText(addonStr, { x: tableX + contentW - 12 - addonW, y: curY - 16, size: 9, font: fontBold, color: slate900 });
    curY -= 24;
  }

  // Subtotal Row if Additional Charges Exist
  if (hasAdditionalCharges) {
    page.drawRectangle({
      x: tableX,
      y: curY - 24,
      width: contentW,
      height: 24,
      color: rgb(0.98, 0.96, 1.0),
      borderColor: purpleBorder,
      borderWidth: 1,
    });
    page.drawText("Total Bill Amount", { x: tableX + 12, y: curY - 16, size: 9.5, font: fontBold, color: purpleDark });
    const subStr = `INR ${Number(totalCharges).toLocaleString("en-IN")}`;
    const subW = fontBold.widthOfTextAtSize(subStr, 9.5);
    page.drawText(subStr, { x: tableX + contentW - 12 - subW, y: curY - 16, size: 9.5, font: fontBold, color: purpleDark });
    curY -= 24;
  }

  // Ledger Lines
  if (scenario === "FULL_ONBOARD") {
    // Payment Received Row
    page.drawRectangle({ x: tableX, y: curY - 22, width: contentW, height: 22, color: rgb(1, 1, 1), borderColor: rgb(0.95, 0.95, 0.96), borderWidth: 0.5 });
    page.drawText(`Payment Received on ${data.paidDate}`, { x: tableX + 12, y: curY - 15, size: 9, font: fontRegular, color: slate600 });
    const payStr = `INR ${Number(totalCharges).toLocaleString("en-IN")}`;
    const payW = fontBold.widthOfTextAtSize(payStr, 9);
    page.drawText(payStr, { x: tableX + contentW - 12 - payW, y: curY - 15, size: 9, font: fontBold, color: slate900 });
    curY -= 22;

    // Balance Due Row
    page.drawRectangle({ x: tableX, y: curY - 22, width: contentW, height: 22, color: rgb(1, 1, 1), borderColor: rgb(0.95, 0.95, 0.96), borderWidth: 0.5 });
    page.drawText("Balance Due", { x: tableX + 12, y: curY - 15, size: 9, font: fontRegular, color: slate600 });
    const balStr = "INR 0";
    const balW = fontBold.widthOfTextAtSize(balStr, 9);
    page.drawText(balStr, { x: tableX + contentW - 12 - balW, y: curY - 15, size: 9, font: fontBold, color: slate900 });
    curY -= 22;

    // Highlight Total Row
    page.drawRectangle({ x: tableX, y: curY - 26, width: contentW, height: 26, color: purpleBg, borderColor: purpleBorder, borderWidth: 1 });
    page.drawText("Total Paid (Settled)", { x: tableX + 12, y: curY - 17, size: 10, font: fontBold, color: purpleDark });
    const totStr = `INR ${Number(totalCharges).toLocaleString("en-IN")}`;
    const totW = fontBold.widthOfTextAtSize(totStr, 10);
    page.drawText(totStr, { x: tableX + contentW - 12 - totW, y: curY - 17, size: 10, font: fontBold, color: purpleDark });
    curY -= 26;
  } else if (scenario === "PARTIAL_ADVANCE") {
    // Payment Received Row
    page.drawRectangle({ x: tableX, y: curY - 22, width: contentW, height: 22, color: rgb(1, 1, 1), borderColor: rgb(0.95, 0.95, 0.96), borderWidth: 0.5 });
    page.drawText(`Payment Received on ${data.paidDate}`, { x: tableX + 12, y: curY - 15, size: 9, font: fontRegular, color: slate600 });
    const payStr = `INR ${Number(initialPay).toLocaleString("en-IN")}`;
    const payW = fontBold.widthOfTextAtSize(payStr, 9);
    page.drawText(payStr, { x: tableX + contentW - 12 - payW, y: curY - 15, size: 9, font: fontBold, color: slate900 });
    curY -= 22;

    // Balance Due Row
    page.drawRectangle({ x: tableX, y: curY - 22, width: contentW, height: 22, color: rgb(1, 1, 1), borderColor: rgb(0.95, 0.95, 0.96), borderWidth: 0.5 });
    page.drawText("Balance Due", { x: tableX + 12, y: curY - 15, size: 9, font: fontBold, color: rgb(0.725, 0.110, 0.110) });
    const balStr = `INR ${Number(balDue).toLocaleString("en-IN")}`;
    const balW = fontBold.widthOfTextAtSize(balStr, 9);
    page.drawText(balStr, { x: tableX + contentW - 12 - balW, y: curY - 15, size: 9, font: fontBold, color: rgb(0.725, 0.110, 0.110) });
    curY -= 22;

    // Highlight Total Row
    page.drawRectangle({ x: tableX, y: curY - 26, width: contentW, height: 26, color: purpleBg, borderColor: purpleBorder, borderWidth: 1 });
    page.drawText("Total Paid", { x: tableX + 12, y: curY - 17, size: 10, font: fontBold, color: purpleDark });
    const totStr = `INR ${Number(initialPay).toLocaleString("en-IN")}`;
    const totW = fontBold.widthOfTextAtSize(totStr, 10);
    page.drawText(totStr, { x: tableX + contentW - 12 - totW, y: curY - 17, size: 10, font: fontBold, color: purpleDark });
    curY -= 26;
  } else {
    // CHECKOUT_SETTLED
    // Advance Payment Received Row
    page.drawRectangle({ x: tableX, y: curY - 22, width: contentW, height: 22, color: rgb(1, 1, 1), borderColor: rgb(0.95, 0.95, 0.96), borderWidth: 0.5 });
    page.drawText(`Payment Received on ${data.initialPaymentDate || checkIn}`, { x: tableX + 12, y: curY - 15, size: 9, font: fontRegular, color: slate600 });
    const pay1Str = `INR ${Number(initialPay).toLocaleString("en-IN")}`;
    const pay1W = fontBold.widthOfTextAtSize(pay1Str, 9);
    page.drawText(pay1Str, { x: tableX + contentW - 12 - pay1W, y: curY - 15, size: 9, font: fontBold, color: slate900 });
    curY -= 22;

    // Final Payment Received Row
    page.drawRectangle({ x: tableX, y: curY - 22, width: contentW, height: 22, color: rgb(1, 1, 1), borderColor: rgb(0.95, 0.95, 0.96), borderWidth: 0.5 });
    page.drawText(`Final Payment Received on ${data.finalPaymentDate || checkOut}`, { x: tableX + 12, y: curY - 15, size: 9, font: fontRegular, color: slate600 });
    const pay2Str = `INR ${Number(finalPay).toLocaleString("en-IN")}`;
    const pay2W = fontBold.widthOfTextAtSize(pay2Str, 9);
    page.drawText(pay2Str, { x: tableX + contentW - 12 - pay2W, y: curY - 15, size: 9, font: fontBold, color: slate900 });
    curY -= 22;

    // Balance Due Row
    page.drawRectangle({ x: tableX, y: curY - 22, width: contentW, height: 22, color: rgb(1, 1, 1), borderColor: rgb(0.95, 0.95, 0.96), borderWidth: 0.5 });
    page.drawText("Balance Due", { x: tableX + 12, y: curY - 15, size: 9, font: fontRegular, color: slate600 });
    const balStr = "INR 0";
    const balW = fontBold.widthOfTextAtSize(balStr, 9);
    page.drawText(balStr, { x: tableX + contentW - 12 - balW, y: curY - 15, size: 9, font: fontBold, color: slate900 });
    curY -= 22;

    // Highlight Total Row
    page.drawRectangle({ x: tableX, y: curY - 26, width: contentW, height: 26, color: purpleBg, borderColor: purpleBorder, borderWidth: 1 });
    page.drawText("Total Paid (Settled)", { x: tableX + 12, y: curY - 17, size: 10, font: fontBold, color: purpleDark });
    const totStr = `INR ${Number(totalCharges).toLocaleString("en-IN")}`;
    const totW = fontBold.widthOfTextAtSize(totStr, 10);
    page.drawText(totStr, { x: tableX + contentW - 12 - totW, y: curY - 17, size: 10, font: fontBold, color: purpleDark });
    curY -= 26;
  }

  curY -= 16;

  // 5. Summary Box with Status Badge
  const summaryH = 46;
  page.drawRectangle({
    x: tableX,
    y: curY - summaryH,
    width: contentW,
    height: summaryH,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: rgb(0.90, 0.90, 0.92),
    borderWidth: 1,
  });

  // Status Badge
  let badgeText = "PAID (Full)";
  let sumLine1 = "The stay has been fully paid upfront.";
  let sumLine2 = `Full amount of INR ${Number(totalCharges).toLocaleString("en-IN")} received for the stay from ${checkIn} to ${checkOut} (${stayDays} Days). Zero balance remaining.`;

  if (scenario === "PARTIAL_ADVANCE") {
    badgeText = "PARTIALLY PAID";
    sumLine1 = `Advance of INR ${Number(initialPay).toLocaleString("en-IN")} received for the stay from ${checkIn} to ${checkOut} (${stayDays} Days).`;
    sumLine2 = `Remaining balance of INR ${Number(balDue).toLocaleString("en-IN")} is due at or before check-out.`;
  } else if (scenario === "CHECKOUT_SETTLED") {
    badgeText = "PAID (Settled)";
    sumLine1 = "The stay has been fully settled.";
    sumLine2 = `Total amount of INR ${Number(totalCharges).toLocaleString("en-IN")} received for the stay from ${checkIn} to ${checkOut} (${stayDays} Days).`;
  }

  const badgeW = fontBold.widthOfTextAtSize(badgeText, 9.5) + 24;
  page.drawRectangle({
    x: tableX + 12,
    y: curY - summaryH + 13,
    width: badgeW,
    height: 20,
    color: emeraldBg,
    borderColor: emeraldBorder,
    borderWidth: 1,
  });
  page.drawText(badgeText, {
    x: tableX + 24,
    y: curY - summaryH + 19,
    size: 9.5,
    font: fontBold,
    color: emeraldGreen,
  });

  // Divider inside summary box
  page.drawLine({
    start: { x: tableX + badgeW + 24, y: curY - summaryH + 8 },
    end: { x: tableX + badgeW + 24, y: curY - 8 },
    thickness: 0.8,
    color: rgb(0.88, 0.90, 0.94),
  });

  // Summary Text
  page.drawText(sumLine1, {
    x: tableX + badgeW + 36,
    y: curY - summaryH + 26,
    size: 8.5,
    font: fontBold,
    color: slate900,
  });
  page.drawText(sumLine2, {
    x: tableX + badgeW + 36,
    y: curY - summaryH + 14,
    size: 8,
    font: fontRegular,
    color: slate600,
  });

  // 6. Bottom Footer
  const footerY = 46;
  page.drawLine({
    start: { x: marginX, y: footerY + 24 },
    end: { x: width - marginX, y: footerY + 24 },
    thickness: 0.8,
    color: rgb(0.88, 0.90, 0.94),
  });

  page.drawText("This is a computer-generated receipt for short stay accommodation and is valid without a physical signature.", {
    x: marginX,
    y: footerY + 10,
    size: 7.5,
    font: fontRegular,
    color: slate600,
  });

  // Try embedding the official logo in the footer
  let logoEmbedded = false;
  if (typeof window === "undefined") {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const logoPath = path.join(process.cwd(), "public", "tenopilot_star_mark.jpg");
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        const embeddedImg = await pdfDoc.embedJpg(logoBytes);
        page.drawImage(embeddedImg, {
          x: width - marginX - 110,
          y: footerY + 3,
          width: 14,
          height: 14,
        });
        logoEmbedded = true;
      }
    } catch (e) {
      // Fallback to text
    }
  }

  const poweredTextX = logoEmbedded ? (width - marginX - 92) : (width - marginX - 105);
  page.drawText("Powered by Tenopilot.com", {
    x: poweredTextX,
    y: footerY + 7,
    size: 8,
    font: fontBold,
    color: purpleDark,
  });
  page.drawText("PG Management Platform", {
    x: poweredTextX,
    y: footerY - 3,
    size: 7,
    font: fontRegular,
    color: slate600,
  });

  return await pdfDoc.save();
}

/**
 * Generates an official, beautiful A4 PDF receipt buffer using pdf-lib
 * Suitable for instant serverless PDF download and WhatsApp Document attachment.
 */
export async function generateReceiptPdfBuffer(data: ReceiptPdfData): Promise<Uint8Array> {
  if (data.isGuest) {
    return generateGuestStayReceiptPdfBuffer(data);
  }

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

  // Detect whether this receipt is for a Short-Term Guest
  const isGuest = Boolean(
    data.isGuest ||
    data.stayType === "Guest" ||
    data.receiptNo?.startsWith("REF-GUEST") ||
    data.receiptNo?.startsWith("RCP-GUEST") ||
    data.receiptNo?.includes("GUEST") ||
    data.month?.toLowerCase().includes("guest") ||
    data.month?.toLowerCase().includes("short stay")
  );

  // 7. Pill Banner: [ GUEST DETAILS / RESIDENT DETAILS / SETTLEMENT DETAILS ]
  const pillTitle = isGuest
    ? data.isSettlement
      ? "GUEST CHECKOUT RECEIPT"
      : "GUEST STAY INVOICE / RECEIPT"
    : data.isSettlement
    ? "SETTLEMENT & NO-DUES DETAILS"
    : isDeposit
    ? "SECURITY DEPOSIT DETAILS"
    : "RESIDENT DETAILS";

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
  const labelName = isGuest ? "Guest Name : " : "Resident Name : ";
  const valName = data.residentName || (isGuest ? "Guest" : "Resident");
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

  // 9. Stay Period (for guests) or Billing Period (for long-term tenants)
  const labelCycle = isGuest ? "Stay Period : " : "Billing Period : ";
  let valCycle = "";
  if (isGuest) {
    if (data.checkInDate && data.checkOutDate) {
      const durText = data.stayDurationDays ? ` (${data.stayDurationDays} ${data.stayDurationDays === 1 ? "Day" : "Days"} Stay)` : "";
      valCycle = `${data.checkInDate} to ${data.checkOutDate}${durText}`;
    } else if (data.checkInDate) {
      valCycle = `From ${data.checkInDate} (Short Stay)`;
    } else {
      valCycle = data.month && !data.month.toLowerCase().includes("cycle") ? data.month : "Short-term Stay";
    }
  } else {
    valCycle = resolveBillingCycleMonth(data.month, data.paidDate, data.joiningDate);
  }

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

  if (isGuest && data.isSettlement) {
    // 🟣 Dedicated Guest Checkout & Settlement Grid (Clean, transparent, no misleading deductions!)
    const totalTariff = data.settlementDetails?.totalTariff || data.rentAmount || data.amount;
    const totalPaid = data.settlementDetails?.totalPaid || data.amount;
    const totalDeds = data.settlementDetails?.totalDeductions ?? 0;

    page.drawText("Total Stay Tariff :", { x: gridX + 14, y: r1Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(`INR ${Number(totalTariff).toLocaleString("en-IN")}`, { x: gridX + 115, y: r1Y, size: 10.5, font: fontMono, color: slateDark });

    page.drawText("Total Received :", { x: midX + 14, y: r1Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(`INR ${Number(totalPaid).toLocaleString("en-IN")}`, { x: midX + 105, y: r1Y, size: 10.5, font: fontMono, color: emeraldDark });

    page.drawText("Key & Handover :", { x: gridX + 14, y: r2Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText("Returned & Cleared", { x: gridX + 115, y: r2Y, size: 10, font: fontBold, color: emeraldDark });

    page.drawText("Deductions / Damages :", { x: midX + 14, y: r2Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(totalDeds > 0 ? `INR ${Number(totalDeds).toLocaleString("en-IN")}` : "-", {
      x: midX + 145,
      y: r2Y,
      size: 10.5,
      font: totalDeds > 0 ? fontMono : fontBold,
      color: totalDeds > 0 ? rgb(0.7, 0.2, 0.2) : slateMuted,
    });
  } else if (isGuest) {
    // 🟣 Dedicated Guest Stay Invoice Grid (Tariff, Daily Rate, Security Deposit, Room/Bed)
    const stayTariff = data.rentAmount ?? data.amount;
    const dailyRate = data.dailyRate;
    const keyDeposit = data.depositAmount || 0;

    page.drawText("Stay Tariff :", { x: gridX + 14, y: r1Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(`INR ${Number(stayTariff).toLocaleString("en-IN")}`, { x: gridX + 85, y: r1Y, size: 10.5, font: fontMono, color: slateDark });

    page.drawText("Daily Rate :", { x: midX + 14, y: r1Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(dailyRate ? `INR ${Number(dailyRate).toLocaleString("en-IN")} / day` : "-", {
      x: midX + 85,
      y: r1Y,
      size: 10.5,
      font: dailyRate ? fontMono : fontBold,
      color: dailyRate ? slateDark : slateMuted,
    });

    page.drawText("Security Deposit :", { x: gridX + 14, y: r2Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(keyDeposit > 0 ? `INR ${Number(keyDeposit).toLocaleString("en-IN")}` : "-", {
      x: gridX + 115,
      y: r2Y,
      size: 10.5,
      font: keyDeposit > 0 ? fontMono : fontBold,
      color: keyDeposit > 0 ? slateDark : slateMuted,
    });

    page.drawText("Room / Bed :", { x: midX + 14, y: r2Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(`Room ${data.roomNumber} (${data.bedCode})`, { x: midX + 85, y: r2Y, size: 10.5, font: fontBold, color: slateDark });
  } else if (data.isSettlement && data.settlementDetails) {
    // Settlement Grid
    page.drawText("Initial Deposit Held :", { x: gridX + 14, y: r1Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(`INR ${Number(data.settlementDetails.initialDeposit || 0).toLocaleString("en-IN")}`, { x: gridX + 130, y: r1Y, size: 10.5, font: fontMono, color: slateDark });

    const totalDeds = (data.settlementDetails.totalDeductions ?? ((data.settlementDetails.unpaidRent || 0) + (data.settlementDetails.repairs || 0) + (data.settlementDetails.maintenance || 0)));
    page.drawText("Total Deductions :", { x: midX + 14, y: r1Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(`INR ${Number(totalDeds).toLocaleString("en-IN")}`, { x: midX + 125, y: r1Y, size: 10.5, font: fontMono, color: rgb(0.7, 0.2, 0.2) });

    const totalMaintCharges = (data.settlementDetails.maintenance || 0) + (data.settlementDetails.repairs || 0);
    page.drawText("Unpaid Rent :", { x: gridX + 14, y: r2Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(data.settlementDetails.unpaidRent && data.settlementDetails.unpaidRent > 0 ? `INR ${Number(data.settlementDetails.unpaidRent).toLocaleString("en-IN")}` : "-", {
      x: gridX + 88,
      y: r2Y,
      size: 10.5,
      font: data.settlementDetails.unpaidRent && data.settlementDetails.unpaidRent > 0 ? fontMono : fontBold,
      color: data.settlementDetails.unpaidRent && data.settlementDetails.unpaidRent > 0 ? slateDark : slateMuted,
    });

    page.drawText("Maintenance :", { x: midX + 14, y: r2Y, size: 10.5, font: fontBold, color: navyDeep });
    page.drawText(totalMaintCharges > 0 ? `INR ${Number(totalMaintCharges).toLocaleString("en-IN")}` : "-", {
      x: midX + 96,
      y: r2Y,
      size: 10.5,
      font: totalMaintCharges > 0 ? fontMono : fontBold,
      color: totalMaintCharges > 0 ? slateDark : slateMuted,
    });
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
  const netRefund = Number(data.settlementDetails?.netRefunded ?? (data.amount > 0 ? data.amount : 0));
  const netDeficit = Number(data.settlementDetails?.netDeficit ?? 0);

  let totText = "";
  let barBg = emeraldBg;
  let barBorder = rgb(0.55, 0.85, 0.70);
  let barColor = emeraldDark;

  if (isGuest && data.isSettlement) {
    if (netRefund > 0) {
      totText = `NET REFUNDED :  INR ${netRefund.toLocaleString("en-IN")}`;
    } else if (netDeficit > 0) {
      totText = `NET DUE FROM GUEST :  INR ${netDeficit.toLocaleString("en-IN")}`;
      barColor = rgb(0.75, 0.15, 0.15);
      barBg = rgb(0.98, 0.92, 0.92);
      barBorder = rgb(0.9, 0.6, 0.6);
    } else {
      totText = "SETTLEMENT STATUS :  ZERO DUES / FULLY SETTLED";
      barColor = navyDeep;
      barBg = rgb(0.94, 0.96, 0.99);
      barBorder = rgb(0.7, 0.8, 0.9);
    }
  } else if (data.isSettlement) {
    totText = `NET REFUNDED :  INR ${Number(data.amount || 0).toLocaleString("en-IN")}`;
  } else {
    totText = `TOTAL RECEIVED :  INR ${Number(data.amount || 0).toLocaleString("en-IN")}`;
  }

  const r3H = 36;
  page.drawRectangle({
    x: gridX,
    y: gridY,
    width: gridW,
    height: r3H,
    color: barBg,
    borderColor: barBorder,
    borderWidth: 1,
  });

  page.drawText(totText, {
    x: gridX + 14,
    y: gridY + 12,
    size: 11,
    font: fontBold,
    color: barColor,
  });

  const modeStr = (isGuest && data.isSettlement && netRefund === 0 && netDeficit === 0)
    ? "Status: Account Closed"
    : `Mode: ${data.paymentMode || "UPI"}`;
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

  page.drawText(isGuest ? "Guest Acknowledgement" : "Tenant / Resident Confirmation", {
    x: guestSigX + (isGuest ? 44 : 28),
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

  // Micro Income Tax HRA Exemption declaration at bottom (only for long-term tenants; omitted for guests per user instruction)
  if (!isGuest) {
    const compText = "Authentic electronic receipt issued via TenoPilot Property OS • Valid for Income Tax HRA Exemption under Sec 10(13A)";
    const compW = fontRegular.widthOfTextAtSize(compText, 7.5);
    page.drawText(compText, {
      x: frameX + (frameW - compW) / 2,
      y: frameY + 12,
      size: 7.5,
      font: fontRegular,
      color: slateMuted,
    });
  }

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
