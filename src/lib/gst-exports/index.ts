import { MONTH_NAMES } from "@/lib/gst-format";
import {
  B2B_COLUMNS,
  B2C_COLUMNS,
  CREDIT_NOTE_COLUMNS,
  HSN_COLUMNS,
  STATEWISE_COLUMNS,
  VALIDATION_COLUMNS,
  INVOICE_REGISTER_COLUMNS,
} from "./columns";
import { generateCsv, downloadCsv } from "./csv";
import { generateXlsx, downloadBlob } from "./xlsx";

export interface GSTExportContext {
  companyName: string;
  filingMonth: number;
  filingYear: number;
  summary: any;
  b2b: any[];
  b2c: any[];
  creditNotes: any[];
  hsn: any[];
  statewise: any[];
  validation: any[];
  invoiceRegister: any[];
}

function filePrefix(ctx: GSTExportContext) {
  const safe = ctx.companyName.replace(/[^a-zA-Z0-9]/g, "_");
  const m = String(ctx.filingMonth).padStart(2, "0");
  return `GOADS_GST_${safe}_${ctx.filingYear}_${m}`;
}

function periodLabel(ctx: GSTExportContext) {
  return `${MONTH_NAMES[ctx.filingMonth]} ${ctx.filingYear}`;
}

// ─── CSV Exports ───

export function exportCsv(ctx: GSTExportContext, type: string) {
  const prefix = filePrefix(ctx);
  const map: Record<string, { data: any[]; cols: typeof B2B_COLUMNS; name: string }> = {
    b2b: { data: ctx.b2b, cols: B2B_COLUMNS, name: "B2B_Register" },
    b2c: { data: ctx.b2c, cols: B2C_COLUMNS, name: "B2C_Summary" },
    credit_notes: { data: ctx.creditNotes, cols: CREDIT_NOTE_COLUMNS, name: "Credit_Notes_Register" },
    hsn: { data: ctx.hsn, cols: HSN_COLUMNS, name: "HSN_SAC_Summary" },
    statewise: { data: ctx.statewise, cols: STATEWISE_COLUMNS, name: "Statewise_Summary" },
    validation: { data: ctx.validation, cols: VALIDATION_COLUMNS, name: "Validation_Report" },
    invoice_register: { data: ctx.invoiceRegister, cols: INVOICE_REGISTER_COLUMNS, name: "Invoice_Register" },
  };
  if (type === "monthly_summary" && ctx.summary) {
    const summaryRow = ctx.summary;
    const cols = Object.keys(summaryRow)
      .filter((k) => !["company_id", "filing_month", "filing_year"].includes(k))
      .map((k) => ({ key: k, header: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), type: "text" as const }));
    const csv = generateCsv([summaryRow], cols);
    downloadCsv(csv, `${prefix}_Monthly_Summary.csv`);
    return;
  }
  const entry = map[type];
  if (!entry) return;
  const csv = generateCsv(entry.data, entry.cols);
  downloadCsv(csv, `${prefix}_${entry.name}.csv`);
}

// ─── XLSX Exports ───

export async function exportXlsx(ctx: GSTExportContext, type: string) {
  const prefix = filePrefix(ctx);
  const period = periodLabel(ctx);

  if (type === "monthly_summary") {
    return exportMonthlySummaryXlsx(ctx, prefix, period);
  }

  const map: Record<string, { data: any[]; cols: typeof B2B_COLUMNS; name: string; sheet: string }> = {
    b2b: { data: ctx.b2b, cols: B2B_COLUMNS, name: "B2B_Register", sheet: "B2B Register" },
    b2c: { data: ctx.b2c, cols: B2C_COLUMNS, name: "B2C_Summary", sheet: "B2C Summary" },
    credit_notes: { data: ctx.creditNotes, cols: CREDIT_NOTE_COLUMNS, name: "Credit_Notes_Register", sheet: "Credit Notes" },
    hsn: { data: ctx.hsn, cols: HSN_COLUMNS, name: "HSN_SAC_Summary", sheet: "HSN/SAC Summary" },
    statewise: { data: ctx.statewise, cols: STATEWISE_COLUMNS, name: "Statewise_Summary", sheet: "State-wise Summary" },
    validation: { data: ctx.validation, cols: VALIDATION_COLUMNS, name: "Validation_Report", sheet: "Validation Report" },
    invoice_register: { data: ctx.invoiceRegister, cols: INVOICE_REGISTER_COLUMNS, name: "Invoice_Register", sheet: "Invoice Register" },
  };

  const entry = map[type];
  if (!entry) return;

  const blob = await generateXlsx(
    [{ name: entry.sheet, columns: entry.cols, data: entry.data, showTotals: type !== "validation" }],
    ctx.companyName,
    period
  );
  downloadBlob(blob, `${prefix}_${entry.name}.xlsx`);
}

async function exportMonthlySummaryXlsx(ctx: GSTExportContext, prefix: string, period: string) {
  const s = ctx.summary || {};

  // Summary sheet — key-value pairs
  const summaryKV = [
    { metric: "Gross Invoice Taxable Value", value: s.gross_invoice_taxable_value ?? 0 },
    { metric: "Gross CGST", value: s.gross_cgst_amount ?? 0 },
    { metric: "Gross SGST", value: s.gross_sgst_amount ?? 0 },
    { metric: "Gross IGST", value: s.gross_igst_amount ?? 0 },
    { metric: "Gross Total Invoice Value", value: s.gross_total_invoice_value ?? 0 },
    { metric: "Credit Note Taxable Reduction", value: s.credit_note_taxable_reduction ?? 0 },
    { metric: "Credit Note CGST Reduction", value: s.credit_note_cgst_reduction ?? 0 },
    { metric: "Credit Note SGST Reduction", value: s.credit_note_sgst_reduction ?? 0 },
    { metric: "Credit Note IGST Reduction", value: s.credit_note_igst_reduction ?? 0 },
    { metric: "Credit Note Total Reduction", value: s.credit_note_total_reduction ?? 0 },
    { metric: "Net Taxable Value", value: s.net_taxable_value ?? 0 },
    { metric: "Net CGST", value: s.net_cgst_amount ?? 0 },
    { metric: "Net SGST", value: s.net_sgst_amount ?? 0 },
    { metric: "Net IGST", value: s.net_igst_amount ?? 0 },
    { metric: "Net Total Value", value: s.net_total_value ?? 0 },
    { metric: "B2B Taxable Value", value: s.b2b_taxable_value ?? 0 },
    { metric: "B2C Taxable Value", value: s.b2c_taxable_value ?? 0 },
    { metric: "Invoice Count", value: s.invoice_count ?? 0 },
    { metric: "Credit Note Count", value: s.credit_note_count ?? 0 },
  ];

  const summaryColDefs = [
    { key: "metric", header: "Metric", type: "text" as const, width: 36 },
    { key: "value", header: "Amount (₹)", type: "currency" as const, width: 20 },
  ];

  const sheets = [
    { name: "Summary", columns: summaryColDefs, data: summaryKV, showTotals: false },
    { name: "State-wise Summary", columns: STATEWISE_COLUMNS, data: ctx.statewise, showTotals: true },
    { name: "HSN/SAC Summary", columns: HSN_COLUMNS, data: ctx.hsn, showTotals: true },
    { name: "Validation Summary", columns: VALIDATION_COLUMNS, data: ctx.validation, showTotals: false },
  ];

  const blob = await generateXlsx(sheets, ctx.companyName, period);
  downloadBlob(blob, `${prefix}_Monthly_Summary.xlsx`);
}
