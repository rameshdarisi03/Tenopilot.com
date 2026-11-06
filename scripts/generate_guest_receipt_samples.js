const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ARTIFACTS_DIR = 'C:/Users/rameshdarisi/.gemini/antigravity/brain/f8a16fb5-5d82-40e5-b086-de72e493532f';
const LOGO_SRC = path.join(__dirname, '..', 'public', 'tenopilot_star_mark.jpg');
const logoBase64 = fs.existsSync(LOGO_SRC)
  ? `data:image/jpeg;base64,${fs.readFileSync(LOGO_SRC).toString('base64')}`
  : '';

function getPgNameFontSize(name) {
  if (!name) return '23px';
  const len = name.length;
  if (len <= 18) return '23px';
  if (len <= 26) return '19px';
  if (len <= 38) return '16.5px';
  return '14.5px';
}

function formatSmartAddress(address) {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return `<span>${address}</span>`;
  }
  if (parts.length === 2) {
    return `<span>${parts[0]},</span><br/><span>${parts[1]}</span>`;
  }
  if (parts.length === 3) {
    return `<span>${parts[0]}, ${parts[1]},</span><br/><span>${parts[2]}</span>`;
  }
  const mid = Math.ceil(parts.length / 2);
  const line1 = parts.slice(0, mid).join(', ') + ',';
  const line2 = parts.slice(mid).join(', ');
  return `<span>${line1}</span><br/><span>${line2}</span>`;
}

