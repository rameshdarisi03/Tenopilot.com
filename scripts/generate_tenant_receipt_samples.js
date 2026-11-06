const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ARTIFACTS_DIR = 'C:/Users/rameshdarisi/.gemini/antigravity/brain/f8a16fb5-5d82-40e5-b086-de72e493532f';
const BG_IMAGE_SRC = path.join(__dirname, '..', 'public', 'tenant_receipt_bg.jpg');
const ORANGE_MARK_SRC = path.join(__dirname, '..', 'public', 'tenopilot_orange_mark.jpg');
const ORANGE_LOCKUP_SRC = path.join(__dirname, '..', 'public', 'tenopilot_orange_lockup.png');

const bgImageBase64 = fs.existsSync(BG_IMAGE_SRC)
  ? `data:image/jpeg;base64,${fs.readFileSync(BG_IMAGE_SRC).toString('base64')}`
  : '';
const orangeMarkBase64 = fs.existsSync(ORANGE_MARK_SRC)
  ? `data:image/jpeg;base64,${fs.readFileSync(ORANGE_MARK_SRC).toString('base64')}`
  : '';
const orangeLockupBase64 = fs.existsSync(ORANGE_LOCKUP_SRC)
  ? `data:image/png;base64,${fs.readFileSync(ORANGE_LOCKUP_SRC).toString('base64')}`
  : '';

function getPgNameFontSize(name) {
  if (!name) return '22px';
  const len = name.length;
  if (len <= 18) return '23px';
  if (len <= 26) return '19px';
  if (len <= 38) return '16.5px';
  return '14.5px';
}

