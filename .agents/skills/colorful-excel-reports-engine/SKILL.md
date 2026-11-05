---
name: colorful-excel-reports-engine
description: >
  Complete architectural blueprint, design standards, and implementation engine for generating
  gorgeous, executive, colorful Excel (.xlsx) workbooks and reports. Uses ExcelJS to apply
  curated color palettes, KPI summary scorecard banners, auto-fit columns, zebra striping,
  currency formatting, freeze panes, formulas, and multi-sheet financial architecture.
---

# Colorful Excel Reports Engine

A production-grade specification and toolkit for creating beautiful, colorful, presentation-ready Excel (`.xlsx`) workbooks and financial reports in **TenoPilot OS**.

---

## 1. Executive Color Harmony & Themes

Never generate plain, monochrome spreadsheets. Every report follows a cohesive, professional palette designed for executive legibility and visual hierarchy.

### Curated Color Palettes (ARGB Format)

| Theme Name | Primary Header (Fill / Font) | Accent / KPI | Zebra Alternating Fill | Status Highlights |
| :--- | :--- | :--- | :--- | :--- |
| **Terracotta Brand** *(Default)* | `FFC2652A` (White) | `FFFFEDD5` (Orange-100) | `FFFAFAF9` (Stone-50) | Green `FFDCFCE7` / Red `FFFEE2E2` |
| **Emerald Luxury** *(Revenue/Ledger)* | `FF065F46` (White) | `FFD1FAE5` (Emerald-100) | `FFF0FDF4` (Emerald-50) | Emerald `FF047857` / Mint `FFA7F3D0` |
| **Executive Slate** *(Compliance/Audit)* | `FF1E293B` (White) | `FFE2E8F0` (Slate-200) | `FFF8FAFC` (Slate-50) | Indigo `FF3730A3` / Cyan `FFE0F2FE` |
| **Royal Indigo** *(Partner/Investor)* | `FF312E81` (White) | `FFE0E7FF` (Indigo-100) | `FFF5F3FF` (Purple-50) | Violet `FF6D28D9` / Gold `FFFEF3C7` |

### Semantic Financial Status Colors
* **PAID / ACTIVE / COLLECTED**: Fill `FFDCFCE7` (Emerald-100), Font `FF166534` (Emerald-800, Bold).
* **REFUNDED / NOTICE / PARTIAL**: Fill `FFFFEDD5` (Orange-100), Font `FF9A3412` (Orange-800, Bold).
* **OVERDUE / PENDING / VOIDED**: Fill `FFFEE2E2` (Rose-100), Font `FF991B1B` (Rose-800, Bold).
* **ESCROW HELD**: Fill `FFE0E7FF` (Indigo-100), Font `FF3730A3` (Indigo-800, Bold).

---

## 2. Report Layout & Visual Hierarchy

Every worksheet must follow this standardized 5-tier anatomy:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 1: BRAND HERO BANNER (Rows 1-2, Merged A1:H2, Dark Brand Fill)   │
│ "TENOPILOT OS • SUNSHINE LUXURY PG — FINANCIAL AUDIT REPORT"           │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 2: METADATA CARDS (Rows 4-5, Subtle Gray Card Fills)              │
│ Timeline: Nov 2026 │ Generated: 05-Nov-2026 11:30 │ Admin: Suresh K    │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 3: EXECUTIVE KPI SCORECARDS (Rows 7-9, 4 Merged Scorecard Boxes)  │
│ [ Total Revenue ]  [ Deposits Held ]  [ Occupancy % ]  [ Pending Dues] │
│   ₹1,24,000            ₹8,40,000          98.2%           ₹15,000      │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 4: THEMED DATA TABLE (Row 11 Header, Rows 12+ Alternating Zebra)  │
│ Receipt # │ Date │ Resident │ Room │ Channel │ Mode │ Status │ Amount   │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 5: SUMMARY & FORMULA ROW (Bottom Row, Double Underline)           │
│ TOTAL COLLECTIONS (=SUM(H12:H65))                   ₹1,24,000          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ExcelJS Core Implementation Patterns

### A. Workbook Initialization & View Settings
Always enable gridlines and freeze the table header row so headers stay visible when scrolling:

