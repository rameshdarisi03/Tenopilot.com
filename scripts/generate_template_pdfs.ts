import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { generateEmailContent, SESSendParams } from "../lib/sesService";

const outputDir = path.resolve(process.cwd(), "public/templates");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const templates: { filename: string; title: string; params: SESSendParams }[] = [
  {
    filename: "TenoPilot_Template_1_Auth_OTP.pdf",
    title: "User Authentication & Verification OTP",
    params: {
      toEmail: "resident@example.com",
      recipientName: "Ram Sharma",
      propertyId: "auth",
      propertyName: "TenoPilot",
      type: "AUTH_OTP",
      params: {
        otpCode: "849201",
      },
    },
  },
  {
    filename: "TenoPilot_Template_2_Payment_Receipt.pdf",
    title: "Official Rent Payment Receipt",
    params: {
      toEmail: "resident@example.com",
      recipientName: "Ram Sharma",
      propertyId: "prop-101",
      propertyName: "Arihant Luxury Living",
      type: "PAYMENT_RECEIPT",
      params: {
        receiptId: "REC-782910",
        roomNumber: "204",
        bedCode: "Bed B",
        amount: 8500,
        paidDate: "15 Oct 2026",
        paymentMode: "UPI (Google Pay / PhonePe)",
      },
    },
  },
  {
    filename: "TenoPilot_Template_3_Rent_Reminder.pdf",
    title: "Monthly Rent Payment Reminder",
    params: {
      toEmail: "resident@example.com",
      recipientName: "Ram Sharma",
      propertyId: "prop-101",
      propertyName: "Arihant Luxury Living",
      type: "RENT_REMINDER",
      params: {
        roomNumber: "204",
        bedCode: "Bed B",
        amount: 8500,
        dueDate: "05 Nov 2026",
        upiId: "arihantstays@icici",
        bankLabel: "ICICI Current Account",
      },
    },
  },
  {
    filename: "TenoPilot_Template_4_Onboarding_Invite.pdf",
    title: "Digital Check-In & KYC Invite",
    params: {
      toEmail: "newresident@example.com",
      recipientName: "Ram Sharma",
      propertyId: "prop-101",
      propertyName: "Arihant Luxury Living",
      type: "ONBOARDING_INVITE",
      params: {
        onboardUrl: "https://www.tenopilot.com/self-onboard/inv-93821038",
      },
    },
  },
  {
    filename: "TenoPilot_Template_5_Checkout_Settlement.pdf",
    title: "Move-Out & Deposit Settlement Confirmation",
    params: {
      toEmail: "resident@example.com",
      recipientName: "Ram Sharma",
      propertyId: "prop-101",
      propertyName: "Arihant Luxury Living",
      type: "CHECKOUT_THANK_YOU",
      params: {
        receiptId: "SETTLE-49201",
        receiptUrl: "https://www.tenopilot.com/api/receipt/pdf?receiptNo=SETTLE-49201",
        managerPhone: "+91 98765 43210",
      },
    },
  },
];

async function main() {
  console.log("Launching Playwright Chromium...");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const t of templates) {
    const { html, subject } = generateEmailContent(t.params);
    const pdfPath = path.join(outputDir, t.filename);

    console.log(`Generating ${t.filename} (${subject})...`);
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });
    console.log(`✅ Saved: ${pdfPath}`);
  }

  await browser.close();
  console.log("All 5 template PDFs generated successfully!");
}

main().catch((err) => {
  console.error("PDF generation error:", err);
  process.exit(1);
});