function formatSmartAddress(address) {
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
 * SSOT Helper: Resolves dynamic billing cycle dates from real-time property settings and tenant joining date
 */
function resolveTenantBillingDates(cycleSetting, joiningDateStr, monthStr, receiptDateStr) {
  const isAnniversary = cycleSetting === 'Anniversary Date';
  const monthsMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  let refDate = new Date();
  if (receiptDateStr) {
    const d = new Date(receiptDateStr);
    if (!isNaN(d.getTime())) refDate = d;
  }
  let targetYear = refDate.getFullYear();
  let targetMonth = refDate.getMonth();

  if (monthStr && !monthStr.toLowerCase().includes('deposit')) {
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

  const monthName = new Date(targetYear, targetMonth, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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
  // Check if joined in target month
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

function renderTenantReceiptHtml(data) {
  const {
    scenario,
    receiptNo,
    receiptTitle = "Rental Receipt",
    issuedOn,
    paymentMode = "UPI",
    propertyName,
    propertyAddress,
    managerPhone,
    tenantName,
    roomNumber,
    bedCode,
    billingCycleDatesSetting = "1st to End of Month", // or "Anniversary Date"
    joiningDate = "2026-11-01",
    billingMonth = "Nov 2026",
    rentAmount = 0,
    parkingAmount = 0,
    parkingSlot = "2-Wheeler (Slot P-04)",
    priorArrears = 0,
    priorArrearsMonth = "Oct 2026",
    maintenanceAmount = 0,
    securityDeposit = 0,
    paidAmount = 0,
    status = "Paid",
  } = data;

  const addrLines = formatSmartAddress(propertyAddress);
  const cycleInfo = resolveTenantBillingDates(billingCycleDatesSetting, joiningDate, billingMonth, issuedOn);

  // Billable line items
  const items = [];
  if (securityDeposit > 0) {
    items.push({
      particulars: "Security Deposit", // "Refundable" removed per img2 feedback
      subtext: undefined, // description below removed per img2 feedback
      amount: securityDeposit,
    });
  }
  if (rentAmount > 0) {
    items.push({
      particulars: `Rent for ${cycleInfo.billingMonthName}`,
      subtext: `(${cycleInfo.billingCycleRange})`,
      amount: rentAmount,
    });
  }
  if (parkingAmount > 0) {
    items.push({
      particulars: `Parking Charges`,
      subtext: parkingSlot ? `(${parkingSlot})` : undefined,
      amount: parkingAmount,
    });
  }
  if (priorArrears > 0) {
    items.push({
      particulars: `Prior Arrears (Unpaid dues from ${priorArrearsMonth})`,
      amount: priorArrears,
      isArrears: true,
    });
  }
  if (maintenanceAmount > 0) {
    items.push({
      particulars: `Maintenance & Facility Charges`,
      amount: maintenanceAmount,
    });
  }

  const totalBillable = items.reduce((sum, it) => sum + it.amount, 0);
  const balanceRemaining = Math.max(0, totalBillable - paidAmount);
  const isMultiItem = items.length > 1;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${receiptTitle} - ${receiptNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background-color: #f1f5f9;
      display: flex;
      justify-content: center;
      padding: 20px;
    }

    .page-sheet {
      width: 794px; /* A4 width at 96 DPI */
      min-height: 1123px; /* A4 height at 96 DPI */
      background-color: #ffffff;
      background-image: url('${bgImageBase64}');
      background-size: 100% 100%;
      background-repeat: no-repeat;
      position: relative;
      overflow: hidden;
      padding: 44px 50px 32px 50px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* 1. Header Bar: Document Title on Left, Receipt No on Right */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      margin-bottom: 22px;
      position: relative;
      z-index: 2;
      padding-bottom: 8px;
    }

    .doc-title-block {
      display: flex;
      flex-direction: column;
    }

    .main-title {
      font-size: 26px;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }

    .receipt-badge-box {
      background: rgba(255, 247, 237, 0.95);
      border: 1px solid #fed7aa;
      border-radius: 9999px;
      padding: 6px 18px;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 6px rgba(234, 88, 12, 0.08);
    }

    .receipt-badge-label {
      font-size: 11px;
      font-weight: 700;
      color: #9a3412;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .receipt-badge-val {
      font-size: 13px;
      font-weight: 900;
      color: #ea580c;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* 2. Hero Card */
    .hero-card {
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(8px);
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 18px 22px;
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 22px;
      margin-bottom: 24px;
      box-shadow: 0 4px 14px -2px rgba(15, 23, 42, 0.05);
      position: relative;
      z-index: 2;
    }

    .hero-col {
      display: flex;
      align-items: flex-start;
      gap: 13px;
    }

    .hero-col.tenant-col {
      border-left: 1px solid #f1f5f9;
      padding-left: 20px;
    }

    .hero-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #fff7ed;
      border: 1px solid #ffedd5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #ea580c;
    }

    .hero-icon-box svg {
      width: 20px;
      height: 20px;
    }

    .hero-body {
      flex: 1;
      min-width: 0;
    }

    .hero-role-tag {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #9a3412;
      margin-bottom: 2px;
    }

    .hero-name {
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      letter-spacing: -0.2px;
      margin-bottom: 4px;
      word-break: break-word;
    }

    .hero-addr-line {
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.35;
    }

    .hero-phone {
      font-size: 11.5px;
      font-weight: 600;
      color: #ea580c;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .room-bed-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      color: #9a3412;
      font-size: 12px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-top: 6px;
    }

    /* 3. Particulars Table */
    .table-container {
      background: #ffffff;
      border: 1px solid #fed7aa;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 20px;
      position: relative;
      z-index: 2;
      box-shadow: 0 4px 12px rgba(234, 88, 12, 0.04);
    }

    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .ledger-table thead th {
      background: #fff7ed;
      color: #9a3412;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 13px 20px;
      border-bottom: 1px solid #fed7aa;
    }

    .ledger-table thead th.text-right {
      text-align: right;
    }

    .ledger-table tbody tr.item-row {
      border-bottom: 1px solid #f8fafc;
    }

    .ledger-table tbody td {
      padding: 16px 20px;
      font-size: 13.5px;
      color: #1e293b;
      vertical-align: middle;
    }

    .item-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 13.5px;
    }

    .item-subtext {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }

    .item-amount {
      font-weight: 700;
      font-size: 14.5px;
      color: #0f172a;
      text-align: right;
    }

    .arrears-text {
      color: #b91c1c !important;
    }

    .total-billable-row {
      background: #fffbeb;
      border-top: 1px solid #fed7aa;
      border-bottom: 1px solid #fed7aa;
    }

    .total-billable-row td {
      padding: 11px 20px;
      font-size: 12.5px;
      font-weight: 800;
      color: #92400e;
    }

    .total-billable-row td.text-right {
      text-align: right;
      font-size: 13.5px;
      color: #92400e;
    }

    .received-row {
      background: #ffffff;
      border-bottom: 1px solid #f8fafc;
    }

    .received-row td {
      padding: 11px 20px;
      font-size: 12.5px;
      font-weight: 600;
      color: #475569;
    }

    .received-row td.text-right {
      text-align: right;
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
    }

    .balance-row {
      background: #fef2f2;
      border-bottom: 1px solid #fee2e2;
    }

    .balance-row td {
      padding: 11px 20px;
      font-size: 12.5px;
      font-weight: 800;
      color: #b91c1c;
    }

    .balance-row td.text-right {
      text-align: right;
      font-size: 13.5px;
      font-weight: 800;
      color: #b91c1c;
    }

    .total-settled-row {
      background: #fff7ed;
      border-top: 1.5px solid #fed7aa;
    }

    .total-settled-row td {
      padding: 15px 20px;
      font-size: 14.5px;
      font-weight: 900;
      color: #9a3412;
    }

    .total-settled-row td.text-right {
      text-align: right;
      font-size: 17px;
      font-weight: 900;
      color: #ea580c;
    }

    /* 4. Bottom Meta Strip (3 Cards) */
    .meta-cards-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
      position: relative;
      z-index: 2;
    }

    .meta-card {
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(8px);
      border: 1px solid #fed7aa;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
    }

    .meta-icon-box {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: #fff7ed;
      color: #ea580c;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .meta-icon-box.status-icon-paid {
      background: #ecfdf5;
      color: #059669;
    }

    .meta-icon-box.status-icon-partial {
      background: #fefce8;
      color: #ca8a04;
    }

    .meta-label {
      font-size: 9.5px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 2px;
    }

    .meta-val {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }

    .meta-val.val-paid {
      color: #059669;
    }

    .meta-val.val-partial {
      color: #ca8a04;
    }

    /* 5. Footer: High Readability & Contrast seamlessly on dark wave */
    .footer-container {
      position: relative;
      z-index: 5;
      margin-top: auto;
      padding-top: 10px;
    }

    .footer-dark-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 10px 4px 4px 4px;
    }

    .footer-left-col {
      flex: 1;
      font-size: 9.5px;
      color: #cbd5e1;
      line-height: 1.45;
    }

    .footer-left-col .hra-tag {
      font-size: 9px;
      font-weight: 600;
      color: #fdba74;
      margin-top: 3px;
      display: block;
    }

    .footer-right-brand {
      display: flex;
      align-items: center;
      gap: 9px;
      flex-shrink: 0;
    }

    .powered-label {
      font-size: 10px;
      color: #94a3b8;
    }

    .brand-logo-img {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      object-fit: cover;
    }

    .brand-text-block {
      text-align: right;
    }

    .brand-name {
      font-size: 13.5px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1;
    }

    .brand-name span {
      color: #f97316;
    }

    .brand-tagline {
      font-size: 8.5px;
      color: #94a3b8;
      margin-top: 2px;
    }
  </style>
</head>
<body>

  <div class="page-sheet">

    <div class="content-body">
      <!-- 1. Header Bar: Clean Title on Left, Receipt No on Right -->
      <div class="header-bar">
        <div class="doc-title-block">
          <h1 class="main-title">${receiptTitle}</h1>
        </div>

        <div class="receipt-badge-box">
          <span class="receipt-badge-label">Receipt No.</span>
          <span class="receipt-badge-val">${receiptNo}</span>
        </div>
      </div>

      <!-- 2. Hero Card: Property Details & Tenant Profile -->
      <div class="hero-card">
        <!-- Property Column -->
        <div class="hero-col property-col">
          <div class="hero-icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div class="hero-body">
            <div class="hero-role-tag">Property</div>
            <div class="hero-name" style="font-size: ${getPgNameFontSize(propertyName)};">${propertyName}</div>
            ${addrLines.map(l => `<div class="hero-addr-line">${l}</div>`).join('')}
            ${managerPhone ? `<div class="hero-phone"><span>📞</span> ${managerPhone}</div>` : ''}
          </div>
        </div>

        <!-- Tenant Column -->
        <div class="hero-col tenant-col">
          <div class="hero-icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div class="hero-body">
            <div class="hero-role-tag">Tenant</div>
            <div class="hero-name" style="font-size: 19px;">${tenantName}</div>
            <div class="room-bed-badge">
              <span>Room ${roomNumber}</span>
              <span>|</span>
              <span>Bed ${bedCode.replace(/^Bed\s*/i, '')}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Particulars & Itemized Table -->
      <div class="table-container">
        <table class="ledger-table">
          <thead>
            <tr>
              <th style="width: 70%;">Particulars</th>
              <th class="text-right" style="width: 30%;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => `
              <tr class="item-row">
                <td>
                  <div class="item-title ${it.isArrears ? 'arrears-text' : ''}">${it.particulars}</div>
                  ${it.subtext ? `<div class="item-subtext">${it.subtext}</div>` : ''}
                </td>
                <td class="item-amount ${it.isArrears ? 'arrears-text' : ''}">₹${Number(it.amount).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}

            ${isMultiItem ? `
              <tr class="total-billable-row">
                <td>Total Payable / Billable Charges</td>
                <td class="text-right">₹${Number(totalBillable).toLocaleString('en-IN')}</td>
              </tr>
            ` : ''}

            ${scenario === 'PARTIAL_PAYMENT' ? `
              <tr class="received-row">
                <td>Payment Received on ${issuedOn}</td>
                <td class="text-right">₹${Number(paidAmount).toLocaleString('en-IN')}</td>
              </tr>
              <tr class="balance-row">
                <td>Balance Remaining</td>
                <td class="text-right">₹${Number(balanceRemaining).toLocaleString('en-IN')}</td>
              </tr>
            ` : ''}

            <tr class="total-settled-row">
              <td>Total Paid</td>
              <td class="text-right">₹${Number(paidAmount).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 4. Bottom Meta Cards Strip (3 Cards) -->
      <div class="meta-cards-strip">
        <div class="meta-card">
          <div class="meta-icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 18px; height: 18px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <div class="meta-label">Payment Date</div>
            <div class="meta-val">${issuedOn}</div>
          </div>
        </div>

        <div class="meta-card">
          <div class="meta-icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 18px; height: 18px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
          </div>
          <div>
            <div class="meta-label">Payment Mode</div>
            <div class="meta-val">${paymentMode}</div>
          </div>
        </div>

        <div class="meta-card">
          <div class="meta-icon-box ${status === 'Partially Paid' ? 'status-icon-partial' : 'status-icon-paid'}">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 18px; height: 18px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <div class="meta-label">Payment Status</div>
            <div class="meta-val ${status === 'Partially Paid' ? 'val-partial' : 'val-paid'}">${status}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. Footer Strip: High Legibility & Contrast -->
    <div class="footer-container">
      <div class="footer-dark-strip">
        <div class="footer-left-col">
          <div>This is a computer-generated receipt and does not require a physical signature. For any queries, contact your PG administrator.</div>
          <div class="hra-tag">★ Valid for Income Tax HRA Exemption under Sec 10(13A) of Income Tax Act • Landlord PAN available on request ★</div>
        </div>
        <div class="footer-right-brand">
          <span class="powered-label">Powered by</span>
          ${orangeMarkBase64 ? `<img src="${orangeMarkBase64}" class="brand-logo-img" alt="TenoPilot Logo"/>` : ''}
          <div class="brand-text-block">
            <div class="brand-name">Tenopilot<span>.com</span></div>
            <div class="brand-tagline">PG Management Platform</div>
          </div>
        </div>
      </div>
    </div>

  </div>

</body>
</html>`;
}

// Scenarios to generate
const scenarios = [
  {
    id: "sample_tenant_scenario_1_standard_rent_and_parking",
    title: "Scenario 1: Standard Monthly Rent & Parking (Paid in Full)",
    data: {
      scenario: "STANDARD_RENT",
      receiptNo: "2026-RNT-0148",
      receiptTitle: "Rental Receipt",
      issuedOn: "01 Nov 2026",
      paymentMode: "UPI",
      propertyName: "Sunrise PG",
      propertyAddress: "Kakiri Street, Whitefield, Bangalore - 560066",
      managerPhone: "+91 92066 51295",
      tenantName: "Ramesh Darisi",
      roomNumber: "203",
      bedCode: "Bed B",
      billingCycleDatesSetting: "1st to End of Month",
      joiningDate: "2026-11-01",
      billingMonth: "Nov 2026",
      rentAmount: 10000,
      parkingAmount: 500,
      parkingSlot: "2-Wheeler (Slot P-04)",
      paidAmount: 10500,
      status: "Paid",
    }
  },
  {
    id: "sample_tenant_scenario_2_with_prior_arrears",
    title: "Scenario 2: Monthly Rent with Prior Arrears Carried Forward",
    data: {
      scenario: "WITH_ARREARS",
      receiptNo: "2026-RNT-0155",
      receiptTitle: "Rental Receipt",
      issuedOn: "02 Nov 2026",
      paymentMode: "Bank Transfer / NEFT",
      propertyName: "Sunrise PG",
      propertyAddress: "Kakiri Street, Whitefield, Bangalore - 560066",
      managerPhone: "+91 92066 51295",
      tenantName: "Ramesh Darisi",
      roomNumber: "203",
      bedCode: "Bed B",
      billingCycleDatesSetting: "1st to End of Month",
      joiningDate: "2026-11-01",
      billingMonth: "Nov 2026",
      rentAmount: 10000,
      parkingAmount: 500,
      parkingSlot: "2-Wheeler (Slot P-04)",
      priorArrears: 1500,
      priorArrearsMonth: "Oct 2026",
      paidAmount: 12000,
      status: "Paid",
    }
  },
  {
    id: "sample_tenant_scenario_3_partial_payment",
    title: "Scenario 3: Partial Rent Payment (Balance Remaining)",
    data: {
      scenario: "PARTIAL_PAYMENT",
      receiptNo: "2026-RNT-0195",
      receiptTitle: "Rental Receipt",
      issuedOn: "01 Nov 2026",
      paymentMode: "UPI",
      propertyName: "Sunrise PG",
      propertyAddress: "Kakiri Street, Whitefield, Bangalore - 560066",
      managerPhone: "+91 92066 51295",
      tenantName: "Ramesh Darisi",
      roomNumber: "203",
      bedCode: "Bed B",
      billingCycleDatesSetting: "1st to End of Month",
      joiningDate: "2026-11-01",
      billingMonth: "Nov 2026",
      rentAmount: 10000,
      parkingAmount: 500,
      parkingSlot: "2-Wheeler (Slot P-04)",
      paidAmount: 6000,
      status: "Partially Paid",
    }
  },
  {
    id: "sample_tenant_scenario_4_onboarding_deposit",
    title: "Scenario 4: Security Deposit & Advance at Onboarding",
    data: {
      scenario: "ONBOARDING_DEPOSIT",
      receiptNo: "2026-DEP-0042",
      receiptTitle: "Security Deposit Receipt",
      issuedOn: "28 Oct 2026",
      paymentMode: "Bank Transfer / IMPS",
      propertyName: "Sunrise PG",
      propertyAddress: "Kakiri Street, Whitefield, Bangalore - 560066",
      managerPhone: "+91 92066 51295",
      tenantName: "Ramesh Darisi",
      roomNumber: "203",
      bedCode: "Bed B",
      billingCycleDatesSetting: "1st to End of Month",
      joiningDate: "2026-11-01",
      billingMonth: "Nov 2026",
      securityDeposit: 15000,
      rentAmount: 10000,
      paidAmount: 25000,
      status: "Deposit Received",
    }
  },
  {
    id: "sample_tenant_scenario_5_anniversary_cycle",
    title: "Scenario 5: Anniversary Date Cycle (Joining Date to Joining Date)",
    data: {
      scenario: "STANDARD_RENT",
      receiptNo: "2026-RNT-0204",
      receiptTitle: "Rental Receipt",
      issuedOn: "12 Nov 2026",
      paymentMode: "UPI",
      propertyName: "Sunrise PG",
      propertyAddress: "Kakiri Street, Whitefield, Bangalore - 560066",
      managerPhone: "+91 92066 51295",
      tenantName: "Ramesh Darisi",
      roomNumber: "203",
      bedCode: "Bed B",
      billingCycleDatesSetting: "Anniversary Date",
      joiningDate: "2026-08-12",
      billingMonth: "Nov 2026",
      rentAmount: 10000,
      parkingAmount: 500,
      parkingSlot: "2-Wheeler (Slot P-04)",
      paidAmount: 10500,
      status: "Paid",
    }
  }
];

async function generateAllSamples() {
  console.log("Launching Chromium via Playwright...");
  const browser = await chromium.launch({ headless: true });

  for (const sc of scenarios) {
    console.log(`Rendering ${sc.id}...`);
    const html = renderTenantReceiptHtml(sc.data);
    const page = await browser.newPage({
      viewport: { width: 900, height: 1200 },
      deviceScaleFactor: 2,
    });

    await page.setContent(html, { waitUntil: 'networkidle' });
    const sheetEl = await page.$('.page-sheet');

    const pngPath = path.join(ARTIFACTS_DIR, `${sc.id}.png`);
    await sheetEl.screenshot({ path: pngPath });
    console.log(`Saved PNG: ${pngPath}`);

    const pdfPath = path.join(ARTIFACTS_DIR, `${sc.id}.pdf`);
    await page.pdf({
      path: pdfPath,
      printBackground: true,
      format: 'A4',
      margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
    });
    console.log(`Saved PDF: ${pdfPath}`);

    await page.close();
  }

  await browser.close();
  console.log("All 5 updated tenant receipt samples generated successfully!");
}

generateAllSamples().catch(err => {
  console.error("Error generating samples:", err);
  process.exit(1);
});
