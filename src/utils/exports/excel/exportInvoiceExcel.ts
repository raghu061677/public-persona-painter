import ExcelJS from "exceljs";
import { format } from "date-fns";
import {
  normalizeInvoices,
  aggregateMonthwise,
  aggregateQuarterwise,
  aggregateClientwise,
  aggregateCampaignwise,
  buildTotalsRow,
  SUMMARY_COLUMNS,
  CLIENT_SUMMARY_COLUMNS,
  CAMPAIGN_SUMMARY_COLUMNS,
  EXPORT_TYPE_SHEET_NAMES,
  EXPORT_TYPE_FILE_SLUGS,
  type ExportType,
  type DateBasis,
  type NormalizedInvoice,
  type SummaryRow,
} from "@/utils/exports/invoiceExportMapper";

// ─── Detailed Column Definitions (using normalized fields) ─────────────
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
async function exportDetailed(
  normalized: NormalizedInvoice[],
  selectedKeys: string[],
) {
  const columns = selectedKeys
    .map((k) => ALL_INVOICE_COLUMNS.find((c) => c.key === k))
    .filter(Boolean) as InvoiceExcelColumn[];

  const wb = new ExcelJS.Workbook();
  wb.creator = "GO-ADS 360°";
  wb.created = new Date();

  const ws = wb.addWorksheet(EXPORT_TYPE_SHEET_NAMES.detailed, {
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

  const now = format(new Date(), "yyyyMMdd_HHmm");
  await downloadExcel(wb, `Invoices_${EXPORT_TYPE_FILE_SLUGS.detailed}_${now}.xlsx`);
}

// ─── Summary Export ────────────────────────────────────────────────────
async function exportSummary(
  summaryRows: SummaryRow[],
  exportType: ExportType,
) {
  const colDefs = exportType === "campaignwise"
    ? CAMPAIGN_SUMMARY_COLUMNS
    : exportType === "clientwise"
      ? CLIENT_SUMMARY_COLUMNS
      : SUMMARY_COLUMNS;

  // Filter out subLabel column if all empty
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

  // Totals row
  const totals = buildTotalsRow(summaryRows);
  const totalsValues = cols.map((c) => (totals as any)[c.key] ?? "");
  const totalsRow = ws.addRow(totalsValues);
  applyTotalsRowStyle(totalsRow);

  const now = format(new Date(), "yyyyMMdd_HHmm");
  await downloadExcel(wb, `Invoices_${EXPORT_TYPE_FILE_SLUGS[exportType]}_${now}.xlsx`);
}

// ─── Main Export Function ──────────────────────────────────────────────
export async function exportInvoiceExcel(
  invoices: any[],
  selectedKeys: string[],
  companyName?: string,
  exportType: ExportType = "detailed",
  dateBasis: DateBasis = "invoice_date",
) {
  const normalized = normalizeInvoices(invoices, companyName);
  if (normalized.length === 0) return;

  if (exportType === "detailed") {
    return exportDetailed(normalized, selectedKeys);
  }

  let summaryRows: SummaryRow[];
  switch (exportType) {
    case "monthwise":
      summaryRows = aggregateMonthwise(normalized, dateBasis);
      break;
    case "quarterwise":
      summaryRows = aggregateQuarterwise(normalized, dateBasis);
      break;
    case "clientwise":
      summaryRows = aggregateClientwise(normalized);
      break;
    case "campaignwise":
      summaryRows = aggregateCampaignwise(normalized);
      break;
    default:
      return;
  }

  return exportSummary(summaryRows, exportType);
}