```typescript
import ExcelJS from "exceljs";

export function createStyledWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TenoPilot OS Financial Engine";
  wb.lastModifiedBy = "TenoPilot OS";
  wb.created = new Date();
  wb.modified = new Date();
  return wb;
}

export function setupWorksheetView(ws: ExcelJS.Worksheet, freezeRowNumber: number) {
  ws.views = [
    {
      state: "frozen",
      xSplit: 0,
      ySplit: freezeRowNumber,
      activeCell: `A${freezeRowNumber + 1}`,
      showGridLines: true, // Crucial for crisp Excel appearance
    },
  ];
}
```

---

### B. Building the Hero Brand Banner (Tier 1)
```typescript
export function renderHeroBanner(
  ws: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  lastColLetter: string = "H",
  themeColorHex: string = "FFC2652A"
) {
  // Row 1: Main Title
  ws.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = ws.getCell("A1");
  titleCell.value = title.toUpperCase();
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: themeColorHex } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 30;

  // Row 2: Subtitle & Timestamp
  ws.mergeCells(`A2:${lastColLetter}2`);
  const subCell = ws.getCell("A2");
  subCell.value = subtitle;
  subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FFF3F4F6" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: themeColorHex } };
  subCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 20;

  // Blank spacer row
  ws.getRow(3).height = 10;
}
```

---

### C. Executive KPI Scorecard Cards (Tier 3)
Renders side-by-side metric boxes with bold numbers and light accent fills:

```typescript
export interface KpiCardConfig {
  label: string;
  value: string | number;
  subtext?: string;
  fillColorHex: string; // e.g. "FFD1FAE5" for emerald
  textColorHex: string; // e.g. "FF065F46"
}

export function renderKpiCardsRow(
  ws: ExcelJS.Worksheet,
  startRow: number,
  cards: KpiCardConfig[]
) {
  const colPairs = [
    { start: "A", end: "B" },
    { start: "C", end: "D" },
    { start: "E", end: "F" },
    { start: "G", end: "H" },
  ];

  cards.slice(0, 4).forEach((card, idx) => {
    const pair = colPairs[idx];
    const topRow = startRow;
    const valRow = startRow + 1;
    const subRow = startRow + 2;

    // Merge horizontally across 2 columns
    ws.mergeCells(`${pair.start}${topRow}:${pair.end}${topRow}`);
    ws.mergeCells(`${pair.start}${valRow}:${pair.end}${valRow}`);
    ws.mergeCells(`${pair.start}${subRow}:${pair.end}${subRow}`);

    const lblCell = ws.getCell(`${pair.start}${topRow}`);
    lblCell.value = card.label.toUpperCase();
    lblCell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF6B7280" } };
    lblCell.alignment = { horizontal: "center", vertical: "middle" };

    const valCell = ws.getCell(`${pair.start}${valRow}`);
    valCell.value = card.value;
    valCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: card.textColorHex } };
    valCell.alignment = { horizontal: "center", vertical: "middle" };

    const subCell = ws.getCell(`${pair.start}${subRow}`);
    subCell.value = card.subtext || "";
    subCell.font = { name: "Segoe UI", size: 8, italic: true, color: { argb: "FF9CA3AF" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };

    // Fill & Border for the whole card block
    for (let r = topRow; r <= subRow; r++) {
      for (const col of [pair.start, pair.end]) {
        const c = ws.getCell(`${col}${r}`);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: card.fillColorHex } };
        c.border = {
          top: { style: r === topRow ? "thin" : undefined, color: { argb: "FFD1D5DB" } },
          bottom: { style: r === subRow ? "thin" : undefined, color: { argb: "FFD1D5DB" } },
          left: { style: col === pair.start ? "thin" : undefined, color: { argb: "FFD1D5DB" } },
          right: { style: col === pair.end ? "thin" : undefined, color: { argb: "FFD1D5DB" } },
        };
      }
    }
  });

  ws.getRow(startRow).height = 18;
  ws.getRow(startRow + 1).height = 26;
  ws.getRow(startRow + 2).height = 16;
  ws.getRow(startRow + 3).height = 12; // spacer
}
```

---

