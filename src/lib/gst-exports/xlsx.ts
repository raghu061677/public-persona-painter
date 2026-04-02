import ExcelJS from "exceljs";
import { ColDef } from "./columns";

interface SheetConfig {
  name: string;
  columns: ColDef[];
  data: any[];
  showTotals?: boolean;
}

function formatDateCell(val: any): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
  } catch { /* */ }
  return String(val ?? "");
}

function addSheet(
  wb: ExcelJS.Workbook,
  config: SheetConfig,
  companyName: string,
  periodLabel: string
) {
  const ws = wb.addWorksheet(config.name);

  // Title row
  ws.mergeCells(1, 1, 1, config.columns.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = config.name;
  titleCell.font = { bold: true, size: 13 };
  titleCell.alignment = { horizontal: "left" };

  // Company + period row
  ws.mergeCells(2, 1, 2, config.columns.length);
  const subCell = ws.getCell(2, 1);
  subCell.value = `${companyName} | Filing Period: ${periodLabel}`;
  subCell.font = { size: 10, italic: true, color: { argb: "FF666666" } };

  // Empty row
  ws.addRow([]);

  // Header row (row 4)
  const headerRow = ws.addRow(config.columns.map((c) => c.header));
  headerRow.font = { bold: true, size: 10 };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Set column widths
  config.columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width || 14;
  });

  // Data rows
  config.data.forEach((row) => {
    const dataRow = ws.addRow(
      config.columns.map((c) => {
        const val = row[c.key];
        if (c.type === "date") return formatDateCell(val);
        if (c.type === "currency" || c.type === "number") {
          const n = Number(val);
          return isNaN(n) ? (val ?? "") : n;
        }
        return val ?? "";
      })
    );
    config.columns.forEach((c, i) => {
      const cell = dataRow.getCell(i + 1);
      if (c.type === "currency") {
        cell.numFmt = '#,##0.00';
      } else if (c.type === "number") {
        cell.numFmt = '#,##0';
      }
    });
  });

  // Totals row
  if (config.showTotals && config.data.length > 0) {
    const totalsArr = config.columns.map((c) => {
      if (c.type === "currency" || c.type === "number") {
        return config.data.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
      }
      return "";
    });
    totalsArr[0] = "TOTAL";
    const totRow = ws.addRow(totalsArr);
    totRow.font = { bold: true };
    totRow.eachCell((cell, colNum) => {
      const col = config.columns[colNum - 1];
      if (col?.type === "currency") cell.numFmt = '#,##0.00';
      else if (col?.type === "number") cell.numFmt = '#,##0';
      cell.border = { top: { style: "thin", color: { argb: "FF333333" } } };
    });
  }

  // Freeze header
  ws.views = [{ state: "frozen", ySplit: 4, xSplit: 0 }];

  // Auto-filter
  if (config.data.length > 0) {
    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + config.data.length, column: config.columns.length },
    };
  }
}

export async function generateXlsx(
  sheets: SheetConfig[],
  companyName: string,
  periodLabel: string
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Go-Ads 360°";
  wb.created = new Date();

  sheets.forEach((s) => addSheet(wb, s, companyName, periodLabel));

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
