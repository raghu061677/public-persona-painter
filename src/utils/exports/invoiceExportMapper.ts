/**
 * Shared normalized invoice export mapper.
 * Single source of truth for all export field extraction.
 * Reused by Excel, PDF, and all summary aggregators.
 */
import { format } from "date-fns";

// ─── Normalized Invoice Row ────────────────────────────────────────────
export interface NormalizedInvoice {
  raw: any;
  sno: number;
  client_name: string;
  client_gstin: string;
  campaign_display: string;
  campaign_id: string;
  display_period: string;
  invoice_number: string;
  invoice_date: string;
  invoice_date_raw: string;
  total_value: number;
  rate_percent: number;
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst: number;
  status: string;
  client_code: string;
  place_of_supply: string;
  billing_period: string;
  billing_month: string;
  asset_count: number;
  subtotal_raw: number;
  discount: number;
  round_off: number;
  grand_total: number;
  paid_amount: number;
  credited_amount: number;
  balance_due: number;
  due_date: string;
  due_date_raw: string;
  overdue_days: number;
  overdue_amount: number;
  company_name: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────
const fmtDate = (d: string | null | undefined, fmt = "dd-MMM-yyyy"): string => {
  if (!d) return "";
  try { return format(new Date(d), fmt); } catch { return String(d); }
};

const fmtYYYYMM = (d: string | null | undefined): string => {
  if (!d) return "";
  try { return format(new Date(d), "yyyy-MM"); } catch { return ""; }
};

const isIgst = (row: any): boolean =>
  row.tax_type === "igst" || row.gst_mode === "igst" || row.gst_mode === "IGST";

const gstPercent = (row: any): number => {
  if (row.gst_percent != null && row.gst_percent > 0) return Number(row.gst_percent);
  const taxable = row.sub_total || row.subtotal || row.taxable_amount || 0;
  const gst = row.gst_amount || 0;
  if (taxable > 0 && gst > 0) return Math.round((gst / taxable) * 100);
  return 18;
};

const deriveTaxable = (row: any): number => {
  // Direct taxable field
  if (row.sub_total != null && row.sub_total > 0) return Number(row.sub_total);
  if (row.subtotal != null && row.subtotal > 0) return Number(row.subtotal);
  if (row.taxable_amount != null && row.taxable_amount > 0) return Number(row.taxable_amount);
  // Derive from total minus GST
  const total = row.total_amount || 0;
  const gst = row.gst_amount || 0;
  const roundOff = row.round_off_amount || 0;
  if (total > 0 && gst >= 0) return total - gst - roundOff;
  return 0;
};

// ─── Main Normalizer ───────────────────────────────────────────────────
export function normalizeInvoice(row: any, index: number, companyName?: string): NormalizedInvoice {
  const taxable = deriveTaxable(row);
  const isInterState = isIgst(row);
  const igstAmt = isInterState ? (row.igst_amount || row.gst_amount || 0) : 0;
  const cgstAmt = isInterState ? 0 : (row.cgst_amount || 0);
  const sgstAmt = isInterState ? 0 : (row.sgst_amount || 0);

  // Display period from invoice period fields
  const periodStart = fmtDate(row.invoice_period_start || row.billing_from || row.start_date);
  const periodEnd = fmtDate(row.invoice_period_end || row.billing_to || row.end_date);
  const displayPeriod = periodStart && periodEnd ? `${periodStart} to ${periodEnd}` : periodStart || periodEnd || "";

  // GSTIN: snapshot first, then joined client gst_number
  const gstin = row.client_gstin_snapshot || row.client_gst_number || row.client_gstin || row.gstin || "";

  // Overdue calculation
  let overdueDays = 0;
  let overdueAmount = 0;
  if (row.due_date && row.status !== "Paid" && row.status !== "Cancelled") {
    const diff = Math.floor((Date.now() - new Date(row.due_date).getTime()) / 86400000);
    if (diff > 0) {
      overdueDays = diff;
      overdueAmount = row.balance_due || 0;
    }
  }

  return {
    raw: row,
    sno: index + 1,
    client_name: row.client_name || "",
    client_gstin: gstin,
    campaign_display: row.campaign_name || row.campaign_id || "",
    campaign_id: row.campaign_id || "",
    display_period: displayPeriod,
    invoice_number: row.id || "",
    invoice_date: fmtDate(row.invoice_date),
    invoice_date_raw: row.invoice_date || "",
    total_value: row.total_amount || 0,
    rate_percent: gstPercent(row),
    taxable_value: taxable,
    igst: igstAmt,
    cgst: cgstAmt,
    sgst: sgstAmt,
    status: row.status || "",
    client_code: row.client_id || "",
    place_of_supply: row.place_of_supply || row.billing_state || "",
    billing_period: row.billing_month || row.billing_period || "",
    billing_month: row.billing_month || fmtYYYYMM(row.invoice_date) || "",
    asset_count: row.asset_count || (row.items ? (Array.isArray(row.items) ? row.items.length : 0) : 0),
    subtotal_raw: row.sub_total || row.subtotal || 0,
    discount: row.discount_amount || row.discount || 0,
    round_off: row.round_off_amount || row.round_off || 0,
    grand_total: row.total_amount || 0,
    paid_amount: row.paid_amount || 0,
    credited_amount: row.credited_amount || 0,
    balance_due: row.balance_due || 0,
    due_date: fmtDate(row.due_date),
    due_date_raw: row.due_date || "",
    overdue_days: overdueDays,
    overdue_amount: overdueAmount,
    company_name: companyName || row.company_name || "",
  };
}

// ─── Batch normalize ───────────────────────────────────────────────────
export function normalizeInvoices(rows: any[], companyName?: string): NormalizedInvoice[] {
  const filtered = rows.filter((r) => r.status !== "Draft" && r.status !== "Cancelled");
  return filtered.map((r, i) => normalizeInvoice(r, i, companyName));
}

// ─── Aggregation Types ─────────────────────────────────────────────────
export interface SummaryRow {
  label: string;
  subLabel?: string;
  invoiceCount: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalValue: number;
  paidAmount: number;
  creditedAmount: number;
  balanceDue: number;
  overdueAmount: number;
  displayPeriod?: string;
}

function buildSummary(label: string, items: NormalizedInvoice[], subLabel?: string, displayPeriod?: string): SummaryRow {
  return {
    label,
    subLabel,
    invoiceCount: items.length,
    taxableValue: items.reduce((s, r) => s + r.taxable_value, 0),
    igst: items.reduce((s, r) => s + r.igst, 0),
    cgst: items.reduce((s, r) => s + r.cgst, 0),
    sgst: items.reduce((s, r) => s + r.sgst, 0),
    totalValue: items.reduce((s, r) => s + r.total_value, 0),
    paidAmount: items.reduce((s, r) => s + r.paid_amount, 0),
    creditedAmount: items.reduce((s, r) => s + r.credited_amount, 0),
    balanceDue: items.reduce((s, r) => s + r.balance_due, 0),
    overdueAmount: items.reduce((s, r) => s + r.overdue_amount, 0),
    displayPeriod,
  };
}

export function buildTotalsRow(rows: SummaryRow[]): SummaryRow {
  return {
    label: "TOTAL",
    invoiceCount: rows.reduce((s, r) => s + r.invoiceCount, 0),
    taxableValue: rows.reduce((s, r) => s + r.taxableValue, 0),
    igst: rows.reduce((s, r) => s + r.igst, 0),
    cgst: rows.reduce((s, r) => s + r.cgst, 0),
    sgst: rows.reduce((s, r) => s + r.sgst, 0),
    totalValue: rows.reduce((s, r) => s + r.totalValue, 0),
    paidAmount: rows.reduce((s, r) => s + r.paidAmount, 0),
    creditedAmount: rows.reduce((s, r) => s + r.creditedAmount, 0),
    balanceDue: rows.reduce((s, r) => s + r.balanceDue, 0),
    overdueAmount: rows.reduce((s, r) => s + r.overdueAmount, 0),
  };
}

// ─── Date basis helpers ────────────────────────────────────────────────
export type DateBasis = "invoice_date" | "billing_period" | "due_date";

function getDateKey(inv: NormalizedInvoice, basis: DateBasis): string {
  switch (basis) {
    case "billing_period": return inv.billing_month || fmtYYYYMM(inv.invoice_date_raw);
    case "due_date": return fmtYYYYMM(inv.due_date_raw);
    default: return fmtYYYYMM(inv.invoice_date_raw);
  }
}

// ─── Month-wise Aggregation ────────────────────────────────────────────
export function aggregateMonthwise(data: NormalizedInvoice[], basis: DateBasis = "invoice_date"): SummaryRow[] {
  const groups = new Map<string, NormalizedInvoice[]>();
  for (const inv of data) {
    const key = getDateKey(inv, basis) || "Unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(inv);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([month, items]) => {
    let label = month;
    try {
      const [y, m] = month.split("-");
      label = format(new Date(Number(y), Number(m) - 1, 1), "MMM yyyy");
    } catch { /* keep raw */ }
    return buildSummary(label, items);
  });
}

