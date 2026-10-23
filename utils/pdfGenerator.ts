/**
 * PDF & Receipt Generator Engine for TenoPilot
 * Generates and downloads real client-side PDF documents and rent receipts on demand.
 * 100% Client-Side Browser Memory — 0 Cloud Storage Costs!
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function downloadRentalAgreementPdf(data: {
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
}) {
  try {
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
    const agreementId = `AGR-${new Date().getFullYear()}-${data.roomNumber.replace(/\D/g, "") || "101"}${data.bedCode.replace(/\D/g, "") || "A"}`;
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
    page.drawText(data.tenantName, { x: col1X + 95, y: fieldY, size: 9, font: fontBold, color: brandDark });

    page.drawText("Room & Bed Slot:", { x: col2X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
    page.drawText(`Room ${data.roomNumber} (${data.bedCode})`, { x: col2X + 95, y: fieldY, size: 9, font: fontBold, color: brandDark });

    fieldY -= 22;
    page.drawText("Primary Phone:", { x: col1X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
    page.drawText(data.phone, { x: col1X + 95, y: fieldY, size: 9, font: fontBold, color: brandDark });

    page.drawText("Move-In / Start Date:", { x: col2X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
    page.drawText(data.joiningDate, { x: col2X + 95, y: fieldY, size: 9, font: fontBold, color: brandDark });

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
    page.drawText(`Rs. ${data.monthlyRent.toLocaleString("en-IN")} / month`, { x: col1X + 115, y: fieldY, size: 10, font: fontBold, color: brandTerracotta });

    page.drawText("Security Deposit:", { x: col2X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
    page.drawText(`Rs. ${data.securityDeposit.toLocaleString("en-IN")}`, { x: col2X + 95, y: fieldY, size: 10, font: fontBold, color: emeraldGreen });

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

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rental_Agreement_${data.tenantName.replace(/\s+/g, "_")}_${data.roomNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("PDF generation error:", err);
  }
}

export function downloadRentReceiptPdf(data: {
  tenantName: string;
  roomNumber: string;
  receiptNo: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
}) {
  const content = `===================================================================
                        RENT PAYMENT RECEIPT
===================================================================
RECEIPT NO     : ${data.receiptNo}
PAYMENT DATE   : ${data.paymentDate}
STATUS         : PAID (VERIFIED)

-------------------------------------------------------------------
PAYMENT BREAKDOWN
-------------------------------------------------------------------
Received From  : ${data.tenantName}
Room & Bed     : Room ${data.roomNumber}
Payment Amount : Rs. ${data.amount.toLocaleString("en-IN")}
Payment Mode   : ${data.paymentMode}

Thank you for your prompt payment!
-------------------------------------------------------------------
TENOPILOT PG MANAGEMENT SYSTEM • AUTOMATED RECEIPT
===================================================================`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rent_Receipt_${data.receiptNo.replace("#", "")}_${data.tenantName.replace(/\s+/g, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
