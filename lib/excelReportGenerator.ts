import ExcelJS from "exceljs";

export interface KpiCardConfig {
  label: string;
  value: string | number;
  subtext?: string;
  fillColorHex: string; // ARGB format, e.g. "FFD1FAE5" for emerald-100
  textColorHex: string; // ARGB format, e.g. "FF065F46" for emerald-800
}

export interface TableColumnDef {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
  isCurrency?: boolean;
  isDate?: boolean;
}

/**
 * Initialize a presentation-ready Excel workbook with metadata
 */
export function createStyledWorkbook(creator: string = "TenoPilot OS Financial Engine"): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = creator;
  wb.lastModifiedBy = creator;
  wb.created = new Date();
  wb.modified = new Date();
  return wb;
}

/**
 * Freeze table headers and ensure crisp gridlines are visible
 */
export function setupWorksheetView(ws: ExcelJS.Worksheet, freezeRowNumber: number = 10): void {
  ws.views = [
    {
      state: "frozen",
      xSplit: 0,
      ySplit: freezeRowNumber,
      activeCell: `A${freezeRowNumber + 1}`,
      showGridLines: true,
    },
  ];
}

/**
 * Tier 1: Top Hero Brand Header Banner
 */
export function renderHeroBanner(
  ws: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  lastColLetter: string = "H",
  themeColorHex: string = "FFC2652A"
): void {
  // Row 1: Main Title
  ws.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = ws.getCell("A1");
  titleCell.value = title.toUpperCase();
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: themeColorHex } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 30;

  // Row 2: Subtitle & Metadata
  ws.mergeCells(`A2:${lastColLetter}2`);
  const subCell = ws.getCell("A2");
  subCell.value = subtitle;
  subCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FFF3F4F6" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: themeColorHex } };
  subCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 20;

  // Blank spacer row
  ws.getRow(3).height = 8;
}

/**
 * Tier 2: Metadata Info Bar (Timeline, Generated Date, Property Desk)
 */
export function renderMetadataCards(
  ws: ExcelJS.Worksheet,
  metadataItems: { label: string; value: string }[],
  rowIdx: number = 4
): void {
  const row = ws.getRow(rowIdx);
  row.height = 20;

  metadataItems.slice(0, 4).forEach((item, idx) => {
    const colIdx = idx * 2 + 1;
    const colLetter1 = String.fromCharCode(65 + colIdx - 1);
    const colLetter2 = String.fromCharCode(65 + colIdx);

    ws.mergeCells(`${colLetter1}${rowIdx}:${colLetter2}${rowIdx}`);
    const cell = ws.getCell(`${colLetter1}${rowIdx}`);
    cell.value = `${item.label}: ${item.value}`;
    cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF475569" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  });

  // Spacer row
  ws.getRow(rowIdx + 1).height = 8;
}

/**
 * Tier 3: Executive KPI Scorecards
 */
export function renderKpiCardsRow(
  ws: ExcelJS.Worksheet,
  startRow: number,
  cards: KpiCardConfig[]
): void {
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

    for (let r = topRow; r <= subRow; r++) {
      for (const col of [pair.start, pair.end]) {
        const c = ws.getCell(`${col}${r}`);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: card.fillColorHex } };
        c.border = {
          top: { style: r === topRow ? "thin" : undefined, color: { argb: "FFCBD5E1" } },
          bottom: { style: r === subRow ? "thin" : undefined, color: { argb: "FFCBD5E1" } },
          left: { style: col === pair.start ? "thin" : undefined, color: { argb: "FFCBD5E1" } },
          right: { style: col === pair.end ? "thin" : undefined, color: { argb: "FFCBD5E1" } },
        };
      }
    }
  });

  ws.getRow(startRow).height = 18;
  ws.getRow(startRow + 1).height = 28;
  ws.getRow(startRow + 2).height = 16;
  ws.getRow(startRow + 3).height = 10; // spacer
}