// ─── Quarter-wise Aggregation (Indian FY) ──────────────────────────────
function getIndianFYQuarter(dateKey: string): string {
  if (!dateKey || dateKey.length < 7) return "Unknown";
  const [yearStr, monthStr] = dateKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (month >= 4 && month <= 6) return `Q1 (Apr-Jun ${year})`;
  if (month >= 7 && month <= 9) return `Q2 (Jul-Sep ${year})`;
  if (month >= 10 && month <= 12) return `Q3 (Oct-Dec ${year})`;
  // Jan-Mar belongs to previous FY
  return `Q4 (Jan-Mar ${year})`;
}

export function aggregateQuarterwise(data: NormalizedInvoice[], basis: DateBasis = "invoice_date"): SummaryRow[] {
  const groups = new Map<string, NormalizedInvoice[]>();
  for (const inv of data) {
    const dateKey = getDateKey(inv, basis);
    const qtr = getIndianFYQuarter(dateKey);
    if (!groups.has(qtr)) groups.set(qtr, []);
    groups.get(qtr)!.push(inv);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([q, items]) => buildSummary(q, items));
}

// ─── Client-wise Aggregation ───────────────────────────────────────────
export function aggregateClientwise(data: NormalizedInvoice[]): SummaryRow[] {
  const groups = new Map<string, NormalizedInvoice[]>();
  for (const inv of data) {
    const key = inv.client_name || "Unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(inv);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([name, items]) => {
    const gstin = items[0]?.client_gstin || "";
    return buildSummary(name, items, gstin);
  });
}

