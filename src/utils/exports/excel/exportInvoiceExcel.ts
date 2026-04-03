import ExcelJS from "exceljs";
import { format } from "date-fns";
import {
  normalizeInvoices,
  buildTotalsRow,
  getSummaryColumnsForType,
  resolveSummaryData,
  isDetailedExportType,
  prefilterForExportType,
  filterByPeriod,
  getPeriodFileSlug,
  getPeriodLabel,
  checkReconciliation,
  EXPORT_TYPE_SHEET_NAMES,
  EXPORT_TYPE_FILE_SLUGS,
  GST_INVOICEWISE_KEYS,
  OUTSTANDING_DETAIL_KEYS,
  type ExportType,
  type DateBasis,
  type PeriodConfig,
  type NormalizedInvoice,
  type SummaryRow,
} from "@/utils/exports/invoiceExportMapper";

// ─── Detailed Column Definitions ───────────────────────────────────────
export interface InvoiceExcelColumn {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "date" | "currency";
  getValue: (row: NormalizedInvoice) => any;
}

export const ALL_INVOICE_COLUMNS: InvoiceExcelColumn[] = [
  { key: "sno", label: "Sl.No", width: 6, type: "number", getValue: (r) => r.sno },
  { key: "client_name", label: "Client Name", width: 28, type: "text", getValue: (r) => r.client_name },
  { key: "client_gstin", label: "GST No", width: 18, type: "text", getValue: (r) => r.client_gstin },
  { key: "campaign_display", label: "Campaign Display", width: 30, type: "text", getValue: (r) => r.campaign_display },
  { key: "display_period", label: "Display Period", width: 28, type: "text", getValue: (r) => r.display_period },
  { key: "invoice_number", label: "Invoice Number", width: 22, type: "text", getValue: (r) => r.invoice_number },
  { key: "invoice_date", label: "Invoice Date", width: 14, type: "text", getValue: (r) => r.invoice_date },
  { key: "total_value", label: "Total Value", width: 14, type: "currency", getValue: (r) => r.total_value },
  { key: "rate_percent", label: "Rate (%)", width: 10, type: "number", getValue: (r) => r.rate_percent },
  { key: "taxable_value", label: "Taxable Value", width: 14, type: "currency", getValue: (r) => r.taxable_value },
  { key: "igst", label: "IGST", width: 12, type: "currency", getValue: (r) => r.igst },
  { key: "cgst", label: "CGST", width: 12, type: "currency", getValue: (r) => r.cgst },
  { key: "sgst", label: "SGST", width: 12, type: "currency", getValue: (r) => r.sgst },
  { key: "status", label: "Invoice Status", width: 12, type: "text", getValue: (r) => r.status },
  { key: "campaign_id", label: "Campaign ID", width: 20, type: "text", getValue: (r) => r.campaign_id },
  { key: "client_code", label: "Client Code", width: 14, type: "text", getValue: (r) => r.client_code },
  { key: "place_of_supply", label: "Place of Supply", width: 16, type: "text", getValue: (r) => r.place_of_supply },
  { key: "billing_period", label: "Billing Period", width: 14, type: "text", getValue: (r) => r.billing_period },
  { key: "asset_count", label: "Asset Count", width: 10, type: "number", getValue: (r) => r.asset_count },
  { key: "subtotal_raw", label: "Sub Total", width: 14, type: "currency", getValue: (r) => r.subtotal_raw },
  { key: "discount", label: "Discount", width: 12, type: "currency", getValue: (r) => r.discount },
  { key: "round_off", label: "Round Off", width: 10, type: "number", getValue: (r) => r.round_off },
  { key: "grand_total", label: "Grand Total", width: 14, type: "currency", getValue: (r) => r.grand_total },
  { key: "paid_amount", label: "Paid Amount", width: 14, type: "currency", getValue: (r) => r.paid_amount },
  { key: "credited_amount", label: "Credited Amount", width: 14, type: "currency", getValue: (r) => r.credited_amount },
  { key: "balance_due", label: "Balance Due", width: 14, type: "currency", getValue: (r) => r.balance_due },
  { key: "due_date", label: "Due Date", width: 14, type: "text", getValue: (r) => r.due_date },
  { key: "overdue_days", label: "Overdue Days", width: 12, type: "number", getValue: (r) => r.overdue_days || "" },
  { key: "company_name", label: "Company Name", width: 24, type: "text", getValue: (r) => r.company_name },
];

export const DEFAULT_INVOICE_EXPORT_KEYS = [
  "sno", "client_name", "client_gstin", "campaign_display", "display_period",
  "invoice_number", "invoice_date", "total_value", "rate_percent",
  "taxable_value", "igst", "cgst", "sgst",
];

const LS_PREFIX = "invoice_export_columns";

export function loadSavedColumnKeys(exportType: ExportType = "detailed"): string[] {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}_${exportType}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* */ }
  // Return type-specific defaults
  if (exportType === "gst_invoicewise") return GST_INVOICEWISE_KEYS;
  if (exportType === "outstanding_detailed" || exportType === "outstanding_overdue") return OUTSTANDING_DETAIL_KEYS;
  return DEFAULT_INVOICE_EXPORT_KEYS;
}

