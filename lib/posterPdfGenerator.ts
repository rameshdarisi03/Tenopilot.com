import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

export interface ComplaintsPosterData {
  propertyName: string;
  propertyId: string;
  portalUrl: string;
}

/**
 * Generates an ultra-premium A4 Complaints QR Poster PDF buffer using pdf-lib.
 * Rendered on server: zero client edge memory limits, 100% reliable across all mobile browsers.
 */
export async function generateComplaintsPosterPdf(data: ComplaintsPosterData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  // Standard A4 dimensions in points: 595.28 x 841.89 (210mm x 297mm)
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 1. Photorealistic Scandinavian/Boutique Interior Background
  const bgPath = path.join(process.cwd(), "public", "images", "poster-background.jpg");
  if (fs.existsSync(bgPath)) {
    try {
      const bgBytes = fs.readFileSync(bgPath);
      const bgImg = await pdfDoc.embedJpg(bgBytes);
      page.drawImage(bgImg, { x: 0, y: 0, width, height });
    } catch {
      page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.97, 0.95) });
    }
  } else {
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.97, 0.95) });
  }

  // 2. Soft Ambient Radial / Center Veil (15% white opacity to boost text contrast)
  page.drawRectangle({
    x: 35,
    y: 80,
    width: width - 70,
    height: height - 140,
    color: rgb(1, 1, 1),
    opacity: 0.2,
  });

  // Colors
  const terracotta = rgb(0.76, 0.37, 0.18); // #C25E2E
  const darkBrown = rgb(0.12, 0.09, 0.08); // #1F1714
  const headerDark = rgb(0.24, 0.19, 0.16); // #3D302A
  const textMuted = rgb(0.42, 0.35, 0.32); // #6B5A51
  const white = rgb(1, 1, 1);

  const drawCenteredText = (text: string, y: number, size: number, font: any, color: any) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y,
      size,
      font,
      color,
    });
  };

  // 3. Top Authority Header
  drawCenteredText("RESIDENT CARE DESK", 780, 11, fontBold, headerDark);
  drawCenteredText("Maintenance Issues & Repairs 24/7", 764, 8.5, fontBold, textMuted);

  // 4. Hero Headline
  drawCenteredText("Facing a Problem?", 722, 26, fontBold, darkBrown);
  drawCenteredText("Scan to Report It.", 692, 26, fontBold, terracotta);

  // 5. Highlighted PG Name (Terracotta Rounded Pill)
  const pillText = (data.propertyName || "YOUR PROPERTY").toUpperCase();
  const pillFontSize = 12.5;
  const pillTextWidth = fontBold.widthOfTextAtSize(pillText, pillFontSize);
  const pillWidth = Math.min(Math.max(pillTextWidth + 44, 220), width - 80);
  const pillHeight = 28;
  const pillX = (width - pillWidth) / 2;
  const pillY = 642;

  page.drawRectangle({
    x: pillX,
    y: pillY,
    width: pillWidth,
    height: pillHeight,
    color: terracotta,
  });
  drawCenteredText(pillText, pillY + 8.5, pillFontSize, fontBold, white);

  // 6. QR Code Card & Vector QR
  const qrCardSize = 220;
  const qrCardX = (width - qrCardSize) / 2;
  const qrCardY = 398;

  // Soft card drop shadow
  page.drawRectangle({
    x: qrCardX + 2,
    y: qrCardY - 3,
    width: qrCardSize,
    height: qrCardSize,
    color: rgb(0.85, 0.8, 0.75),
    opacity: 0.25,
  });

  // White Card
  page.drawRectangle({
    x: qrCardX,
    y: qrCardY,
    width: qrCardSize,
    height: qrCardSize,
    color: white,
    borderColor: rgb(0.95, 0.88, 0.82),
    borderWidth: 1,
  });

  // Generate crisp 600px QR Code PNG buffer
  const qrBuffer = await QRCode.toBuffer(data.portalUrl, {
    width: 600,
    margin: 1,
    color: {
      dark: "#1F1714",
      light: "#FFFFFF",
    },
  });
  const qrImg = await pdfDoc.embedPng(qrBuffer);

  const qrInnerSize = 190;
  page.drawImage(qrImg, {
    x: (width - qrInnerSize) / 2,
    y: qrCardY + (qrCardSize - qrInnerSize) / 2,
    width: qrInnerSize,
    height: qrInnerSize,
  });

  // 7. 3-Step Instruction Sequence
  const stepY = 325;
  const stepColWidth = 140;
  const stepSpacing = (width - 3 * stepColWidth) / 4;

  const steps = [
    { num: "1", label: "Scan with Phone Camera" },
    { num: "2", label: "Enter Mobile Number" },
    { num: "3", label: "Submit Your Issue" },
  ];

  steps.forEach((step, i) => {
    const x = stepSpacing + i * (stepColWidth + stepSpacing) + stepColWidth / 2;

    // Circle icon backdrop
    page.drawCircle({
      x,
      y: stepY + 15,
      size: 14,
      color: white,
      borderColor: rgb(0.93, 0.82, 0.74),
      borderWidth: 1,
    });

    // Step Number Badge
    page.drawCircle({
      x: x - 10,
      y: stepY + 23,
      size: 6,
      color: terracotta,
    });
    const numWidth = fontBold.widthOfTextAtSize(step.num, 7);
    page.drawText(step.num, {
      x: x - 10 - numWidth / 2,
      y: stepY + 20.5,
      size: 7,
      font: fontBold,
      color: white,
    });

    // Step Text
    const labelWidth = fontBold.widthOfTextAtSize(step.label, 8);
    page.drawText(step.label, {
      x: x - labelWidth / 2,
      y: stepY - 10,
      size: 8,
      font: fontBold,
      color: darkBrown,
    });

    // Arrow divider between steps
    if (i < 2) {
      page.drawText(">", {
        x: x + stepColWidth / 2 + stepSpacing / 2 - 4,
        y: stepY + 11,
        size: 13,
        font: fontBold,
        color: terracotta,
      });
    }
  });

  // 8. SLA Service Commitment Box
  const slaBoxWidth = 440;
  const slaBoxHeight = 44;
  const slaX = (width - slaBoxWidth) / 2;
  const slaY = 240;

  page.drawRectangle({
    x: slaX,
    y: slaY,
    width: slaBoxWidth,
    height: slaBoxHeight,
    color: white,
    opacity: 0.95,
    borderColor: rgb(0.93, 0.82, 0.74),
    borderWidth: 1,
  });

  page.drawText("Fast * Simple * Available 24/7", {
    x: slaX + 20,
    y: slaY + 24,
    size: 9.5,
    font: fontBold,
    color: darkBrown,
  });
  page.drawText("Your complaint goes directly to the property caretaker and management team.", {
    x: slaX + 20,
    y: slaY + 11,
    size: 8,
    font: fontRegular,
    color: textMuted,
  });

  // 9. Footer Divider & Branding
  page.drawLine({
    start: { x: 70, y: 190 },
    end: { x: width - 70, y: 190 },
    thickness: 0.8,
    color: rgb(0.85, 0.72, 0.65),
    opacity: 0.5,
  });

  drawCenteredText("-- POWERED BY TENOPILOT --", 168, 8, fontBold, headerDark);
  drawCenteredText(
    "tenopilot.com * Instant Direct Dispatch to Property Caretaker & Management",
    154,
    7.2,
    fontBold,
    textMuted
  );

  return await pdfDoc.save();
}