// ─── Campaign-wise Aggregation ─────────────────────────────────────────
export function aggregateCampaignwise(data: NormalizedInvoice[]): SummaryRow[] {
  const groups = new Map<string, NormalizedInvoice[]>();
  for (const inv of data) {
    const key = inv.campaign_id || "No Campaign";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(inv);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([campId, items]) => {
    const campName = items[0]?.campaign_display || campId;
    // Aggregate display period: min start to max end
    const starts = items.map(i => i.raw.invoice_period_start).filter(Boolean).sort();
    const ends = items.map(i => i.raw.invoice_period_end).filter(Boolean).sort();
    const dp = starts[0] && ends[ends.length - 1]
      ? `${fmtDate(starts[0])} to ${fmtDate(ends[ends.length - 1])}`
      : "";
    return buildSummary(campName, items, campId, dp);
  });
}

// ─── Reconciliation Check ──────────────────────────────────────────────
export function checkReconciliation(data: NormalizedInvoice[]): { hasWarning: boolean; mismatchCount: number } {
  let mismatchCount = 0;
  for (const inv of data) {
    const computed = inv.taxable_value + inv.igst + inv.cgst + inv.sgst + inv.round_off;
    if (Math.abs(computed - inv.total_value) > 1) {
      mismatchCount++;
    }
  }
  return { hasWarning: mismatchCount > 0, mismatchCount };
}

// ─── Export Types ──────────────────────────────────────────────────────
export type ExportType = "detailed" | "monthwise" | "quarterwise" | "clientwise" | "campaignwise";