function renderReceiptHtml(data) {
  const {
    scenario, // "FULL_ONBOARD" | "PARTIAL_ADVANCE" | "CHECKOUT_SETTLED"
    receiptNo,
    issuedOn,
    paymentMode,
    purpose,
    propertyName,
    propertyAddress,
    managerPhone,
    guestName,
    guestMobile,
    checkInDate,
    checkOutDate,
    roomDisplay,
    numberOfDays,
    dailyRate,
    totalStayAmount,
    initialPayment,
    initialPaymentDate,
    finalPayment,
    finalPaymentDate,
    balanceDue,
    additionalCharges = [], // Array of { description, qty, rate, amount }
  } = data;

  const totalCharges = Number(totalStayAmount) + additionalCharges.reduce((acc, c) => acc + Number(c.amount || 0), 0);
  const hasAdditionalCharges = additionalCharges.length > 0;

  let purposeBadge = purpose || "Short Stay";
  let statusBadgeText = "PAID (Full)";
  let statusBadgeClass = "bg-[#dcfce7] text-[#15803d] border-[#86efac]";
  let summaryText1 = "";
  let summaryText2 = "";
  let pillSubtitle = "Short Stay / Day Stay";

  if (scenario === "PARTIAL_ADVANCE") {
    statusBadgeText = "PARTIALLY PAID";
    statusBadgeClass = "bg-[#dcfce7] text-[#15803d] border-[#86efac]";
    summaryText1 = `Advance of ₹${Number(initialPayment).toLocaleString("en-IN")} received for the stay from ${checkInDate} to ${checkOutDate} (${numberOfDays} Days).`;
    summaryText2 = `Remaining balance of ₹${Number(balanceDue).toLocaleString("en-IN")} is due at or before check-out.`;
    pillSubtitle = "Short Stay / Day Stay";
  } else if (scenario === "CHECKOUT_SETTLED") {
    statusBadgeText = "PAID (Settled)";
    statusBadgeClass = "bg-[#dcfce7] text-[#15803d] border-[#86efac]";
    summaryText1 = "The stay has been fully settled.";
    summaryText2 = `Total amount of ₹${Number(totalCharges).toLocaleString("en-IN")} received for the stay from ${checkInDate} to ${checkOutDate} (${numberOfDays} Days).`;
    pillSubtitle = "Final Settlement";
  } else {
    // FULL_ONBOARD
    statusBadgeText = "PAID (Full)";
    statusBadgeClass = "bg-[#dcfce7] text-[#15803d] border-[#86efac]";
    summaryText1 = "The stay has been fully paid upfront.";
    summaryText2 = `Full amount of ₹${Number(totalCharges).toLocaleString("en-IN")} received for the stay from ${checkInDate} to ${checkOutDate} (${numberOfDays} Days). Zero balance remaining.`;
    pillSubtitle = "Short Stay / Day Stay";
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Stay Receipt - ${receiptNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

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
      background: #ffffff;
      position: relative;
      overflow: hidden;
      padding: 46px 52px 42px 52px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Soft modern corner waves matching the user's PDF */
    .top-right-wave {
      position: absolute;
      top: 0;
      right: 0;
      width: 230px;
      height: 145px;
      background: radial-gradient(circle at 100% 0%, #c4b5fd 0%, #ddd6fe 45%, #ede9fe 70%, transparent 100%);
      opacity: 0.65;
      pointer-events: none;
      clip-path: polygon(100% 0, 0 0, 100% 100%);
    }

    .bottom-left-wave {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 245px;
      height: 135px;
      background: radial-gradient(circle at 0% 100%, #c4b5fd 0%, #ddd6fe 45%, #ede9fe 70%, transparent 100%);
      opacity: 0.55;
      pointer-events: none;
      clip-path: polygon(0 100%, 0 0, 100% 100%);
    }

    /* Top Header Bar: PG Hero on Left, STAY RECEIPT on Right */
    .header-bar {
      display: grid;
      grid-template-columns: 1fr 270px;
      gap: 20px;
      align-items: flex-start;
      margin-bottom: 26px;
      position: relative;
      z-index: 2;
      padding-bottom: 18px;
      border-bottom: 1px solid #f1f5f9;
    }

    .pg-brand-container {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      max-width: 410px;
    }

    .pg-avatar-box {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(109, 40, 217, 0.22);
      margin-top: 2px;
    }

    .pg-avatar-box svg {
      width: 24px;
      height: 24px;
    }

    .pg-info-block {
      display: flex;
      flex-direction: column;
      max-width: 350px;
    }

    .pg-name-hero {
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.4px;
      line-height: 1.25;
      margin-bottom: 6px;
      word-break: break-word;
    }

    .pg-address-block {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 11px;
      color: #64748b;
      line-height: 1.45;
      margin-bottom: 5px;
    }

    .pg-address-block svg {
      width: 13px;
      height: 13px;
      color: #7c3aed;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .pg-address-text {
      line-height: 1.45;
      color: #64748b;
    }

    .pg-phone-block {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #475569;
      font-weight: 600;
      line-height: 1.4;
    }

    .pg-phone-block svg {
      width: 12px;
      height: 12px;
      color: #7c3aed;
      flex-shrink: 0;
    }

    .title-meta-container {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      width: 270px;
    }

    .main-title {
      font-size: 22px;
      font-weight: 800;
      color: #4338ca;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .title-pill {
      display: inline-block;
      padding: 3px 12px;
      background-color: #ede9fe;
      color: #5b21b6;
      font-size: 10.5px;
      font-weight: 700;
      border-radius: 9999px;
      letter-spacing: 0.3px;
      margin-bottom: 12px;
    }

    .receipt-meta-table {
      font-size: 11.5px;
      width: 100%;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      gap: 16px;
    }

    .meta-label {
      color: #64748b;
      font-weight: 600;
    }

    .meta-value {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }

    .purpose-badge {
      display: inline-block;
      padding: 3px 10px;
      background-color: #ede9fe;
      color: #5b21b6;
      font-size: 10.5px;
      font-weight: 700;
      border-radius: 6px;
    }

    /* Dual Cards: Guest Details & Stay Details */
    .cards-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 22px;
      position: relative;
      z-index: 2;
    }

    .card-box {
      border: 1px solid #ede9fe;
      border-radius: 12px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    .card-header {
      background: #f5f3ff;
      border-bottom: 1px solid #ede9fe;
      padding: 7px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #5b21b6;
      font-size: 12px;
      font-weight: 700;
    }

    .card-header svg {
      width: 15px;
      height: 15px;
      color: #7c3aed;
    }

    .card-body {
      padding: 12px 14px;
      font-size: 11.5px;
    }

    .card-item {
      display: flex;
      margin-bottom: 6px;
      align-items: baseline;
    }

    .card-item:last-child {
      margin-bottom: 0;
    }

    .card-item-label {
      width: 82px;
      color: #64748b;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .card-item-label svg {
      width: 13px;
      height: 13px;
      color: #94a3b8;
    }

    .card-item-colon {
      margin-right: 8px;
      color: #94a3b8;
    }

    .card-item-value {
      font-weight: 700;
      color: #0f172a;
    }

    /* Itemized Breakdown Table */
    .table-container {
      margin-bottom: 20px;
      border: 1px solid #ede9fe;
      border-radius: 10px;
      overflow: hidden;
      position: relative;
      z-index: 2;
    }

    .styled-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .styled-table thead tr {
      background-color: #f5f3ff;
      border-bottom: 1px solid #ede9fe;
    }

    .styled-table th {
      padding: 9px 16px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: #5b21b6;
      letter-spacing: 0.3px;
    }

    .styled-table th:last-child,
    .styled-table td:last-child {
      text-align: right;
    }

    .styled-table tbody tr.item-row {
      border-bottom: 1px solid #f1f5f9;
      background-color: #ffffff;
    }

    .styled-table tbody tr.item-row td {
      padding: 11px 16px;
      color: #0f172a;
      font-weight: 600;
    }

    .styled-table tbody tr.ledger-row td {
      padding: 8px 16px;
      color: #334155;
      font-size: 11.5px;
    }

    .styled-table tbody tr.total-row {
      background-color: #f5f3ff;
      border-top: 1px solid #ddd6fe;
      border-bottom: 1px solid #ddd6fe;
    }

    .styled-table tbody tr.total-row td {
      padding: 11px 16px;
      font-size: 13px;
      font-weight: 800;
      color: #4c1d95;
    }

    /* Status Pill & Summary Row */
    .summary-box {
      display: grid;
      grid-template-columns: 210px 1fr;
      gap: 18px;
      align-items: center;
      padding: 12px 14px;
      background: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: 12px;
      margin-bottom: 24px;
      position: relative;
      z-index: 2;
    }

    .status-badge-container {
      display: flex;
      align-items: center;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 18px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.3px;
      border: 1px solid;
    }

    .status-icon-circle {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #16a34a;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 900;
    }

    .summary-notes {
      border-left: 1px solid #e2e8f0;
      padding-left: 16px;
      font-size: 11px;
      line-height: 1.55;
      color: #334155;
    }

    .summary-notes p:first-child {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }

    /* Footer Section */
    .footer-divider {
      border-top: 1px solid #e2e8f0;
      margin-bottom: 14px;
      position: relative;
      z-index: 2;
    }

    .footer-row {
      display: grid;
      grid-template-columns: 1fr 220px;
      gap: 20px;
      align-items: center;
      font-size: 10px;
      color: #64748b;
      position: relative;
      z-index: 2;
    }

    .footer-disclaimer {
      display: flex;
      align-items: center;
      gap: 8px;
      line-height: 1.45;
    }

    .footer-disclaimer svg {
      width: 16px;
      height: 16px;
      color: #64748b;
      flex-shrink: 0;
    }

    .footer-branding {
      text-align: right;
      border-left: 1px solid #e2e8f0;
      padding-left: 14px;
    }

    .powered-by-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 5px;
      margin-bottom: 2px;
    }

    .powered-logo-mark {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      object-fit: cover;
    }

    .powered-logo-text {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }

    .powered-logo-text span {
      color: #7c3aed;
    }

    .platform-text {
      font-size: 9.5px;
      color: #475569;
    }

    .platform-url {
      font-size: 9.5px;
      color: #7c3aed;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="page-sheet">
    <!-- Top-Right & Bottom-Left Decorative Waves -->
    <div class="top-right-wave"></div>
    <div class="bottom-left-wave"></div>

    <div class="top-content-area">
      <!-- 1. Unified Executive Header: PG Hero on Left, STAY RECEIPT & Meta on Right -->
      <div class="header-bar">
        <div class="pg-brand-container">
          <div class="pg-avatar-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <line x1="9" y1="22" x2="9" y2="22.01"></line>
              <line x1="15" y1="22" x2="15" y2="22.01"></line>
              <line x1="9" y1="6" x2="9" y2="6.01"></line>
              <line x1="15" y1="6" x2="15" y2="6.01"></line>
              <line x1="9" y1="10" x2="9" y2="10.01"></line>
              <line x1="15" y1="10" x2="15" y2="10.01"></line>
              <line x1="9" y1="14" x2="9" y2="14.01"></line>
              <line x1="15" y1="14" x2="15" y2="14.01"></line>
              <line x1="9" y1="18" x2="9" y2="18.01"></line>
              <line x1="15" y1="18" x2="15" y2="18.01"></line>
            </svg>
          </div>
          <div class="pg-info-block">
            <div class="pg-name-hero" style="font-size: ${getPgNameFontSize(propertyName)}">${propertyName}</div>
            <div class="pg-address-block">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <div class="pg-address-text">${formatSmartAddress(propertyAddress)}</div>
            </div>
            <div class="pg-phone-block">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              <span>${managerPhone}</span>
            </div>
          </div>
        </div>

        <div class="title-meta-container">
          <div class="main-title">STAY RECEIPT</div>
          <div class="title-pill">${pillSubtitle}</div>
          <div class="receipt-meta-table">
            <div class="meta-row">
              <span class="meta-label">Receipt No.</span>
              <span class="meta-value font-mono">${receiptNo}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Issued On</span>
              <span class="meta-value">${issuedOn}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Payment Mode</span>
              <span class="meta-value">${paymentMode}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Purpose</span>
              <span class="purpose-badge">${purposeBadge}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Dual Cards: Guest Details (Left) + Stay Details (Right) -->
      <div class="cards-row">
        <!-- Guest Details Card -->
        <div class="card-box">
          <div class="card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Guest Details</span>
          </div>
          <div class="card-body">
            <div class="card-item">
              <span class="card-item-label">Name</span>
              <span class="card-item-colon">:</span>
              <span class="card-item-value">${guestName}</span>
            </div>
            <div class="card-item">
              <span class="card-item-label">Mobile</span>
              <span class="card-item-colon">:</span>
              <span class="card-item-value font-mono">${guestMobile}</span>
            </div>
          </div>
        </div>

        <!-- Stay Details Card -->
        <div class="card-box">
          <div class="card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Stay Details</span>
          </div>
          <div class="card-body">
            <div class="card-item">
              <span class="card-item-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>
                Check-in
              </span>
              <span class="card-item-colon">:</span>
              <span class="card-item-value">${checkInDate}</span>
            </div>
            <div class="card-item">
              <span class="card-item-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>
                Check-out
              </span>
              <span class="card-item-colon">:</span>
              <span class="card-item-value">${checkOutDate}</span>
            </div>
            <div class="card-item">
              <span class="card-item-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
                Room
              </span>
              <span class="card-item-colon">:</span>
              <span class="card-item-value">${roomDisplay}</span>
            </div>
            <div class="card-item">
              <span class="card-item-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                No. of Days
              </span>
              <span class="card-item-colon">:</span>
              <span class="card-item-value">${numberOfDays} Days</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Harmonized Itemized Charges & Ledger Table -->
      <div class="table-container">
        <table class="styled-table">
          <thead>
            <tr>
              <th style="width: 44%;">Description</th>
              <th style="width: 18%; text-align: center;">Qty / Days</th>
              <th style="width: 18%; text-align: right;">Rate (per Day)</th>
              <th style="width: 20%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr class="item-row">
              <td>Room Stay (${roomDisplay.includes("(") ? roomDisplay.split("(")[1].replace(")", "") : "Standard"})</td>
              <td style="text-align: center;">${numberOfDays} Days</td>
              <td style="text-align: right;">₹${Number(dailyRate).toLocaleString("en-IN")}</td>
              <td>₹${Number(totalStayAmount).toLocaleString("en-IN")}</td>
            </tr>

            ${additionalCharges.map(charge => `
            <tr class="item-row">
              <td>${charge.description}</td>
              <td style="text-align: center;">${charge.qty || '1'}</td>
              <td style="text-align: right;">${charge.rate ? `₹${Number(charge.rate).toLocaleString("en-IN")}` : '-'}</td>
              <td>₹${Number(charge.amount).toLocaleString("en-IN")}</td>
            </tr>
            `).join('')}

            ${hasAdditionalCharges ? `
            <tr class="subtotal-row" style="background-color: #faf5ff; font-weight: 700; border-top: 1px solid #ddd6fe; border-bottom: 2px solid #ddd6fe;">
              <td colspan="3" style="padding: 9px 16px; color: #5b21b6;">Total Bill Amount</td>
              <td style="padding: 9px 16px; text-align: right; color: #5b21b6; font-size: 13px;">₹${Number(totalCharges).toLocaleString("en-IN")}</td>
            </tr>
            ` : ''}

            ${scenario === "FULL_ONBOARD" ? `
            <tr class="ledger-row">
              <td colspan="3">Payment Received on ${issuedOn}</td>
              <td>₹${Number(totalCharges).toLocaleString("en-IN")}</td>
            </tr>
            <tr class="ledger-row">
              <td colspan="3">Balance Due</td>
              <td>₹0</td>
            </tr>
            <tr class="total-row">
              <td colspan="3">Total Paid (Settled)</td>
              <td>₹${Number(totalCharges).toLocaleString("en-IN")}</td>
            </tr>
            ` : scenario === "PARTIAL_ADVANCE" ? `
            <tr class="ledger-row">
              <td colspan="3">Payment Received on ${issuedOn}</td>
              <td>₹${Number(initialPayment).toLocaleString("en-IN")}</td>
            </tr>
            <tr class="ledger-row" style="color: #b91c1c; font-weight: 700;">
              <td colspan="3">Balance Due</td>
              <td>₹${Number(balanceDue).toLocaleString("en-IN")}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3">Total Paid</td>
              <td>₹${Number(initialPayment).toLocaleString("en-IN")}</td>
            </tr>
            ` : `
            <!-- CHECKOUT_SETTLED -->
            <tr class="ledger-row">
              <td colspan="3">Payment Received on ${initialPaymentDate || checkInDate}</td>
              <td>₹${Number(initialPayment).toLocaleString("en-IN")}</td>
            </tr>
            <tr class="ledger-row">
              <td colspan="3">Final Payment Received on ${finalPaymentDate || checkOutDate}</td>
              <td>₹${Number(finalPayment).toLocaleString("en-IN")}</td>
            </tr>
            <tr class="ledger-row">
              <td colspan="3">Balance Due</td>
              <td>₹0</td>
            </tr>
            <tr class="total-row">
              <td colspan="3">Total Paid (Settled)</td>
              <td>₹${Number(totalCharges).toLocaleString("en-IN")}</td>
            </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- 5. Status Pill & Plain-English Notes -->
      <div class="summary-box">
        <div class="status-badge-container">
          <div class="status-pill ${statusBadgeClass}">
            <div class="status-icon-circle">✓</div>
            <span>${statusBadgeText}</span>
          </div>
        </div>
        <div class="summary-notes">
          <p>${summaryText1}</p>
          <p>${summaryText2}</p>
        </div>
      </div>
    </div>

    <!-- 6. Bottom Computer-Generated Disclaimer & Powered By Footer -->
    <div>
      <div class="footer-divider"></div>
      <div class="footer-row">
        <div class="footer-disclaimer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>This is a computer-generated receipt for short stay accommodation and is valid without a physical signature.</span>
        </div>
        <div class="footer-branding">
          <div class="powered-by-row">
            <span style="font-size: 10px; color: #64748b;">Powered by</span>
            ${logoBase64 ? `<img src="${logoBase64}" alt="TenoPilot" class="powered-logo-mark" />` : ''}
            <span class="powered-logo-text">Tenopilot<span>.com</span></span>
          </div>
          <div class="platform-text">PG Management Platform</div>
          <div class="platform-url">www.tenopilot.com</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// 3 Test Datasets matching user's exact uploaded PDFs
const samples = [
  {
    filenamePrefix: 'sample_guest_scenario_1_full_payment',
    title: 'Scenario 1: Fully Paid at Onboarding',
    data: {
      scenario: 'FULL_ONBOARD',
      receiptNo: 'ST-2026-00512',
      issuedOn: '03 Nov 2026',
      paymentMode: 'UPI',
      purpose: 'Short Stay',
      propertyName: 'Sunrise PG',
      propertyAddress: '#12-3-45, Hitech City Road, Madhapur, Hyderabad - 500081',
      managerPhone: '+91 98765 43210',
      guestName: 'Arun Kumar',
      guestMobile: '+91 91234 56789',
      checkInDate: '03 Nov 2026',
      checkOutDate: '07 Nov 2026',
      roomDisplay: 'Room 204 (Non-AC)',
      numberOfDays: 4,
      dailyRate: 700,
      totalStayAmount: 2800,
      initialPayment: 2800,
      balanceDue: 0,
    }
  },
  {
    filenamePrefix: 'sample_guest_scenario_2_partial_advance',
    title: 'Scenario 2: Partially Paid at Onboarding',
    data: {
      scenario: 'PARTIAL_ADVANCE',
      receiptNo: 'ST-2026-00521',
      issuedOn: '03 Nov 2026',
      paymentMode: 'UPI',
      purpose: 'Short Stay',
      propertyName: 'Sunrise PG',
      propertyAddress: '#12-3-45, Hitech City Road, Madhapur, Hyderabad - 500081',
      managerPhone: '+91 98765 43210',
      guestName: 'Arun Kumar',
      guestMobile: '+91 91234 56789',
      checkInDate: '03 Nov 2026',
      checkOutDate: '07 Nov 2026',
      roomDisplay: 'Room 204 (Non-AC)',
      numberOfDays: 4,
      dailyRate: 700,
      totalStayAmount: 2800,
      initialPayment: 1400,
      balanceDue: 1400,
    }
  },
  {
    filenamePrefix: 'sample_guest_scenario_3_final_settlement',
    title: 'Scenario 3: Final Settlement at Checkout (Zero Dues)',
    data: {
      scenario: 'CHECKOUT_SETTLED',
      receiptNo: 'ST-2026-00528',
      issuedOn: '07 Nov 2026',
      paymentMode: 'UPI',
      purpose: 'Short Stay - Final Settlement',
      propertyName: 'Sunrise PG',
      propertyAddress: '#12-3-45, Hitech City Road, Madhapur, Hyderabad - 500081',
      managerPhone: '+91 98765 43210',
      guestName: 'Arun Kumar',
      guestMobile: '+91 91234 56789',
      checkInDate: '03 Nov 2026',
      checkOutDate: '07 Nov 2026',
      roomDisplay: 'Room 204 (Non-AC)',
      numberOfDays: 4,
      dailyRate: 700,
      totalStayAmount: 2800,
      initialPayment: 1400,
      initialPaymentDate: '03 Nov 2026',
      finalPayment: 1400,
      finalPaymentDate: '07 Nov 2026',
      balanceDue: 0,
    }
  },
  {
    filenamePrefix: 'sample_guest_scenario_4_lengthy_pg_name_and_address',
    title: 'Scenario 4: Lengthy PG Name & Multi-Line Address Test',
    data: {
      scenario: 'CHECKOUT_SETTLED',
      receiptNo: 'ST-2026-00892',
      issuedOn: '07 Nov 2026',
      paymentMode: 'UPI',
      purpose: 'Short Stay - Final Settlement',
      propertyName: 'Sri Venkateswara Luxury Executive PG & Coliving',
      propertyAddress: 'Plot No. 42 & 43, 3rd Floor, Silicon Valley Layout, Near Mindspace IT Park, Madhapur, Hyderabad - 500081',
      managerPhone: '+91 98765 43210',
      guestName: 'Arun Kumar',
      guestMobile: '+91 91234 56789',
      checkInDate: '03 Nov 2026',
      checkOutDate: '07 Nov 2026',
      roomDisplay: 'Room 302 (Executive AC)',
      numberOfDays: 4,
      dailyRate: 950,
      totalStayAmount: 3800,
      initialPayment: 1900,
      initialPaymentDate: '03 Nov 2026',
      finalPayment: 1900,
      finalPaymentDate: '07 Nov 2026',
      balanceDue: 0,
    }
  },
  {
    filenamePrefix: 'sample_guest_scenario_5_with_additional_charges',
    title: 'Scenario 5: Stay with Additional Charges (Extensible Line Items)',
    data: {
      scenario: 'CHECKOUT_SETTLED',
      receiptNo: 'ST-2026-00915',
      issuedOn: '07 Nov 2026',
      paymentMode: 'UPI',
      purpose: 'Short Stay - Final Settlement',
      propertyName: 'Sunrise PG',
      propertyAddress: '#12-3-45, Hitech City Road, Madhapur, Hyderabad - 500081',
      managerPhone: '+91 98765 43210',
      guestName: 'Arun Kumar',
      guestMobile: '+91 91234 56789',
      checkInDate: '03 Nov 2026',
      checkOutDate: '07 Nov 2026',
      roomDisplay: 'Room 204 (Non-AC)',
      numberOfDays: 4,
      dailyRate: 700,
      totalStayAmount: 2800,
      additionalCharges: [
        { description: 'Late Checkout Charges (Half Day)', qty: '1', rate: 350, amount: 350 },
        { description: 'Extra Mattress / Linen', qty: '1', rate: 200, amount: 200 },
      ],
      initialPayment: 1400,
      initialPaymentDate: '03 Nov 2026',
      finalPayment: 1950,
      finalPaymentDate: '07 Nov 2026',
      balanceDue: 0,
    }
  }
];

async function run() {
  console.log('Launching browser with official logo mark...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 850, height: 1200 },
    deviceScaleFactor: 2, // 2x Retina quality for crisp image export
  });

  for (const sample of samples) {
    console.log(`Generating ${sample.title}...`);
    const page = await context.newPage();
    const html = renderReceiptHtml(sample.data);

    await page.setContent(html, { waitUntil: 'networkidle' });

    // 1. Generate High-Res PNG Image in Artifacts directory
    const imagePath = path.join(ARTIFACTS_DIR, `${sample.filenamePrefix}.png`);
    const sheetHandle = await page.$('.page-sheet');
    if (sheetHandle) {
      await sheetHandle.screenshot({ path: imagePath, type: 'png' });
    } else {
      await page.screenshot({ path: imagePath, fullPage: true });
    }
    console.log(`Saved screenshot to ${imagePath}`);

    // 2. Generate crisp Vector PDF
    const pdfPath = path.join(ARTIFACTS_DIR, `${sample.filenamePrefix}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });
    console.log(`Saved PDF to ${pdfPath}`);

    await page.close();
  }

  await browser.close();
  console.log('All 3 updated scenarios generated successfully with official logo mark!');
}

run().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
