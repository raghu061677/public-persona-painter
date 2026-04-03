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
  // Check if invoice is zero-rated (INV-Z prefix or no GST)
  const invId = row.id || "";
  if (invId.includes("INV-Z") || (gst === 0 && taxable > 0)) return 0;
  return 18;
};

const deriveTaxable = (row: any): number => {
  if (row.sub_total != null && row.sub_total > 0) return Number(row.sub_total);
  if (row.subtotal != null && row.subtotal > 0) return Number(row.subtotal);
  if (row.taxable_amount != null && row.taxable_amount > 0) return Number(row.taxable_amount);
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

  const periodStart = fmtDate(row.invoice_period_start || row.billing_from || row.start_date);
  const periodEnd = fmtDate(row.invoice_period_end || row.billing_to || row.end_date);
  const displayPeriod = periodStart && periodEnd ? `${periodStart} to ${periodEnd}` : periodStart || periodEnd || "";

  const gstin = row.client_gstin_snapshot || row.client_gst_number || row.client_gstin || row.gstin || "";

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

// ─── Period Filtering ──────────────────────────────────────────────────
export type PeriodType = "current_view" | "custom_range" | "exact_month" | "financial_quarter" | "financial_year";

export interface PeriodConfig {
  type: PeriodType;
  dateFrom?: string;
  dateTo?: string;
  month?: string; // "2025-04"
  quarter?: string; // "Q1" | "Q2" | "Q3" | "Q4"
  fy?: string; // "2025-26"
}

export function getMonthRange(monthKey: string): { from: string; to: string; label: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0); // last day
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
    label: `${months[m - 1]} ${y}`,
  };
}

export function getFYQuarterRange(quarter: string, fy: string): { from: string; to: string; label: string } {
  const [startYear] = fy.split("-").map(Number);
  const qMap: Record<string, { m1: number; m2: number; y: number }> = {
    Q1: { m1: 3, m2: 5, y: startYear }, // Apr-Jun
    Q2: { m1: 6, m2: 8, y: startYear }, // Jul-Sep
    Q3: { m1: 9, m2: 11, y: startYear }, // Oct-Dec
    Q4: { m1: 0, m2: 2, y: startYear + 1 }, // Jan-Mar
  };
  const q = qMap[quarter] || qMap.Q1;
  const from = new Date(q.y, q.m1, 1);
  const to = new Date(q.y, q.m2 + 1, 0);
  return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd"), label: `${quarter} FY${fy}` };
}

export function getFYRange(fy: string): { from: string; to: string; label: string } {
  const [startYear] = fy.split("-").map(Number);
  return {
    from: `${startYear}-04-01`,
    to: `${startYear + 1}-03-31`,
    label: `FY ${fy}`,
  };
}