export const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  detailed: "Detailed Invoice Export",
  monthwise: "Month-wise Summary",
  quarterwise: "Quarter-wise Summary",
  clientwise: "Client-wise Summary",
  campaignwise: "Campaign-wise Summary",
};

export const EXPORT_TYPE_SHEET_NAMES: Record<ExportType, string> = {
  detailed: "Invoices Export",
  monthwise: "Month Summary",
  quarterwise: "Quarter Summary",
  clientwise: "Client Summary",
  campaignwise: "Campaign Summary",
};

export const EXPORT_TYPE_FILE_SLUGS: Record<ExportType, string> = {
  detailed: "Detailed",
  monthwise: "Monthwise",
  quarterwise: "Quarterwise",
  clientwise: "Clientwise",
  campaignwise: "Campaignwise",
};

// Summary column definitions
export const SUMMARY_COLUMNS = [
  { key: "label", label: "Group", width: 28 },
  { key: "subLabel", label: "Sub Info", width: 20 },
  { key: "invoiceCount", label: "Invoice Count", width: 12, type: "number" as const },
  { key: "taxableValue", label: "Taxable Value", width: 16, type: "currency" as const },
  { key: "igst", label: "IGST", width: 12, type: "currency" as const },
  { key: "cgst", label: "CGST", width: 12, type: "currency" as const },
  { key: "sgst", label: "SGST", width: 12, type: "currency" as const },
  { key: "totalValue", label: "Total Value", width: 16, type: "currency" as const },
  { key: "paidAmount", label: "Paid Amount", width: 14, type: "currency" as const },
  { key: "creditedAmount", label: "Credited Amount", width: 14, type: "currency" as const },
  { key: "balanceDue", label: "Balance Due", width: 14, type: "currency" as const },
  { key: "overdueAmount", label: "Overdue Amount", width: 14, type: "currency" as const },
];

// Campaign summary has extra displayPeriod column
export const CAMPAIGN_SUMMARY_COLUMNS = [
  { key: "label", label: "Campaign Name", width: 28 },
  { key: "subLabel", label: "Campaign ID", width: 20 },
  { key: "invoiceCount", label: "Invoice Count", width: 12, type: "number" as const },
  { key: "displayPeriod", label: "Display Period", width: 28 },
  { key: "taxableValue", label: "Taxable Value", width: 16, type: "currency" as const },
  { key: "igst", label: "IGST", width: 12, type: "currency" as const },
  { key: "cgst", label: "CGST", width: 12, type: "currency" as const },
  { key: "sgst", label: "SGST", width: 12, type: "currency" as const },
  { key: "totalValue", label: "Total Value", width: 16, type: "currency" as const },
  { key: "paidAmount", label: "Paid Amount", width: 14, type: "currency" as const },
  { key: "creditedAmount", label: "Credited Amount", width: 14, type: "currency" as const },
  { key: "balanceDue", label: "Balance Due", width: 14, type: "currency" as const },
];

// Client summary: first col = Client Name, sub = GST No
export const CLIENT_SUMMARY_COLUMNS = [
  { key: "label", label: "Client Name", width: 28 },
  { key: "subLabel", label: "GST No", width: 20 },
  { key: "invoiceCount", label: "Invoice Count", width: 12, type: "number" as const },
  { key: "taxableValue", label: "Taxable Value", width: 16, type: "currency" as const },
  { key: "igst", label: "IGST", width: 12, type: "currency" as const },
  { key: "cgst", label: "CGST", width: 12, type: "currency" as const },
  { key: "sgst", label: "SGST", width: 12, type: "currency" as const },
  { key: "totalValue", label: "Total Value", width: 16, type: "currency" as const },
  { key: "paidAmount", label: "Paid Amount", width: 14, type: "currency" as const },
  { key: "creditedAmount", label: "Credited Amount", width: 14, type: "currency" as const },
  { key: "balanceDue", label: "Balance Due", width: 14, type: "currency" as const },
  { key: "overdueAmount", label: "Overdue Amount", width: 14, type: "currency" as const },
];
