import ExcelJS from "exceljs";
import { format } from "date-fns";
import {
  normalizeInvoices,
  normalizeInvoice,
  buildTotalsRow,
  getSummaryColumnsForType,
  resolveSummaryData,
  isDetailedExportType,
  prefilterForExportType,
  filterByPeriod,
  getPeriodFileSlug,
  getPeriodLabel,
  checkReconciliation,
  aggregateMonthwise,
  getGSTR1ValidationFlags,
  getGSTR1ExclusionCounts,
  EXPORT_TYPE_SHEET_NAMES,
  EXPORT_TYPE_FILE_SLUGS,
  GST_INVOICEWISE_KEYS,
  GSTR1_SALES_REGISTER_KEYS,
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

const fmtDateDDMMYYYY = (d: string | null | undefined): string => {
  if (!d) return "";
  try { return format(new Date(d), "dd-MM-yyyy"); } catch { return String(d); }
};

export const ALL_INVOICE_COLUMNS: InvoiceExcelColumn[] = [
  { key: "sno", label: "Sl.No", width: 6, type: "number", getValue: (r) => r.sno },
  { key: "client_name", label: "Client Name", width: 28, type: "text", getValue: (r) => r.client_name },
  { key: "client_gstin", label: "GST No", width: 18, type: "text", getValue: (r) => r.client_gstin },
  { key: "campaign_display", label: "Campaign Display", width: 30, type: "text", getValue: (r) => r.campaign_display },
  { key: "display_period", label: "Display Period", width: 28, type: "text", getValue: (r) => r.display_period },
  { key: "bill_from", label: "Bill From", width: 14, type: "text", getValue: (r) => {
    const raw = r.raw;
    return fmtDateDDMMYYYY(raw.invoice_period_start || raw.billing_from || raw.start_date);
  }},
  { key: "bill_to", label: "Bill To", width: 14, type: "text", getValue: (r) => {
    const raw = r.raw;
    return fmtDateDDMMYYYY(raw.invoice_period_end || raw.billing_to || raw.end_date);
  }},
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
  if (exportType === "gst_invoicewise") return GST_INVOICEWISE_KEYS;
  if (exportType === "gstr1_sales_register") return GSTR1_SALES_REGISTER_KEYS;
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

// ─── GSTR-1 3-Sheet Enterprise Workbook ────────────────────────────────
async function exportGSTR1Workbook(
  normalized: NormalizedInvoice[],
  allRawInvoices: any[],
  companyName: string,
  companyGstin: string,
  periodLabel: string,
) {
  const columns = GSTR1_SALES_REGISTER_KEYS
    .map((k) => ALL_INVOICE_COLUMNS.find((c) => c.key === k))
    .filter(Boolean) as InvoiceExcelColumn[];

  const wb = new ExcelJS.Workbook();
  wb.creator = "GO-ADS 360°";
  wb.created = new Date();

  // ── Sheet 1: GSTR-1 Sales Register ──
  const ws1 = wb.addWorksheet("GSTR-1 Sales Register", {
    properties: { defaultRowHeight: 18 },
    views: [{ state: "frozen", ySplit: 5, xSplit: 0 }],
  });

  // Company header rows
  const colCount = columns.length;
  const addMergedRow = (text: string, font: Partial<ExcelJS.Font>) => {
    const row = ws1.addRow([text]);
    ws1.mergeCells(row.number, 1, row.number, colCount);
    row.getCell(1).font = font;
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    return row;
  };

  addMergedRow(companyName || "Company", { bold: true, size: 14 });
  if (companyGstin) addMergedRow(`GSTIN: ${companyGstin}`, { size: 10, color: { argb: "FF666666" } });
  addMergedRow("GSTR-1 Sales Register (GST Filing Report)", { bold: true, size: 12, color: { argb: "FF1E40AF" } });
  addMergedRow(`Period: ${periodLabel || "All"} | Generated: ${format(new Date(), "dd-MM-yyyy HH:mm")}`, { size: 9, color: { argb: "FF888888" } });

  // Data header
  const headerRow = ws1.addRow(columns.map((c) => c.label));
  applyHeaderStyle(headerRow);
  columns.forEach((col, idx) => { ws1.getColumn(idx + 1).width = col.width || 14; });

  // Data rows
  normalized.forEach((row) => {
    const values = columns.map((col) => col.getValue(row));
    const excelRow = ws1.addRow(values);
    applyDataRowStyle(excelRow, columns);
  });

  // Totals row
  const totalsValues = columns.map((col) => {
    if (col.key === "sno") return "";
    if (col.key === "client_name") return "TOTAL";
    if (col.type === "currency") return normalized.reduce((s, r) => s + (col.getValue(r) as number || 0), 0);
    return "";
  });
  const totalsRow = ws1.addRow(totalsValues);
  applyTotalsRowStyle(totalsRow);

  // AutoFilter on header row
  ws1.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: colCount } };

  // ── Sheet 2: Reconciliation ──
  const ws2 = wb.addWorksheet("Reconciliation", { properties: { defaultRowHeight: 18 } });

  // Get all raw invoices normalized without GSTR-1 prefilter for exclusion counts
  const allNormalized = allRawInvoices.map((r, i) => normalizeInvoice(r, i, companyName));
  const exclusions = getGSTR1ExclusionCounts(allNormalized);
  const recon = checkReconciliation(normalized);
  const validationIssues: { inv: string; warnings: string[] }[] = [];
  for (const inv of normalized) {
    const flags = getGSTR1ValidationFlags(inv);
    if (flags.length > 0) validationIssues.push({ inv: inv.invoice_number, warnings: flags });
  }

  ws2.getColumn(1).width = 38;
  ws2.getColumn(2).width = 22;

  const addReconSection = (title: string) => {
    ws2.addRow([]);
    const row = ws2.addRow([title]);
    row.getCell(1).font = { bold: true, size: 12, color: { argb: "FF1E40AF" } };
    row.getCell(1).border = { bottom: { style: "thin", color: { argb: "FF1E40AF" } } };
    ws2.addRow([]);
  };

  const addReconRow = (label: string, value: string | number, bold = false) => {
    const row = ws2.addRow([label, value]);
    if (bold) row.eachCell(c => { c.font = { bold: true, size: 11 }; });
    else row.eachCell(c => { c.font = { size: 10 }; });
    if (typeof value === "number") row.getCell(2).numFmt = '#,##0.00';
    row.getCell(2).alignment = { horizontal: "right" };
  };

  // Title
  const titleRow = ws2.addRow(["GSTR-1 Reconciliation Summary"]);
  titleRow.getCell(1).font = { bold: true, size: 14 };
  ws2.addRow([`Period: ${periodLabel || "All"} | Generated: ${format(new Date(), "dd-MM-yyyy HH:mm")}`]).getCell(1).font = { size: 9, color: { argb: "FF888888" } };

  // Section 1: Inclusion / Exclusion
  addReconSection("Inclusion / Exclusion Breakdown");
  addReconRow("Included in Report", normalized.length, true);
  addReconRow("Excluded: Draft Invoices", exclusions.drafts);
  addReconRow("Excluded: Cancelled / Void", exclusions.cancelled);
  addReconRow("Excluded: Zero-GST (Rate ≤ 0)", exclusions.zeroGst);
  addReconRow("Excluded: INV-Z Sequence", exclusions.invZ);
  addReconRow("Excluded: Zero Taxable Value", exclusions.zeroTaxable);

  // Section 2: Tax Reconciliation
  addReconSection("Tax Reconciliation");
  addReconRow("Total Taxable Value", recon.taxableTotal, true);
  addReconRow("IGST Total", recon.igstTotal);
  addReconRow("CGST Total", recon.cgstTotal);
  addReconRow("SGST Total", recon.sgstTotal);
  addReconRow("Total Tax", recon.totalTax, true);
  addReconRow("Grand Total", recon.grossTotal, true);

  // Section 3: Validation Issues
  addReconSection(`Validation Issues (${validationIssues.length})`);

  if (validationIssues.length > 0) {
    const issueHeader = ws2.addRow(["Invoice No", "Validation Warning"]);
    issueHeader.eachCell(c => { c.font = { bold: true, size: 10 }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } }; });
    ws2.getColumn(2).width = 50;
    for (const issue of validationIssues.slice(0, 100)) {
      const r = ws2.addRow([issue.inv, issue.warnings.join("; ")]);
      r.eachCell(c => { c.font = { size: 10 }; });
    }
  } else {
    const noIssueRow = ws2.addRow(["No validation issues found."]);
    noIssueRow.getCell(1).font = { size: 10, color: { argb: "FF16A34A" } };
  }

  // ── Sheet 3: Summary ──
  const ws3 = wb.addWorksheet("Summary", { properties: { defaultRowHeight: 18 } });

  // Title
  const sumTitle = ws3.addRow(["GSTR-1 Summary"]);
  sumTitle.getCell(1).font = { bold: true, size: 14 };
  const sumSubTitle = ws3.addRow([`Period: ${periodLabel || "All"} | Generated: ${format(new Date(), "dd-MM-yyyy HH:mm")}`]);
  sumSubTitle.getCell(1).font = { size: 9, color: { argb: "FF888888" } };
  ws3.addRow([]);

  // Section 1: Monthly summary
  const sectionRow1 = ws3.addRow(["Monthly Breakdown"]);
  sectionRow1.getCell(1).font = { bold: true, size: 12, color: { argb: "FF1E40AF" } };
  ws3.addRow([]);

  const monthlySummary = aggregateMonthwise(normalized, "invoice_date");
  const sumCols = [
    { key: "label", label: "Month", width: 18 },
    { key: "invoiceCount", label: "Invoice Count", width: 14, type: "number" as const },
    { key: "taxableValue", label: "Taxable Value", width: 16, type: "currency" as const },
    { key: "igst", label: "IGST", width: 14, type: "currency" as const },
    { key: "cgst", label: "CGST", width: 14, type: "currency" as const },
    { key: "sgst", label: "SGST", width: 14, type: "currency" as const },
    { key: "totalTax", label: "Total Tax", width: 14, type: "currency" as const },
    { key: "totalValue", label: "Grand Total", width: 16, type: "currency" as const },
  ];

  const sumHeaderRow = ws3.addRow(sumCols.map(c => c.label));
  applyHeaderStyle(sumHeaderRow);
  sumCols.forEach((col, idx) => { ws3.getColumn(idx + 1).width = col.width || 14; });

  monthlySummary.forEach(row => {
    const totalTax = (row.igst || 0) + (row.cgst || 0) + (row.sgst || 0);
    const values = sumCols.map(c => {
      if (c.key === "totalTax") return totalTax;
      return (row as any)[c.key] ?? "";
    });
    const excelRow = ws3.addRow(values);
    applyDataRowStyle(excelRow, sumCols);
  });

  if (monthlySummary.length > 0) {
    const mTotals = buildTotalsRow(monthlySummary);
    const mTotalTax = (mTotals.igst || 0) + (mTotals.cgst || 0) + (mTotals.sgst || 0);
    const mTotalsValues = sumCols.map(c => {
      if (c.key === "totalTax") return mTotalTax;
      return (mTotals as any)[c.key] ?? "";
    });
    const mTotalsRow = ws3.addRow(mTotalsValues);
    applyTotalsRowStyle(mTotalsRow);
  }

  // Section 2: Tax type summary
  ws3.addRow([]);
  const sectionRow2 = ws3.addRow(["Tax Type Breakdown"]);
  sectionRow2.getCell(1).font = { bold: true, size: 12, color: { argb: "FF1E40AF" } };
  ws3.addRow([]);

  const igstRows = normalized.filter(inv => inv.igst > 0 && inv.cgst === 0 && inv.sgst === 0);
  const cgstSgstRows = normalized.filter(inv => (inv.cgst > 0 || inv.sgst > 0) && inv.igst === 0);

  const taxTypeCols = ["Tax Type", "Invoice Count", "Taxable Value", "IGST", "CGST", "SGST", "Total Tax", "Grand Total"];
  const taxTypeHeader = ws3.addRow(taxTypeCols);
  applyHeaderStyle(taxTypeHeader);

  const addTaxRow = (label: string, rows: NormalizedInvoice[]) => {
    const taxable = rows.reduce((s, r) => s + r.taxable_value, 0);
    const igst = rows.reduce((s, r) => s + r.igst, 0);
    const cgst = rows.reduce((s, r) => s + r.cgst, 0);
    const sgst = rows.reduce((s, r) => s + r.sgst, 0);
    const totalTax = igst + cgst + sgst;
    const total = rows.reduce((s, r) => s + r.total_value, 0);
    const r = ws3.addRow([label, rows.length, taxable, igst, cgst, sgst, totalTax, total]);
    r.eachCell((cell, colNum) => {
      if (colNum >= 3) cell.numFmt = '#,##0.00';
      cell.font = { size: 10 };
    });
  };

  addTaxRow("IGST", igstRows);
  addTaxRow("CGST + SGST", cgstSgstRows);
  const totalTaxRow = ws3.addRow([
    "Total", normalized.length,
    normalized.reduce((s, r) => s + r.taxable_value, 0),
    normalized.reduce((s, r) => s + r.igst, 0),
    normalized.reduce((s, r) => s + r.cgst, 0),
    normalized.reduce((s, r) => s + r.sgst, 0),
    normalized.reduce((s, r) => s + r.igst + r.cgst + r.sgst, 0),
    normalized.reduce((s, r) => s + r.total_value, 0),
  ]);
  applyTotalsRowStyle(totalTaxRow);

  // Section 3: GST Rate breakdown
  ws3.addRow([]);
  const sectionRow3 = ws3.addRow(["GST Rate Breakdown"]);
  sectionRow3.getCell(1).font = { bold: true, size: 12, color: { argb: "FF1E40AF" } };
  ws3.addRow([]);

  const rateGroups = new Map<number, NormalizedInvoice[]>();
  for (const inv of normalized) {
    const rate = inv.rate_percent || 0;
    if (!rateGroups.has(rate)) rateGroups.set(rate, []);
    rateGroups.get(rate)!.push(inv);
  }

  const rateHeader = ws3.addRow(["GST Rate (%)", "Invoice Count", "Taxable Value", "Total Tax", "Grand Total"]);
  applyHeaderStyle(rateHeader);

  Array.from(rateGroups.entries()).sort((a, b) => a[0] - b[0]).forEach(([rate, rows]) => {
    const taxable = rows.reduce((s, r) => s + r.taxable_value, 0);
    const tax = rows.reduce((s, r) => s + r.igst + r.cgst + r.sgst, 0);
    const total = rows.reduce((s, r) => s + r.total_value, 0);
    const r = ws3.addRow([`${rate}%`, rows.length, taxable, tax, total]);
    r.eachCell((cell, colNum) => {
      if (colNum >= 3) cell.numFmt = '#,##0.00';
      cell.font = { size: 10 };
    });
  });

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
  companyGstin?: string,
) {
  let normalized = normalizeInvoices(invoices, companyName);
  if (period) normalized = filterByPeriod(normalized, period, dateBasis);
  normalized = prefilterForExportType(normalized, exportType);
  if (normalized.length === 0) return;

  normalized.forEach((r, i) => { r.sno = i + 1; });

  const periodSlug = period ? getPeriodFileSlug(period) : "";
  const periodLabel = period ? getPeriodLabel(period) : "All";
  const now = format(new Date(), "yyyyMMdd_HHmm");
  const periodPart = periodSlug ? `_${periodSlug}` : "";

  // GSTR-1 gets a 3-sheet enterprise workbook
  if (exportType === "gstr1_sales_register") {
    const compName = companyName || "Company";
    const fileName = `GST_Filing_Report_${compName.replace(/[^a-zA-Z0-9]/g, "_")}${periodPart}_${now}.xlsx`;
    const wb = await exportGSTR1Workbook(normalized, invoices, compName, companyGstin || "", periodLabel);
    return downloadExcel(wb, fileName);
  }

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