/**
 * Tier 4: Themed Data Table with Zebra Striping and Status Pills
 */
export function renderStyledTable(
  ws: ExcelJS.Worksheet,
  headerRowIdx: number,
  columns: TableColumnDef[],
  rowsData: Record<string, any>[],
  headerFillHex: string = "FF1E293B"
): number {
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

  const lastColLetter = String.fromCharCode(65 + columns.length - 1);
  ws.autoFilter = {
    from: `A${headerRowIdx}`,
    to: `${lastColLetter}${headerRowIdx}`,
  };

  rowsData.forEach((rowObj, rIdx) => {
    const curRowIdx = headerRowIdx + 1 + rIdx;
    const curRow = ws.getRow(curRowIdx);
    curRow.height = 20;

    const isEven = rIdx % 2 === 0;
    const rowBgHex = isEven ? "FFFFFFFF" : "FFF8FAFC";

    columns.forEach((col, cIdx) => {
      const cell = curRow.getCell(cIdx + 1);
      const val = rowObj[col.key];

      cell.value = val !== undefined && val !== null ? val : "";
      cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF1F2937" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgHex } };
      cell.alignment = { vertical: "middle", horizontal: col.align || "left" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFF3F4F6" } },
      };

      if (col.isCurrency && typeof val === "number") {
        cell.numFmt = "₹#,##0";
        cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF047857" } };
      }

      if ((col.key === "status" || col.key === "agingCategory") && typeof val === "string") {
        const uVal = val.toUpperCase();
        if (uVal.includes("PAID") || uVal.includes("ACTIVE") || uVal.includes("COLLECTED")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF166534" } };
        } else if (uVal.includes("REFUND") || uVal.includes("NOTICE") || uVal.includes("PARTIAL") || uVal.includes("1-5 DAYS") || uVal.includes("6-15 DAYS")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEDD5" } };
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF9A3412" } };
        } else if (uVal.includes("OVERDUE") || uVal.includes("VOID") || uVal.includes("PENDING") || uVal.includes("CRITICAL") || uVal.includes("16-30 DAYS")) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF991B1B" } };
        }
      }
    });
  });

  return headerRowIdx + rowsData.length;
}

/**
 * Tier 5: Bottom Summary Row with Excel SUM Formulas & Accounting Double Underlines
 */
export function renderTotalRow(
  ws: ExcelJS.Worksheet,
  totalRowIdx: number,
  startDataRow: number,
  endDataRow: number,
  columns: TableColumnDef[]
): void {
  const row = ws.getRow(totalRowIdx);
  row.height = 24;

  columns.forEach((col, idx) => {
    const colLetter = String.fromCharCode(65 + idx);
    const cell = row.getCell(idx + 1);

    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "double", color: { argb: "FF0F172A" } },
    };

    if (idx === 0) {
      cell.value = "TOTAL / SUMMARY";
      cell.alignment = { vertical: "middle", horizontal: "left" };
    } else if (col.isCurrency && startDataRow <= endDataRow) {
      cell.value = { formula: `SUM(${colLetter}${startDataRow}:${colLetter}${endDataRow})` };
      cell.numFmt = "₹#,##0";
      cell.alignment = { horizontal: "right", vertical: "middle" };
    } else {
      cell.value = "";
    }
  });
}

/**
 * Auto-Fit Columns so no text is truncated or clipped with ###
 */
export function autoFitColumnWidths(ws: ExcelJS.Worksheet, minWidth: number = 14): void {
  ws.columns.forEach((column) => {
    let maxLen = minWidth;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const valStr = cell.value ? cell.value.toString() : "";
      if (valStr.length > maxLen && !cell.isMerged) {
        maxLen = Math.min(valStr.length + 3, 40);
      }
    });
    column.width = maxLen;
  });
}

/**
 * 1-Tap Client-Side Browser Download
 */
export async function downloadWorkbookInBrowser(wb: ExcelJS.Workbook, filename: string): Promise<void> {
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