export function saveColumnKeys(keys: string[], exportType: ExportType = "detailed") {
  localStorage.setItem(`${LS_PREFIX}_${exportType}`, JSON.stringify(keys));
}

// ─── Shared Excel Helpers ──────────────────────────────────────────────
function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF1E40AF" } } };
  });
}

function applyDataRowStyle(row: ExcelJS.Row, cols: { type?: string }[]) {
  row.eachCell((cell, colNumber) => {
    const col = cols[colNumber - 1];
    if (col?.type === "currency" || col?.type === "number") {
      cell.alignment = { horizontal: "right" };
      if (col.type === "currency") cell.numFmt = '#,##0.00';
    } else {
      cell.alignment = { horizontal: "left" };
    }
    cell.font = { size: 10 };
    cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
  });
}

function applyTotalsRowStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
    cell.border = { top: { style: "thin", color: { argb: "FF1E40AF" } }, bottom: { style: "double", color: { argb: "FF1E40AF" } } };
    if (typeof cell.value === "number") cell.numFmt = '#,##0.00';
  });
}

function downloadExcel(wb: ExcelJS.Workbook, fileName: string) {
  return wb.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ─── Detailed Export ───────────────────────────────────────────────────
async function exportDetailed(normalized: NormalizedInvoice[], selectedKeys: string[], sheetName: string) {
  const columns = selectedKeys
    .map((k) => ALL_INVOICE_COLUMNS.find((c) => c.key === k))
    .filter(Boolean) as InvoiceExcelColumn[];

  const wb = new ExcelJS.Workbook();
  wb.creator = "GO-ADS 360°";
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    properties: { defaultRowHeight: 18 },
    views: [{ state: "frozen", ySplit: 1, xSplit: 0 }],
  });

  const headerRow = ws.addRow(columns.map((c) => c.label));
  applyHeaderStyle(headerRow);
  columns.forEach((col, idx) => { ws.getColumn(idx + 1).width = col.width || 14; });

  normalized.forEach((row) => {
    const values = columns.map((col) => col.getValue(row));
    const excelRow = ws.addRow(values);
    applyDataRowStyle(excelRow, columns);
  });

  return wb;
}

// ─── Summary Export ────────────────────────────────────────────────────
async function exportSummary(summaryRows: SummaryRow[], exportType: ExportType) {
  const colDefs = getSummaryColumnsForType(exportType);
  const hasSubLabel = summaryRows.some((r) => r.subLabel);
  const cols = hasSubLabel ? colDefs : colDefs.filter((c) => c.key !== "subLabel");

  const wb = new ExcelJS.Workbook();
  wb.creator = "GO-ADS 360°";
  wb.created = new Date();

  const ws = wb.addWorksheet(EXPORT_TYPE_SHEET_NAMES[exportType], {
    properties: { defaultRowHeight: 18 },
    views: [{ state: "frozen", ySplit: 1, xSplit: 0 }],
  });

  const headerRow = ws.addRow(cols.map((c) => c.label));
  applyHeaderStyle(headerRow);
  cols.forEach((col, idx) => { ws.getColumn(idx + 1).width = col.width || 14; });

  summaryRows.forEach((row) => {
    const values = cols.map((c) => (row as any)[c.key] ?? "");
    const excelRow = ws.addRow(values);
    applyDataRowStyle(excelRow, cols);
  });

  const totals = buildTotalsRow(summaryRows);
  const totalsValues = cols.map((c) => (totals as any)[c.key] ?? "");
  const totalsRow = ws.addRow(totalsValues);
  applyTotalsRowStyle(totalsRow);

  return wb;
}

// ─── Main Export Function ──────────────────────────────────────────────
export async function exportInvoiceExcel(
  invoices: any[],
  selectedKeys: string[],
  companyName?: string,
  exportType: ExportType = "detailed",
  dateBasis: DateBasis = "invoice_date",
  period?: PeriodConfig,
) {
  let normalized = normalizeInvoices(invoices, companyName);
  if (period) normalized = filterByPeriod(normalized, period, dateBasis);
  normalized = prefilterForExportType(normalized, exportType);
  if (normalized.length === 0) return;

  // Re-index sno after filtering
  normalized.forEach((r, i) => { r.sno = i + 1; });

  const periodSlug = period ? getPeriodFileSlug(period) : "";
  const now = format(new Date(), "yyyyMMdd_HHmm");
  const periodPart = periodSlug ? `_${periodSlug}` : "";

  if (isDetailedExportType(exportType)) {
    const keys = exportType === "gst_invoicewise" ? GST_INVOICEWISE_KEYS
      : (exportType === "outstanding_detailed" || exportType === "outstanding_overdue") ? OUTSTANDING_DETAIL_KEYS
      : selectedKeys;
    const wb = await exportDetailed(normalized, keys, EXPORT_TYPE_SHEET_NAMES[exportType]);
    return downloadExcel(wb, `Invoices_${EXPORT_TYPE_FILE_SLUGS[exportType]}${periodPart}_${now}.xlsx`);
  }

  const summaryRows = resolveSummaryData(normalized, exportType, dateBasis);
  const wb = await exportSummary(summaryRows, exportType);
  return downloadExcel(wb, `Invoices_${EXPORT_TYPE_FILE_SLUGS[exportType]}${periodPart}_${now}.xlsx`);
}
