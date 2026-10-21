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
}) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Color Palette
    const brandTerracotta = rgb(0.76, 0.40, 0.16); // #c2652a
    const brandDark = rgb(0.12, 0.10, 0.09); // #1f1a17
    const slateGray = rgb(0.39, 0.45, 0.55); // #64748b
    const slateLight = rgb(0.97, 0.98, 0.99); // #f8fafc
    const borderStroke = rgb(0.88, 0.91, 0.94); // #e2e8f0
    const emeraldGreen = rgb(0.02, 0.59, 0.41); // #059669

    const pTitle = (data.propertyTitle || "Friendly Space Premium Coliving PG").toUpperCase();
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

    // 2. Header: Property Name & Crest
    page.drawText(pTitle, {
      x: 40,
      y: height - 48,
      size: 16,
      font: fontBold,
      color: brandDark,
    });

    if (data.propertyAddress) {
      page.drawText(data.propertyAddress, {
        x: 40,
        y: height - 63,
        size: 9,
        font: fontRegular,
        color: slateGray,
      });
    }

    page.drawText("TENOPILOT RESIDENTIAL CO-LIVING OPERATING SYSTEM", {
      x: 40,
      y: height - (data.propertyAddress ? 76 : 63),
      size: 8,
      font: fontBold,
      color: brandTerracotta,
    });

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
      start: { x: 40, y: height - 88 },
      end: { x: width - 40, y: height - 88 },
      thickness: 1,
      color: borderStroke,
    });

    // 3. Document Title Banner
    page.drawRectangle({
      x: 40,
      y: height - 128,
      width: width - 80,
      height: 32,
      color: slateLight,
      borderColor: borderStroke,
      borderWidth: 1,
    });
    page.drawText("RESIDENTIAL LEASE AGREEMENT & ALLOCATION RECORD", {
      x: 52,
      y: height - 117,
      size: 11,
      font: fontBold,
      color: brandDark,
    });

    // 4. Section 1: Tenant & Accommodation Details
    let currentY = height - 150;
    page.drawText("1. TENANT & ACCOMMODATION PARTICULARS", {
      x: 40,
      y: currentY,
      size: 10,
      font: fontBold,
      color: brandTerracotta,
    });

    currentY -= 15;
    page.drawRectangle({
      x: 40,
      y: currentY - 70,
      width: width - 80,
      height: 70,
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

    currentY -= 95;

    // 5. Section 2: Financial Terms & Dual-Ledger Breakdown
    page.drawText("2. FINANCIAL TERMS & DUAL-LEDGER SECURITY MATRIX", {
      x: 40,
      y: currentY,
      size: 10,
      font: fontBold,
      color: brandTerracotta,
    });

    currentY -= 15;
    page.drawRectangle({
      x: 40,
      y: currentY - 60,
      width: width - 80,
      height: 60,
      color: slateLight,
      borderColor: borderStroke,
      borderWidth: 1,
    });

    fieldY = currentY - 22;
    page.drawText("Agreed Monthly Rent:", { x: col1X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
    page.drawText(`Rs. ${data.monthlyRent.toLocaleString("en-IN")} / month`, { x: col1X + 115, y: fieldY, size: 10, font: fontBold, color: brandTerracotta });

    page.drawText("Security Deposit:", { x: col2X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
    page.drawText(`Rs. ${data.securityDeposit.toLocaleString("en-IN")}`, { x: col2X + 95, y: fieldY, size: 10, font: fontBold, color: emeraldGreen });

    fieldY -= 20;
    page.drawText("Rent Billing Cycle:", { x: col1X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
    page.drawText("Monthly Cycle (Due by 5th)", { x: col1X + 115, y: fieldY, size: 9, font: fontRegular, color: brandDark });

    page.drawText("Deposit Nature:", { x: col2X, y: fieldY, size: 9, font: fontRegular, color: slateGray });
    page.drawText("Refundable upon Move-Out", { x: col2X + 95, y: fieldY, size: 9, font: fontRegular, color: brandDark });

    currentY -= 85;

    // 6. Section 3: House Rules & Regulations (Conditional: Only if rules exist)
    const customRules = data.houseRulesAndRegulations?.trim();
    if (customRules) {
      page.drawText("3. TERMS, HOUSE RULES & PROPERTY REGULATIONS (ANNEXURE)", {
        x: 40,
        y: currentY,
        size: 10,
        font: fontBold,
        color: brandTerracotta,
      });

      currentY -= 15;
      const ruleLines = customRules
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const rulesBoxHeight = Math.min(260, Math.max(70, ruleLines.length * 16 + 20));

      page.drawRectangle({
        x: 40,
        y: currentY - rulesBoxHeight,
        width: width - 80,
        height: rulesBoxHeight,
        color: rgb(1, 1, 1),
        borderColor: borderStroke,
        borderWidth: 1,
      });

      let ruleY = currentY - 18;
      ruleLines.slice(0, 14).forEach((line) => {
        const text = line.length > 95 ? line.substring(0, 92) + "..." : line;
        page.drawText(text, {
          x: 55,
          y: ruleY,
          size: 8.5,
          font: fontRegular,
          color: brandDark,
        });
        ruleY -= 16;
      });

      currentY -= rulesBoxHeight + 20;
    } else {
      // Clean statutory declaration (NO filler rules)
      page.drawText("3. MUTUAL CONSENT & TENANCY DECLARATION", {
        x: 40,
        y: currentY,
        size: 10,
        font: fontBold,
        color: brandTerracotta,
      });

      currentY -= 15;
      page.drawRectangle({
        x: 40,
        y: currentY - 50,
        width: width - 80,
        height: 50,
        color: rgb(1, 1, 1),
        borderColor: borderStroke,
        borderWidth: 1,
      });

      page.drawText(
        "This official tenancy record verifies the reserved accommodation allocation. Both the resident and the property",
        { x: 55, y: currentY - 20, size: 8.5, font: fontRegular, color: slateGray }
      );
      page.drawText(
        "management agree to adhere to standard coliving etiquette, timely monthly settlements, and agreed notice periods.",
        { x: 55, y: currentY - 34, size: 8.5, font: fontRegular, color: slateGray }
      );

      currentY -= 70;
    }

    // 7. Signatures & Attestation Block
    page.drawRectangle({
      x: 40,
      y: currentY - 75,
      width: width - 80,
      height: 75,
      color: slateLight,
      borderColor: borderStroke,
      borderWidth: 1,
    });

    page.drawLine({
      start: { x: 55, y: currentY - 45 },
      end: { x: 250, y: currentY - 45 },
      thickness: 0.75,
      color: slateGray,
    });
    page.drawText(`Resident Digital Signature: ${data.tenantName}`, {
      x: 55,
      y: currentY - 58,
      size: 8,
      font: fontBold,
      color: brandDark,
    });
    page.drawText("Digitally Attested via TenoPilot Self-KYC", {
      x: 55,
      y: currentY - 68,
      size: 7,
      font: fontOblique,
      color: slateGray,
    });

    page.drawLine({
      start: { x: 340, y: currentY - 45 },
      end: { x: width - 55, y: currentY - 45 },
      thickness: 0.75,
      color: slateGray,
    });
    page.drawText("Property Authorized Signatory", {
      x: 340,
      y: currentY - 58,
      size: 8,
      font: fontBold,
      color: brandDark,
    });
    page.drawText("For " + (data.propertyTitle || "Property Management"), {
      x: 340,
      y: currentY - 68,
      size: 7,
      font: fontOblique,
      color: slateGray,
    });

    // Footer
    page.drawText(
      "CONFIDENTIAL & LEGALLY BINDING • GENERATED BY TENOPILOT OPERATING SYSTEM • VERIFIED DIGITAL RECORD",
      {
        x: 75,
        y: 25,
        size: 7,
        font: fontBold,
        color: rgb(0.65, 0.70, 0.75),
      }
    );

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
