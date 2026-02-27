import ExcelJS from "exceljs";
import { format } from "date-fns";

export interface PayableExportField {
  key: string;
  label: string;
  group: string;
  getValue: (row: any, idx: number) => string | number;
  width?: number;
  numFmt?: string;
}

export const ALL_PAYABLE_EXPORT_FIELDS: PayableExportField[] = [
  // Core
  { key: "sno", label: "S.No", group: "Core", getValue: (_r, i) => i + 1, width: 6 },
  { key: "category", label: "Category", group: "Core", getValue: (r) => r.category || "", width: 14 },

  // Campaign & Client
  { key: "campaignName", label: "Campaign Name", group: "Campaign & Client", getValue: (r) => r.campaignName || "", width: 28 },
  { key: "clientName", label: "Client Name", group: "Campaign & Client", getValue: (r) => r.clientName || "", width: 22 },

  // Asset
  { key: "assetId", label: "Asset ID", group: "Asset", getValue: (r) => r.assetId || "", width: 20 },
  { key: "location", label: "Location", group: "Asset", getValue: (r) => r.location || "", width: 28 },
  { key: "city", label: "City", group: "Asset", getValue: (r) => r.city || "", width: 14 },
  { key: "mediaType", label: "Media Type", group: "Asset", getValue: (r) => r.mediaType || "", width: 16 },

  // Vendor & Financial
  { key: "vendorName", label: "Vendor", group: "Vendor & Financial", getValue: (r) => r.vendorName || "", width: 20 },
  { key: "amount", label: "Amount (₹)", group: "Vendor & Financial", getValue: (r) => r.amount || 0, width: 14, numFmt: "₹#,##0" },
  { key: "month", label: "Month", group: "Vendor & Financial", getValue: (r) => {
    try { return r.month ? format(new Date(`${r.month}-01`), "MMM yyyy") : ""; } catch { return r.month || ""; }
  }, width: 14 },
];

export const DEFAULT_PAYABLE_CUSTOM_FIELDS = [
  "sno", "category", "campaignName", "clientName", "assetId", "location", "city", "vendorName", "amount",
];

export const PAYABLE_FIELD_GROUPS = [...new Set(ALL_PAYABLE_EXPORT_FIELDS.map(f => f.group))];

export async function generateCustomPayablesExcel(
  rows: any[],
  selectedFieldKeys: string[],
  month: string,
  companyName?: string,
): Promise<void> {
  const fields = selectedFieldKeys
    .map(key => ALL_PAYABLE_EXPORT_FIELDS.find(f => f.key === key))
    .filter(Boolean) as PayableExportField[];

  if (fields.length === 0) return;

  const colCount = fields.length;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Vendor Payables", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  worksheet.columns = fields.map(f => ({ width: f.width || 14 }));

  let currentRow = 1;

  // Title row
  worksheet.mergeCells(currentRow, 1, currentRow, colCount);
  const titleCell = worksheet.getRow(currentRow).getCell(1);
  const monthLabel = format(new Date(`${month}-01`), "MMMM yyyy");
  titleCell.value = `${companyName || "GO-ADS 360°"} – VENDOR PAYABLES – ${monthLabel}`;
  titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;

  // Info row
  worksheet.mergeCells(currentRow, 1, currentRow, colCount);
  const infoCell = worksheet.getRow(currentRow).getCell(1);
  infoCell.value = `Generated: ${format(new Date(), "dd MMM yyyy HH:mm")} | Total Entries: ${rows.length} | Columns: ${fields.length}`;
  infoCell.font = { size: 11, italic: true };
  infoCell.alignment = { horizontal: "center" };
  worksheet.getRow(currentRow).height = 20;
  currentRow++;

  // Summary row
  currentRow++;
  const mountCount = rows.filter(r => r.category === "Mounting").length;
  const printCount = rows.filter(r => r.category === "Printing").length;
  const unmountCount = rows.filter(r => r.category === "Unmounting").length;
  const totalAmt = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const mountAmt = rows.filter(r => r.category === "Mounting").reduce((s, r) => s + (r.amount || 0), 0);
  const printAmt = rows.filter(r => r.category === "Printing").reduce((s, r) => s + (r.amount || 0), 0);
  const unmountAmt = rows.filter(r => r.category === "Unmounting").reduce((s, r) => s + (r.amount || 0), 0);

  worksheet.getRow(currentRow).values = [
    "Total:", `₹${totalAmt.toLocaleString("en-IN")}`, "",
    `Mounting (${mountCount}):`, `₹${mountAmt.toLocaleString("en-IN")}`, "",
    `Printing (${printCount}):`, `₹${printAmt.toLocaleString("en-IN")}`, "",
    `Unmounting (${unmountCount}):`, `₹${unmountAmt.toLocaleString("en-IN")}`,
  ];
  worksheet.getRow(currentRow).font = { bold: true };
  worksheet.getRow(currentRow).height = 22;
  currentRow += 2;

  // Header row
  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = fields.map(f => f.label);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 24;
  headerRow.eachCell(cell => {
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });
  worksheet.views = [{ state: "frozen", ySplit: currentRow }];
  currentRow++;

  // Data rows
  rows.forEach((row, idx) => {
    const r = worksheet.getRow(currentRow);
    r.values = fields.map(f => f.getValue(row, idx));

    fields.forEach((f, colIdx) => {
      if (f.numFmt) r.getCell(colIdx + 1).numFmt = f.numFmt;
    });

    // Category-based row coloring
    const cat = row.category;
    if (cat === "Mounting") {
      r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
    } else if (cat === "Printing") {
      r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEE8F5" } };
    } else if (cat === "Unmounting") {
      r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3E0" } };
    } else if (idx % 2 === 0) {
      r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
    }

    r.eachCell((cell, colNum) => {
      const field = fields[colNum - 1];
      cell.alignment = {
        horizontal: field?.key === "location" ? "left" : "center",
        vertical: "middle",
        wrapText: field?.key === "location",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    });

    currentRow++;
  });

  // Footer
  currentRow++;
  worksheet.mergeCells(currentRow, 1, currentRow, colCount);
  const footerRow = worksheet.getRow(currentRow);
  footerRow.getCell(1).value = "Go-Ads 360° | OOH Media Management Platform";
  footerRow.getCell(1).font = { size: 10, italic: true, color: { argb: "FF6B7280" } };
  footerRow.getCell(1).alignment = { horizontal: "center" };

  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Vendor_Payables_${month}_Custom.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
