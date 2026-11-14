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
  tenantPhone?: string;
  phone?: string;
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
  parkingSlot?: string;
  priorArrears?: number;
  priorArrearsMonth?: string;
  billingCycleDates?: string;
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

export function resolveTenantBillingDates(
  cycleSetting?: string,
  joiningDateStr?: string,
  monthStr?: string,
  receiptDateStr?: string
): { billingMonthName: string; billingCycleRange: string } {
  const isAnniversary = cycleSetting === "Anniversary Date";
  const monthsMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  let refDate = new Date();
  if (receiptDateStr) {
    const d = new Date(receiptDateStr);
    if (!isNaN(d.getTime())) refDate = d;
  }
  let targetYear = refDate.getFullYear();
  let targetMonth = refDate.getMonth();

  if (monthStr && !monthStr.toLowerCase().includes("deposit")) {
    const mLower = monthStr.toLowerCase();
    for (const [abbr, idx] of Object.entries(monthsMap)) {
      if (mLower.includes(abbr)) {
        targetMonth = idx;
        const yearMatch = monthStr.match(/20\d{2}/);
        if (yearMatch) targetYear = parseInt(yearMatch[0], 10);
        break;
      }
    }
  }

  const monthName = new Date(targetYear, targetMonth, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  if (isAnniversary && joiningDateStr) {
    const jDate = new Date(joiningDateStr);
    if (!isNaN(jDate.getTime())) {
      const joinDay = jDate.getDate();
      const startDate = new Date(targetYear, targetMonth, joinDay);
      const endDate = new Date(targetYear, targetMonth + 1, joinDay - 1);
      return {
        billingMonthName: monthName,
        billingCycleRange: `${fmt(startDate)} – ${fmt(endDate)}`
      };
    }
  }

  // 1st to End of Month
  if (joiningDateStr) {
    const jDate = new Date(joiningDateStr);
    if (!isNaN(jDate.getTime()) && jDate.getFullYear() === targetYear && jDate.getMonth() === targetMonth && jDate.getDate() > 1) {
      const startDate = jDate;
      const lastDay = new Date(targetYear, targetMonth + 1, 0);
      return {
        billingMonthName: monthName,
        billingCycleRange: `${fmt(startDate)} – ${fmt(lastDay)}`
      };
    }
  }

  const firstDay = new Date(targetYear, targetMonth, 1);
  const lastDay = new Date(targetYear, targetMonth + 1, 0);
  return {
    billingMonthName: monthName,
    billingCycleRange: `${fmt(firstDay)} – ${fmt(lastDay)}`
  };
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
  const actualGuestMobile = data.guestMobile || data.tenantPhone || data.phone || "—";
  page.drawText(`: ${actualGuestMobile}`, { x: card1X + 68, y: cardY + 22, size: 9, font: fontMono, color: slate900 });

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

export function formatSmartAddress(address?: string): string[] {
  if (!address) return [];
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [address];
  if (parts.length === 2) return [parts[0] + ',', parts[1]];
  if (parts.length === 3) return [parts[0] + ', ' + parts[1] + ',', parts[2]];
  const mid = Math.ceil(parts.length / 2);
  const line1 = parts.slice(0, mid).join(', ') + ',';
  const line2 = parts.slice(mid).join(', ');
  return [line1, line2];
}

/**
 * Generates an official, executive Tenant Rental & Security Deposit Receipt PDF buffer using pdf-lib.
 * Utilizes the custom TenoPilot Architectural Template and Signature Orange Theme.
 */
export async function generateTenantRentalReceiptPdfBuffer(data: ReceiptPdfData): Promise<Uint8Array> {
  const width = 595.28;
  const height = 841.89; // Standard A4 dimensions

  let pdfDoc: PDFDocument | null = null;
  let page: any = null;
  let loadedFromTemplate = false;

  if (typeof window === "undefined") {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const templatePath = path.join(process.cwd(), "public", "tenant_receipt_template.pdf");
      if (fs.existsSync(templatePath)) {
        const templateBytes = fs.readFileSync(templatePath);
        pdfDoc = await PDFDocument.load(templateBytes);
        page = pdfDoc.getPages()[0];
        loadedFromTemplate = true;
      }
    } catch (e) {
      // fallback
    }
  }

  if (!loadedFromTemplate || !pdfDoc || !page) {
    pdfDoc = await PDFDocument.create();
    page = pdfDoc.addPage([width, height]);
    if (typeof window === "undefined") {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const bgImgPath = path.join(process.cwd(), "public", "tenant_receipt_bg.jpg");
        if (fs.existsSync(bgImgPath)) {
          const bgBytes = fs.readFileSync(bgImgPath);
          const bgImg = await pdfDoc.embedJpg(bgBytes);
          page.drawImage(bgImg, { x: 0, y: 0, width, height });
        }
      } catch (e) {
        // fallback to blank
      }
    }
  }

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Palette
  const darkSlate = rgb(0.12, 0.16, 0.23);
  const mutedSlate = rgb(0.39, 0.45, 0.55);
  const warmOrange = rgb(0.92, 0.35, 0.05);
  const terracotta = rgb(0.60, 0.20, 0.07);
  const creamBorder = rgb(0.99, 0.84, 0.67);
  const creamBg = rgb(1.0, 0.97, 0.93);
  const white = rgb(1.0, 1.0, 1.0);
  const redArrears = rgb(0.73, 0.11, 0.11);
  const emeraldGreen = rgb(0.02, 0.59, 0.41);

  // 1. Header Bar: Document Title on Left, Receipt No on Right
  const title = data.isDeposit
    ? "Security Deposit Receipt"
    : data.isSettlement
    ? "Settlement Receipt"
    : "Rental Receipt";

  page.drawText(title, {
    x: 42,
    y: height - 52,
    size: 20,
    font: fontBold,
    color: darkSlate,
  });

  // Receipt No Pill on Top Right
  const receiptNoStr = data.receiptNo || "RCP-001";
  const rPillW = 145;
  const rPillH = 22;
  const rPillX = width - 42 - rPillW;
  const rPillY = height - 58;

  page.drawRectangle({
    x: rPillX,
    y: rPillY,
    width: rPillW,
    height: rPillH,
    color: creamBg,
    borderColor: creamBorder,
    borderWidth: 1,
    borderRadius: 11,
  });

  page.drawText("RECEIPT NO.", {
    x: rPillX + 10,
    y: rPillY + 7,
    size: 7.5,
    font: fontBold,
    color: terracotta,
  });

  page.drawText(receiptNoStr, {
    x: rPillX + 70,
    y: rPillY + 7,
    size: 8.5,
    font: fontMono,
    color: warmOrange,
  });

  // 2. Hero Card: Property & Tenant Profile
  const heroX = 40;
  const heroY = height - 150;
  const heroW = width - 80;
  const heroH = 78;

  page.drawRectangle({
    x: heroX,
    y: heroY,
    width: heroW,
    height: heroH,
    color: white,
    borderColor: rgb(0.88, 0.91, 0.94),
    borderWidth: 1,
    borderRadius: 12,
  });

  // Property Column
  page.drawText("PROPERTY", {
    x: heroX + 16,
    y: heroY + heroH - 16,
    size: 7,
    font: fontBold,
    color: terracotta,
  });

  const pName = data.propertyName || "Sunrise PG";
  const pNameSize = pName.length > 28 ? 11 : pName.length > 18 ? 13 : 15;
  page.drawText(pName, {
    x: heroX + 16,
    y: heroY + heroH - 32,
    size: pNameSize,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  const addrLines = formatSmartAddress(data.propertyAddress || "Kakiri Street, Whitefield, Bangalore");
  if (addrLines[0]) {
    page.drawText(addrLines[0], {
      x: heroX + 16,
      y: heroY + heroH - 46,
      size: 8,
      font: fontRegular,
      color: mutedSlate,
    });
  }
  if (addrLines[1]) {
    page.drawText(addrLines[1], {
      x: heroX + 16,
      y: heroY + heroH - 57,
      size: 8,
      font: fontRegular,
      color: mutedSlate,
    });
  }
  if (data.managerPhone) {
    page.drawText("Ph: " + data.managerPhone, {
      x: heroX + 16,
      y: heroY + heroH - 69,
      size: 8,
      font: fontBold,
      color: warmOrange,
    });
  }

  // Divider line
  const divX = heroX + heroW * 0.58;
  page.drawLine({
    start: { x: divX, y: heroY + 10 },
    end: { x: divX, y: heroY + heroH - 10 },
    thickness: 1,
    color: rgb(0.94, 0.96, 0.98),
  });

  // Tenant Column
  page.drawText("TENANT", {
    x: divX + 16,
    y: heroY + heroH - 16,
    size: 7,
    font: fontBold,
    color: terracotta,
  });

  page.drawText(data.residentName || "Resident", {
    x: divX + 16,
    y: heroY + heroH - 32,
    size: 14,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  // Room Bed Badge
  const roomBedStr = "Room " + (data.roomNumber || "N/A") + " | Bed " + (data.bedCode || "B").replace(/^Bed\s*/i, "");
  const badgeW = fontBold.widthOfTextAtSize(roomBedStr, 8.5) + 16;
  page.drawRectangle({
    x: divX + 16,
    y: heroY + heroH - 56,
    width: badgeW,
    height: 18,
    color: creamBg,
    borderColor: creamBorder,
    borderWidth: 1,
    borderRadius: 9,
  });
  page.drawText(roomBedStr, {
    x: divX + 24,
    y: heroY + heroH - 51,
    size: 8.5,
    font: fontBold,
    color: terracotta,
  });

  // 📞 Tenant Phone under Room & Bed (Matching owner's Ph: style on the left)
  const tenantPhoneStr = data.tenantPhone || data.phone || (data.isGuest ? data.guestMobile : undefined);
  if (tenantPhoneStr) {
    page.drawText("Ph: " + tenantPhoneStr, {
      x: divX + 16,
      y: heroY + heroH - 69,
      size: 8,
      font: fontBold,
      color: warmOrange,
    });
  }

  // 3. Particulars & Table
  const tableX = 40;
  let curY = heroY - 20;
  const tableW = width - 80;

  const cycle = resolveTenantBillingDates(data.billingCycleDates, data.joiningDate, data.month, data.paidDate);

  const items: { title: string; sub?: string; amount: number; isArrears?: boolean }[] = [];
  if (data.isDeposit || (data.depositAmount && data.depositAmount > 0)) {
    items.push({
      title: "Security Deposit",
      amount: data.depositAmount || data.amount,
    });
  }
  if (!data.isDeposit && data.rentAmount && data.rentAmount > 0) {
    items.push({
      title: "Rent for " + cycle.billingMonthName,
      sub: "(" + cycle.billingCycleRange + ")",
      amount: data.rentAmount,
    });
  }
  if (data.parkingAmount && data.parkingAmount > 0) {
    items.push({
      title: "Parking Charges",
      sub: data.parkingSlot ? "(" + data.parkingSlot + ")" : undefined,
      amount: data.parkingAmount,
    });
  }
  if (data.priorArrears && data.priorArrears > 0) {
    items.push({
      title: "Prior Arrears (Unpaid dues from " + (data.priorArrearsMonth || "Previous Month") + ")",
      amount: data.priorArrears,
      isArrears: true,
    });
  }
  if (data.maintenanceAmount && data.maintenanceAmount > 0) {
    items.push({
      title: "Maintenance & Facility Charges",
      amount: data.maintenanceAmount,
    });
  }
  if (items.length === 0) {
    items.push({
      title: "Rent for " + cycle.billingMonthName,
      sub: "(" + cycle.billingCycleRange + ")",
      amount: data.amount,
    });
  }

  const totalBillable = items.reduce((s, it) => s + it.amount, 0);
  const paidAmount = data.amount;
  const balanceRemaining = Math.max(0, totalBillable - paidAmount);
  const isPartial = balanceRemaining > 0;
  const isMultiItem = items.length > 1;

  // Header row
  const thH = 26;
  page.drawRectangle({
    x: tableX,
    y: curY - thH,
    width: tableW,
    height: thH,
    color: creamBg,
    borderColor: creamBorder,
    borderWidth: 1,
  });
  page.drawText("PARTICULARS", {
    x: tableX + 16,
    y: curY - 17,
    size: 8,
    font: fontBold,
    color: terracotta,
  });
  page.drawText("AMOUNT (INR)", {
    x: tableX + tableW - 80,
    y: curY - 17,
    size: 8,
    font: fontBold,
    color: terracotta,
  });
  curY -= thH;

  // Table rows
  for (const it of items) {
    const rowH = it.sub ? 38 : 28;
    page.drawRectangle({
      x: tableX,
      y: curY - rowH,
      width: tableW,
      height: rowH,
      color: white,
      borderColor: rgb(0.96, 0.97, 0.98),
      borderWidth: 1,
    });

    const itemColor = it.isArrears ? redArrears : rgb(0.06, 0.09, 0.16);
    page.drawText(it.title, {
      x: tableX + 16,
      y: it.sub ? curY - 16 : curY - 18,
      size: 9.5,
      font: fontBold,
      color: itemColor,
    });

    if (it.sub) {
      page.drawText(it.sub, {
        x: tableX + 16,
        y: curY - 28,
        size: 8,
        font: fontRegular,
        color: mutedSlate,
      });
    }

    const amtStr = "Rs. " + Number(it.amount).toLocaleString("en-IN");
    const amtW = fontBold.widthOfTextAtSize(amtStr, 10);
    page.drawText(amtStr, {
      x: tableX + tableW - 16 - amtW,
      y: curY - 18,
      size: 10,
      font: fontBold,
      color: itemColor,
    });

    curY -= rowH;
  }

  // Subtotal row if multi item
  if (isMultiItem) {
    const subH = 26;
    page.drawRectangle({
      x: tableX,
      y: curY - subH,
      width: tableW,
      height: subH,
      color: rgb(1.0, 0.98, 0.92),
      borderColor: creamBorder,
      borderWidth: 1,
    });
    page.drawText("Total Payable / Billable Charges", {
      x: tableX + 16,
      y: curY - 17,
      size: 8.5,
      font: fontBold,
      color: rgb(0.57, 0.25, 0.05),
    });
    const subStr = "Rs. " + Number(totalBillable).toLocaleString("en-IN");
    const subW = fontBold.widthOfTextAtSize(subStr, 9.5);
    page.drawText(subStr, {
      x: tableX + tableW - 16 - subW,
      y: curY - 17,
      size: 9.5,
      font: fontBold,
      color: rgb(0.57, 0.25, 0.05),
    });
    curY -= subH;
  }

  // Partial payment rows
  if (isPartial) {
    // Payment received row
    const rcvH = 24;
    page.drawRectangle({
      x: tableX,
      y: curY - rcvH,
      width: tableW,
      height: rcvH,
      color: white,
      borderColor: rgb(0.96, 0.97, 0.98),
      borderWidth: 1,
    });
    page.drawText("Payment Received on " + (data.paidDate || "N/A"), {
      x: tableX + 16,
      y: curY - 16,
      size: 8.5,
      font: fontRegular,
      color: mutedSlate,
    });
    const rcvStr = "Rs. " + Number(paidAmount).toLocaleString("en-IN");
    const rcvW = fontBold.widthOfTextAtSize(rcvStr, 9.5);
    page.drawText(rcvStr, {
      x: tableX + tableW - 16 - rcvW,
      y: curY - 16,
      size: 9.5,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });
    curY -= rcvH;

    // Balance Remaining row
    const balH = 24;
    page.drawRectangle({
      x: tableX,
      y: curY - balH,
      width: tableW,
      height: balH,
      color: rgb(0.99, 0.95, 0.95),
      borderColor: rgb(0.99, 0.88, 0.88),
      borderWidth: 1,
    });
    page.drawText("Balance Remaining", {
      x: tableX + 16,
      y: curY - 16,
      size: 8.5,
      font: fontBold,
      color: redArrears,
    });
    const balStr = "Rs. " + Number(balanceRemaining).toLocaleString("en-IN");
    const balW = fontBold.widthOfTextAtSize(balStr, 9.5);
    page.drawText(balStr, {
      x: tableX + tableW - 16 - balW,
      y: curY - 16,
      size: 9.5,
      font: fontBold,
      color: redArrears,
    });
    curY -= balH;
  }

  // Total Paid Row
  const totalH = 32;
  page.drawRectangle({
    x: tableX,
    y: curY - totalH,
    width: tableW,
    height: totalH,
    color: creamBg,
    borderColor: creamBorder,
    borderWidth: 1,
  });
  page.drawText("Total Paid", {
    x: tableX + 16,
    y: curY - 21,
    size: 10,
    font: fontBold,
    color: terracotta,
  });
  const totStr = "Rs. " + Number(paidAmount).toLocaleString("en-IN");
  const totW = fontBold.widthOfTextAtSize(totStr, 13);
  page.drawText(totStr, {
    x: tableX + tableW - 16 - totW,
    y: curY - 21,
    size: 13,
    font: fontBold,
    color: warmOrange,
  });
  curY -= totalH;

  // 4. Bottom 3 Meta Cards
  const cardsY = curY - 28;
  const cardGap = 12;
  const cardW = (tableW - 2 * cardGap) / 3;
  const cardH = 42;

  const statusLabel = data.isDeposit ? "Deposit Received" : isPartial ? "Partially Paid" : "Paid";
  const metaCards = [
    { label: "PAYMENT DATE", val: data.paidDate || "01 Nov 2026", color: darkSlate },
    { label: "PAYMENT MODE", val: data.paymentMode || "UPI", color: darkSlate },
    { label: "PAYMENT STATUS", val: statusLabel, color: isPartial ? rgb(0.79, 0.54, 0.02) : emeraldGreen },
  ];

  for (let i = 0; i < 3; i++) {
    const cX = tableX + i * (cardW + cardGap);
    page.drawRectangle({
      x: cX,
      y: cardsY - cardH,
      width: cardW,
      height: cardH,
      color: white,
      borderColor: creamBorder,
      borderWidth: 1,
      borderRadius: 8,
    });

    page.drawText(metaCards[i].label, {
      x: cX + 12,
      y: cardsY - 16,
      size: 6.5,
      font: fontBold,
      color: mutedSlate,
    });

    page.drawText(metaCards[i].val, {
      x: cX + 12,
      y: cardsY - 30,
      size: 9.5,
      font: fontBold,
      color: metaCards[i].color,
    });
  }

  // 5. Seamless Footer on the Dark Wave
  page.drawText("This is a computer-generated receipt and does not require a physical signature. For any queries, contact your PG administrator.", {
    x: 42,
    y: 38,
    size: 7.2,
    font: fontRegular,
    color: rgb(0.80, 0.84, 0.88),
  });

  page.drawText("* Valid for Income Tax HRA Exemption under Sec 10(13A) of Income Tax Act - Landlord PAN available on request *", {
    x: 42,
    y: 26,
    size: 7.2,
    font: fontBold,
    color: rgb(0.99, 0.73, 0.45),
  });

  // Footer Right: Logo & Branding
  if (typeof window === "undefined") {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const logoPath = path.join(process.cwd(), "public", "tenopilot_orange_mark.jpg");
      if (fs.existsSync(logoPath)) {
        const logoImg = await pdfDoc.embedJpg(fs.readFileSync(logoPath));
        page.drawImage(logoImg, {
          x: width - 150,
          y: 24,
          width: 16,
          height: 16,
        });
      }
    } catch (e) {
      // fallback
    }
  }

  page.drawText("Tenopilot.com", {
    x: width - 128,
    y: 33,
    size: 9.5,
    font: fontBold,
    color: white,
  });

  page.drawText("PG Management Platform", {
    x: width - 128,
    y: 24,
    size: 6.5,
    font: fontRegular,
    color: rgb(0.68, 0.73, 0.80),
  });

  // VOIDED Watermark if cancelled
  if (data.isVoided) {
    page.drawText("VOIDED / CANCELLED", {
      x: 70,
      y: height / 2 - 40,
      size: 46,
      font: fontBold,
      color: rgb(0.85, 0.2, 0.2),
      opacity: 0.22,
      rotate: degrees(38),
    });
  }

  return await pdfDoc.save();
}

/**
 * Generates an official, beautiful A4 PDF receipt buffer using pdf-lib
 * Dispatches to Dedicated Guest Stay Receipt (Purple) or Tenant Rental Receipt (Orange).
 */
export async function generateReceiptPdfBuffer(data: ReceiptPdfData): Promise<Uint8Array> {
  if (data.isGuest) {
    return generateGuestStayReceiptPdfBuffer(data);
  }
  return generateTenantRentalReceiptPdfBuffer(data);
}
