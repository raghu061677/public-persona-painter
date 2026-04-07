/**
 * Campaign Invoice Status Tracking System
 * 
 * Computes invoice status dynamically from campaign dates and finalized invoices.
 * Never stored in DB — always computed at render time.
 */

import { format, addMonths, startOfMonth, endOfMonth, addDays, isBefore, isAfter } from "date-fns";

export type CampaignInvoiceStatus =
  | "not_billable_yet"
  | "not_started"
  | "partially_invoiced"
  | "fully_invoiced"
  | "overdue";

export interface CampaignInvoiceStatusResult {
  status: CampaignInvoiceStatus;
  billableMonths: string[];
  invoicedMonths: string[];
  pendingMonths: string[];
  overdueMonths: string[];
  completionPercent: number;
  lastInvoiceNo: string | null;
}

export interface InvoiceSummaryRow {
  id: string;
  campaign_id: string;
  billing_month: string | null;
  is_draft: boolean;
  status: string;
  invoice_no: string | null;
  created_at: string;
  items?: any[] | null; // jsonb items with booking_start_date / booking_end_date
  invoice_period_start?: string | null;
  invoice_period_end?: string | null;
}

/**
 * Generate all billable months between start and end dates (inclusive).
 * Returns array of "YYYY-MM" strings.
 */
export function generateBillableMonths(startDate: string, endDate: string): string[] {
  const months: string[] = [];
  const start = startOfMonth(new Date(startDate));
  const end = startOfMonth(new Date(endDate));
  
  let current = start;
  while (!isAfter(current, end)) {
    months.push(format(current, "yyyy-MM"));
    current = addMonths(current, 1);
  }
  return months;
}

/**
 * Extract invoiced months from finalized (non-draft, non-cancelled) invoices.
 * For multi-month invoices, derives covered months from item date ranges.
 */
export function extractInvoicedMonths(invoices: InvoiceSummaryRow[], campaignId: string): string[] {
  const months = new Set<string>();
  invoices.forEach((inv) => {
    if (
      inv.campaign_id === campaignId &&
      !inv.is_draft &&
      inv.status !== "Cancelled"
    ) {
      // Try to derive all covered months from items' date ranges
      const coveredMonths = deriveMonthsFromItems(inv.items);
      if (coveredMonths.length > 0) {
        coveredMonths.forEach((m) => months.add(m));
      } else if (inv.billing_month) {
        // Fallback: single billing_month
        months.add(inv.billing_month);
      }
    }
  });
  return Array.from(months).sort();
}

/**
 * Derive all YYYY-MM months covered by invoice items' booking date ranges.
 */
function deriveMonthsFromItems(items: any[] | null | undefined): string[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const months = new Set<string>();
  items.forEach((item) => {
    const startStr = item.booking_start_date || item.bill_start_date;
    const endStr = item.booking_end_date || item.bill_end_date;
    if (startStr && endStr) {
      const start = startOfMonth(new Date(startStr));
      const end = startOfMonth(new Date(endStr));
      let current = start;
      while (!isAfter(current, end)) {
        months.add(format(current, "yyyy-MM"));
        current = addMonths(current, 1);
      }
    }
  });
  return Array.from(months);
}

/**
 * Get the last invoice number for a campaign from finalized invoices.
 */
function getLastInvoiceNo(invoices: InvoiceSummaryRow[], campaignId: string): string | null {
  const finalized = invoices
    .filter(
      (inv) =>
        inv.campaign_id === campaignId &&
        !inv.is_draft &&
        inv.status !== "Cancelled" &&
        inv.invoice_no
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return finalized.length > 0 ? finalized[0].invoice_no : null;
}

/**
 * Core function: Compute campaign invoice status from real data.
 * 
 * @param campaign - Must have id, start_date, end_date
 * @param invoices - All invoices batch-fetched for the company
 * @param today - Current date (injectable for testing)
 */
export function computeCampaignInvoiceStatus(
  campaign: { id: string; start_date: string; end_date: string },
  invoices: InvoiceSummaryRow[],
  today: Date = new Date()
): CampaignInvoiceStatusResult {
  // Generate all billable months
  const billableMonths = generateBillableMonths(campaign.start_date, campaign.end_date);

  // Determine which months are reachable (month has started or passed)
  const reachableMonths = billableMonths.filter((m) => {
    const monthStart = new Date(m + "-01");
    return !isAfter(monthStart, today);
  });

  // If no billable months or campaign hasn't started yet
  if (billableMonths.length === 0 || reachableMonths.length === 0) {
    return {
      status: "not_billable_yet",
      billableMonths,
      invoicedMonths: [],
      pendingMonths: [],
      overdueMonths: [],
      completionPercent: 0,
      lastInvoiceNo: null,
    };
  }

  // Extract invoiced months
  const invoicedMonths = extractInvoicedMonths(invoices, campaign.id);
  const invoicedSet = new Set(invoicedMonths);

  // Pending = reachable months that aren't invoiced
  const pendingMonths = reachableMonths.filter((m) => !invoicedSet.has(m));

  // Overdue = pending months where month-end + 3 days has passed
  const overdueMonths = pendingMonths.filter((m) => {
    const monthEnd = endOfMonth(new Date(m + "-01"));
    const overdueDate = addDays(monthEnd, 3);
    return isBefore(overdueDate, today);
  });

  // Calculate completion percent over ALL billable months (not just reachable)
  const completionPercent =
    billableMonths.length > 0
      ? Math.round((invoicedMonths.length / billableMonths.length) * 100)
      : 0;

  const lastInvoiceNo = getLastInvoiceNo(invoices, campaign.id);

  // Determine status
  let status: CampaignInvoiceStatus;

  if (overdueMonths.length > 0) {
    status = "overdue";
  } else if (invoicedMonths.length === 0) {
    status = "not_started";
  } else if (invoicedMonths.length >= billableMonths.length) {
    status = "fully_invoiced";
  } else {
    status = "partially_invoiced";
  }

  return {
    status,
    billableMonths,
    invoicedMonths,
    pendingMonths,
    overdueMonths,
    completionPercent,
    lastInvoiceNo,
  };
}

/** Status display configuration */
export const invoiceStatusConfig: Record<
  CampaignInvoiceStatus,
  { label: string; color: string; badgeClass: string }
> = {
  not_billable_yet: {
    label: "Not Billable",
    color: "blue",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400",
  },
  not_started: {
    label: "Not Invoiced",
    color: "gray",
    badgeClass: "bg-muted text-muted-foreground",
  },
  partially_invoiced: {
    label: "Partial",
    color: "orange",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400",
  },
  fully_invoiced: {
    label: "Fully Invoiced",
    color: "green",
    badgeClass: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400",
  },
  overdue: {
    label: "Overdue",
    color: "red",
    badgeClass: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400",
  },
};

/**
 * Format month string "YYYY-MM" into display format "MMM YYYY"
 */
export function formatBillingMonth(month: string): string {
  const d = new Date(month + "-01");
  return format(d, "MMM yyyy");
}