export function filterByPeriod(
  data: NormalizedInvoice[],
  period: PeriodConfig,
  dateBasis: DateBasis,
): NormalizedInvoice[] {
  if (period.type === "current_view") return data;

  let from = "", to = "";
  if (period.type === "custom_range") {
    from = period.dateFrom || "";
    to = period.dateTo || "";
  } else if (period.type === "exact_month" && period.month) {
    const range = getMonthRange(period.month);
    from = range.from;
    to = range.to;
  } else if (period.type === "financial_quarter" && period.quarter && period.fy) {
    const range = getFYQuarterRange(period.quarter, period.fy);
    from = range.from;
    to = range.to;
  } else if (period.type === "financial_year" && period.fy) {
    const range = getFYRange(period.fy);
    from = range.from;
    to = range.to;
  }

  if (!from && !to) return data;

  return data.filter((inv) => {
    let dateRaw = "";
    switch (dateBasis) {
      case "billing_period": dateRaw = inv.raw.billing_month || inv.invoice_date_raw; break;
      case "due_date": dateRaw = inv.due_date_raw; break;
      default: dateRaw = inv.invoice_date_raw;
    }
    if (!dateRaw) return false;
    const d = dateRaw.substring(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

export function getPeriodLabel(period: PeriodConfig): string {
  if (period.type === "current_view") return "Current View";
  if (period.type === "exact_month" && period.month) return getMonthRange(period.month).label;
  if (period.type === "financial_quarter" && period.quarter && period.fy)
    return getFYQuarterRange(period.quarter, period.fy).label;
  if (period.type === "financial_year" && period.fy) return getFYRange(period.fy).label;
  if (period.type === "custom_range") {
    const f = period.dateFrom ? fmtDate(period.dateFrom) : "";
    const t = period.dateTo ? fmtDate(period.dateTo) : "";
    return `${f} to ${t}`;
  }
  return "";
}

export function getPeriodFileSlug(period: PeriodConfig): string {
  if (period.type === "exact_month" && period.month) {
    const [y, m] = period.month.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[Number(m) - 1]}${y}`;
  }
  if (period.type === "financial_quarter" && period.quarter && period.fy) return `${period.quarter}_FY${period.fy}`;
  if (period.type === "financial_year" && period.fy) return `FY${period.fy}`;
  return "";
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
  oldestDueDate?: string;
}

function buildSummary(label: string, items: NormalizedInvoice[], subLabel?: string, displayPeriod?: string): SummaryRow {
  const dueDates = items.map(i => i.due_date_raw).filter(Boolean).sort();
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
    oldestDueDate: dueDates[0] ? fmtDate(dueDates[0]) : "",
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
    const starts = items.map(i => i.raw.invoice_period_start).filter(Boolean).sort();
    const ends = items.map(i => i.raw.invoice_period_end).filter(Boolean).sort();
    const dp = starts[0] && ends[ends.length - 1]
      ? `${fmtDate(starts[0])} to ${fmtDate(ends[ends.length - 1])}`
      : "";
    return buildSummary(campName, items, campId, dp);
  });
}

// ─── GST Rate-wise Aggregation ─────────────────────────────────────────
export function aggregateGstRatewise(data: NormalizedInvoice[]): SummaryRow[] {
  const groups = new Map<number, NormalizedInvoice[]>();
  for (const inv of data) {
    const rate = inv.rate_percent;
    if (!groups.has(rate)) groups.set(rate, []);
    groups.get(rate)!.push(inv);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  return sorted.map(([rate, items]) => buildSummary(`${rate}%`, items));
}

// ─── B2B Summary (has GSTIN) ───────────────────────────────────────────
export function aggregateB2B(data: NormalizedInvoice[]): SummaryRow[] {
  const b2b = data.filter(i => i.client_gstin && i.client_gstin.length >= 15);
  const groups = new Map<string, NormalizedInvoice[]>();
  for (const inv of b2b) {
    const key = inv.client_gstin;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(inv);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([gstin, items]) => {
    const name = items[0]?.client_name || "";
    const state = items[0]?.place_of_supply || "";
    return buildSummary(name, items, gstin, state);
  });
}

// ─── B2C Summary (no GSTIN) ────────────────────────────────────────────
export function aggregateB2C(data: NormalizedInvoice[]): SummaryRow[] {
  const b2c = data.filter(i => !i.client_gstin || i.client_gstin.length < 15);
  const groups = new Map<string, NormalizedInvoice[]>();
  for (const inv of b2c) {
    const key = inv.place_of_supply || "Unknown State";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(inv);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([state, items]) => buildSummary(state, items));
}

// ─── State-wise Tax Summary ────────────────────────────────────────────
export function aggregateStatewise(data: NormalizedInvoice[]): SummaryRow[] {
  const groups = new Map<string, NormalizedInvoice[]>();
  for (const inv of data) {
    const key = inv.place_of_supply || "Unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(inv);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([state, items]) => buildSummary(state, items));
}

// ─── Outstanding Filters ───────────────────────────────────────────────
export function filterOutstandingOnly(data: NormalizedInvoice[]): NormalizedInvoice[] {
  return data.filter(i => i.balance_due > 0 && i.status !== "Paid" && i.status !== "Cancelled");
}

export function filterOverdueOnly(data: NormalizedInvoice[]): NormalizedInvoice[] {
  return data.filter(i =>
    i.overdue_days > 0 && i.balance_due > 0 &&
    (i.status === "Sent" || i.status === "Partial" || i.status === "Overdue")
  );
}

// ─── Aging Aggregation ─────────────────────────────────────────────────
export function aggregateAging(data: NormalizedInvoice[]): SummaryRow[] {
  const outstanding = filterOutstandingOnly(data);
  const buckets: Record<string, NormalizedInvoice[]> = {
    "0-30 days": [],
    "31-60 days": [],
    "61-90 days": [],
    "90+ days": [],
  };
  for (const inv of outstanding) {
    if (inv.overdue_days <= 0) continue; // not yet due
    if (inv.overdue_days <= 30) buckets["0-30 days"].push(inv);
    else if (inv.overdue_days <= 60) buckets["31-60 days"].push(inv);
    else if (inv.overdue_days <= 90) buckets["61-90 days"].push(inv);
    else buckets["90+ days"].push(inv);
  }
  return Object.entries(buckets).map(([bucket, items]) => buildSummary(bucket, items));
}

// ─── Client-wise Outstanding ───────────────────────────────────────────
export function aggregateClientOutstanding(data: NormalizedInvoice[]): SummaryRow[] {
  const outstanding = filterOutstandingOnly(data);
  return aggregateClientwise(outstanding);
}

// ─── Campaign-wise Receivables ─────────────────────────────────────────
export function aggregateCampaignReceivables(data: NormalizedInvoice[]): SummaryRow[] {
  const outstanding = filterOutstandingOnly(data);
  return aggregateCampaignwise(outstanding);
}

// ─── GST Invoice-wise Summary (GSTR-ready) ─────────────────────────────
// This returns detailed rows, not summary — handled differently in formatters

// ─── Reconciliation Check ──────────────────────────────────────────────
export interface ReconciliationResult {
  hasWarning: boolean;
  mismatchCount: number;
  totalRecords: number;
  taxableTotal: number;
  totalTax: number;
  igstTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  grossTotal: number;
  paidTotal: number;
  creditedTotal: number;
  balanceDueTotal: number;
  overdueTotal: number;
}

export function checkReconciliation(data: NormalizedInvoice[]): ReconciliationResult {
  let mismatchCount = 0;
  for (const inv of data) {
    const computed = inv.taxable_value + inv.igst + inv.cgst + inv.sgst + inv.round_off;
    if (Math.abs(computed - inv.total_value) > 1) {
      mismatchCount++;
    }
  }
  return {
    hasWarning: mismatchCount > 0,
    mismatchCount,
    totalRecords: data.length,
    taxableTotal: data.reduce((s, r) => s + r.taxable_value, 0),
    totalTax: data.reduce((s, r) => s + r.igst + r.cgst + r.sgst, 0),
    igstTotal: data.reduce((s, r) => s + r.igst, 0),
    cgstTotal: data.reduce((s, r) => s + r.cgst, 0),
    sgstTotal: data.reduce((s, r) => s + r.sgst, 0),
    grossTotal: data.reduce((s, r) => s + r.total_value, 0),
    paidTotal: data.reduce((s, r) => s + r.paid_amount, 0),
    creditedTotal: data.reduce((s, r) => s + r.credited_amount, 0),
    balanceDueTotal: data.reduce((s, r) => s + r.balance_due, 0),
    overdueTotal: data.reduce((s, r) => s + r.overdue_amount, 0),
  };
}

// ─── Export Types (extended) ───────────────────────────────────────────
export type ExportType =
  | "detailed"
  | "monthwise"
  | "quarterwise"
  | "clientwise"
  | "campaignwise"
  | "gst_ratewise"
  | "gst_b2b"
  | "gst_b2c"
  | "gst_statewise"
  | "gst_invoicewise"
  | "outstanding_detailed"
  | "outstanding_overdue"
  | "outstanding_clientwise"
  | "outstanding_aging"
  | "outstanding_campaignwise";

export const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  detailed: "Detailed Invoice Export",
  monthwise: "Month-wise Summary",
  quarterwise: "Quarter-wise Summary",
  clientwise: "Client-wise Summary",
  campaignwise: "Campaign-wise Summary",
  gst_ratewise: "GST Rate-wise Summary",
  gst_b2b: "GST B2B Summary",
  gst_b2c: "GST B2C Summary",
  gst_statewise: "State-wise Tax Summary",
  gst_invoicewise: "Invoice-wise GST Summary",
  outstanding_detailed: "Outstanding Detailed",
  outstanding_overdue: "Overdue Only",
  outstanding_clientwise: "Client-wise Outstanding",
  outstanding_aging: "Aging Summary",
  outstanding_campaignwise: "Campaign-wise Receivables",
};

export const EXPORT_TYPE_GROUPS: Record<string, ExportType[]> = {
  "Invoice Reports": ["detailed", "monthwise", "quarterwise", "clientwise", "campaignwise"],
  "GST / GSTR Reports": ["gst_ratewise", "gst_b2b", "gst_b2c", "gst_statewise", "gst_invoicewise"],
  "Outstanding / Receivables": ["outstanding_detailed", "outstanding_overdue", "outstanding_clientwise", "outstanding_aging", "outstanding_campaignwise"],
};

export const EXPORT_TYPE_SHEET_NAMES: Record<ExportType, string> = {
  detailed: "Invoices Export",
  monthwise: "Month Summary",
  quarterwise: "Quarter Summary",
  clientwise: "Client Summary",
  campaignwise: "Campaign Summary",
  gst_ratewise: "GST Rate Summary",
  gst_b2b: "B2B Summary",
  gst_b2c: "B2C Summary",
  gst_statewise: "State Tax Summary",
  gst_invoicewise: "GST Invoice Detail",
  outstanding_detailed: "Outstanding Detail",
  outstanding_overdue: "Overdue Invoices",
  outstanding_clientwise: "Client Outstanding",
  outstanding_aging: "Aging Summary",
  outstanding_campaignwise: "Campaign Receivables",
};

export const EXPORT_TYPE_FILE_SLUGS: Record<ExportType, string> = {
  detailed: "Detailed",
  monthwise: "Monthwise",
  quarterwise: "Quarterwise",
  clientwise: "Clientwise",
  campaignwise: "Campaignwise",
  gst_ratewise: "GSTRatewise",
  gst_b2b: "GST_B2B",
  gst_b2c: "GST_B2C",
  gst_statewise: "GSTStatewise",
  gst_invoicewise: "GSTSummary",
  outstanding_detailed: "Outstanding",
  outstanding_overdue: "Overdue",
  outstanding_clientwise: "OutstandingClient",
  outstanding_aging: "Aging",
  outstanding_campaignwise: "CampaignReceivables",
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

export const OUTSTANDING_DETAIL_COLUMNS = [
  { key: "label", label: "Client Name", width: 28 },
  { key: "subLabel", label: "GST No", width: 20 },
  { key: "invoiceCount", label: "Invoice Count", width: 12, type: "number" as const },
  { key: "taxableValue", label: "Total Invoiced", width: 16, type: "currency" as const },
  { key: "paidAmount", label: "Paid Amount", width: 14, type: "currency" as const },
  { key: "creditedAmount", label: "Credited Amount", width: 14, type: "currency" as const },
  { key: "balanceDue", label: "Balance Due", width: 14, type: "currency" as const },
  { key: "overdueAmount", label: "Overdue Amount", width: 14, type: "currency" as const },
  { key: "oldestDueDate", label: "Oldest Due Date", width: 14 },
];

export const AGING_COLUMNS = [
  { key: "label", label: "Bucket", width: 20 },
  { key: "invoiceCount", label: "Invoice Count", width: 12, type: "number" as const },
  { key: "balanceDue", label: "Balance Due", width: 16, type: "currency" as const },
];

// ─── Get summary columns for export type ───────────────────────────────
export function getSummaryColumnsForType(exportType: ExportType) {
  switch (exportType) {
    case "campaignwise":
    case "outstanding_campaignwise":
      return CAMPAIGN_SUMMARY_COLUMNS;
    case "clientwise":
    case "outstanding_clientwise":
    case "gst_b2b":
      return CLIENT_SUMMARY_COLUMNS;
    case "outstanding_aging":
      return AGING_COLUMNS;
    case "outstanding_detailed":
    case "outstanding_overdue":
      return OUTSTANDING_DETAIL_COLUMNS;
    default:
      return SUMMARY_COLUMNS;
  }
}

// ─── Resolve summary data for any export type ──────────────────────────
export function resolveSummaryData(
  data: NormalizedInvoice[],
  exportType: ExportType,
  dateBasis: DateBasis = "invoice_date",
): SummaryRow[] {
  switch (exportType) {
    case "monthwise": return aggregateMonthwise(data, dateBasis);
    case "quarterwise": return aggregateQuarterwise(data, dateBasis);
    case "clientwise": return aggregateClientwise(data);
    case "campaignwise": return aggregateCampaignwise(data);
    case "gst_ratewise": return aggregateGstRatewise(data);
    case "gst_b2b": return aggregateB2B(data);
    case "gst_b2c": return aggregateB2C(data);
    case "gst_statewise": return aggregateStatewise(data);
    case "outstanding_clientwise": return aggregateClientOutstanding(data);
    case "outstanding_aging": return aggregateAging(data);
    case "outstanding_campaignwise": return aggregateCampaignReceivables(data);
    default: return [];
  }
}

// ─── Check if export type is a "detailed" row-per-invoice mode ─────────
export function isDetailedExportType(et: ExportType): boolean {
  return et === "detailed" || et === "gst_invoicewise" || et === "outstanding_detailed" || et === "outstanding_overdue";
}

// ─── Pre-filter data for outstanding export types ──────────────────────
export function prefilterForExportType(data: NormalizedInvoice[], et: ExportType): NormalizedInvoice[] {
  if (et.startsWith("outstanding_")) {
    if (et === "outstanding_overdue") return filterOverdueOnly(data);
    return filterOutstandingOnly(data);
  }
  return data;
}

// ─── GST invoice-wise default column keys ──────────────────────────────
export const GST_INVOICEWISE_KEYS = [
  "sno", "invoice_number", "invoice_date", "client_name", "client_gstin",
  "place_of_supply", "taxable_value", "rate_percent", "igst", "cgst", "sgst", "total_value",
];

export const OUTSTANDING_DETAIL_KEYS = [
  "sno", "invoice_number", "invoice_date", "client_name", "campaign_display",
  "due_date", "total_value", "paid_amount", "credited_amount", "balance_due", "overdue_days", "status",
];

// ─── Export Presets ────────────────────────────────────────────────────
export interface ExportPreset {
  id: string;
  name: string;
  exportType: ExportType;
  dateBasis: DateBasis;
  period: PeriodConfig;
  columns: string[];
  isDefault?: boolean;
}

const PRESET_LS_KEY = "invoice_export_presets";

export function loadExportPresets(): ExportPreset[] {
  try {
    const raw = localStorage.getItem(PRESET_LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return getSystemPresets();
}

export function saveExportPresets(presets: ExportPreset[]) {
  localStorage.setItem(PRESET_LS_KEY, JSON.stringify(presets));
}

export function getSystemPresets(): ExportPreset[] {
  const base: PeriodConfig = { type: "current_view" };
  return [
    { id: "sys_ca", name: "CA Format", exportType: "gst_invoicewise", dateBasis: "invoice_date", period: base, columns: GST_INVOICEWISE_KEYS },
    { id: "sys_mgmt", name: "Management Format", exportType: "monthwise", dateBasis: "invoice_date", period: base, columns: [] },
    { id: "sys_client_ledger", name: "Client-wise Ledger", exportType: "clientwise", dateBasis: "invoice_date", period: base, columns: [] },
    { id: "sys_gst_review", name: "GST Review", exportType: "gst_ratewise", dateBasis: "invoice_date", period: base, columns: [] },
    { id: "sys_outstanding", name: "Outstanding Follow-up", exportType: "outstanding_detailed", dateBasis: "invoice_date", period: base, columns: OUTSTANDING_DETAIL_KEYS },
  ];
}
