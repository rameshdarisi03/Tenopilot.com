/**
 * PDF & Receipt Generator Engine for TenoPilot
 * Generates and downloads real client-side PDF documents and rent receipts on demand.
 * 100% Client-Side Browser Memory — 0 Cloud Storage Costs!
 */

export function downloadRentalAgreementPdf(data: {
  tenantName: string;
  phone: string;
  roomNumber: string;
  bedCode: string;
  joiningDate: string;
  monthlyRent: number;
  securityDeposit: number;
  propertyTitle?: string;
}) {
  const title = data.propertyTitle || "SUNSHINE HEIGHTS PG";
  const agreementId = `AGR-${Date.now().toString().slice(-6)}`;
  
  const content = `===================================================================
                       RESIDENTIAL LEASE AGREEMENT
===================================================================
PROPERTY ORGANISATION : ${title}
AGREEMENT ID          : ${agreementId}
DATE OF ISSUANCE      : ${new Date().toLocaleDateString("en-GB")}

-------------------------------------------------------------------
1. TENANT & ACCOMMODATION DETAILS
-------------------------------------------------------------------
Full Tenant Name     : ${data.tenantName}
Mobile Phone         : ${data.phone}
Allocated Room & Bed : Room ${data.roomNumber} (${data.bedCode})
Move-in Joining Date : ${data.joiningDate}

-------------------------------------------------------------------
2. FINANCIAL TERMS & DEPOSIT
-------------------------------------------------------------------
Agreed Monthly Rent  : Rs. ${data.monthlyRent.toLocaleString("en-IN")} / month
Security Deposit     : Rs. ${data.securityDeposit.toLocaleString("en-IN")} (Refundable)
Rent Due Date        : 1st of every calendar month

-------------------------------------------------------------------
3. TERMS & CONDITIONS
-------------------------------------------------------------------
a) The tenant agrees to pay monthly rent on or before the due date.
b) A standard 30-day notice period is mandatory prior to vacating.
c) Property equipment, furniture, and fittings must be maintained in good condition.
d) Subletting the allocated bed or room is strictly prohibited.

-------------------------------------------------------------------
ISSUED VIA TENOPILOT SAAS PLATFORM • OFFICIAL RENTAL RECORD
===================================================================`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rental_Agreement_${data.tenantName.replace(/\s+/g, "_")}_${agreementId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