### D. Table Header & Zebra Striped Data Rows (Tier 4)
```typescript
export interface TableColumnDef {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
  isCurrency?: boolean;
  isDate?: boolean;
}

export function renderStyledTable(
  ws: ExcelJS.Worksheet,
  headerRowIdx: number,
  columns: TableColumnDef[],
  rowsData: any[],
  headerFillHex: string = "FF1E293B"
) {
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.height = 26;

  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerFillHex } };
    cell.alignment = { vertical: "middle", horizontal: col.align || "left" };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      top: { style: "thin", color: { argb: "FF334155" } },
    };
  });

  // Enable Auto-Filters on Header
  const lastColLetter = String.fromCharCode(65 + columns.length - 1);
  ws.autoFilter = {
    from: `A${headerRowIdx}`,
    to: `${lastColLetter}${headerRowIdx}`,
  };

  // Render Data Rows with Zebra Striping
  rowsData.forEach((rowObj, rIdx) => {
    const curRowIdx = headerRowIdx + 1 + rIdx;
    const curRow = ws.getRow(curRowIdx);
    curRow.height = 20;

    const isEven = rIdx % 2 === 0;
    const rowBgHex = isEven ? "FFFFFFFF" : "FFF8FAFC"; // Subtle zebra stripe

    columns.forEach((col, cIdx) => {
      const cell = curRow.getCell(cIdx + 1);
      const val = rowObj[col.key];

      cell.value = val;
      cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF1F2937" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgHex } };
      cell.alignment = { vertical: "middle", horizontal: col.align || "left" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFF3F4F6" } },
      };

      // Currency Formatting (Indian Rupee)
      if (col.isCurrency && typeof val === "number") {
        cell.numFmt = "₹#,##0";
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF047857" } };
      }

      // Semantic Status Badging
      if (col.key === "status" && typeof val === "string") {
        const uVal = val.toUpperCase();
        if (uVal.includes("PAID") || uVal.includes("ACTIVE") || uVal.includes("COLLECTED")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF166534" } };
        } else if (uVal.includes("REFUND") || uVal.includes("NOTICE")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEDD5" } };
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF9A3412" } };
        } else if (uVal.includes("OVERDUE") || uVal.includes("VOID")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF991B1B" } };
        }
      }
    });
  });

  return headerRowIdx + rowsData.length;
}
```

---

### E. Total Summary Row with Dynamic Excel Formulas (Tier 5)
```typescript
export function renderTotalRow(
  ws: ExcelJS.Worksheet,
  totalRowIdx: number,
  startDataRow: number,
  endDataRow: number,
  columns: TableColumnDef[]
) {
  const row = ws.getRow(totalRowIdx);
  row.height = 24;

  columns.forEach((col, idx) => {
    const colLetter = String.fromCharCode(65 + idx);
    const cell = row.getCell(idx + 1);

    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "double", color: { argb: "FF0F172A" } }, // Executive accounting double underline
    };

    if (idx === 0) {
      cell.value = "TOTAL / SUMMARY";
    } else if (col.isCurrency) {
      // Dynamic Excel Formula
      cell.value = { formula: `SUM(${colLetter}${startDataRow}:${colLetter}${endDataRow})` };
      cell.numFmt = "₹#,##0";
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  });
}
```

---

### F. Auto-Fit Column Widths Algorithm
Ensures no text or numbers are clipped with `###`:

```typescript
export function autoFitColumnWidths(ws: ExcelJS.Worksheet, minWidth: number = 14) {
  ws.columns.forEach((column) => {
    let maxLen = minWidth;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const valStr = cell.value ? cell.value.toString() : "";
      if (valStr.length > maxLen && !cell.isMerged) {
        maxLen = Math.min(valStr.length + 3, 40); // Cap at 40 chars max
      }
    });
    column.width = maxLen;
  });
}
```

---

## 4. Multi-Sheet Architectural Standard

For comprehensive monthly or audit reports, construct a multi-sheet workbook:
1. **Sheet 1: `Executive Summary`**: High-level KPIs, monthly revenues, total deposits escrow, top expense breakdown, and occupancy scorecard.
2. **Sheet 2: `Rent Collections`**: Granular resident rent payment ledger with receipts, modes, accounts, and dates.
3. **Sheet 3: `Security Deposits`**: Deposit transactions (collections & refunds) and escrow balances.
4. **Sheet 4: `Operational Expenses`**: Categorized expense items with VAT/GST, payment modes, and partner equity contributions.

---

## 5. Client-Side Browser Download Helper

```typescript
export async function downloadWorkbookInBrowser(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```
