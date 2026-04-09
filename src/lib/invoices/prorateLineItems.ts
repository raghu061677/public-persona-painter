/**
 * Prorated Line Items Utility
 * 
 * Invoice items JSONB stores full monthly rates (e.g., ₹80,000) as rent_amount,
 * but the invoice sub_total reflects the actual prorated billing amount for the period.
 * This utility calculates each item's prorated line total so that:
 * - The "Display" price shows the monthly rate (informational)
 * - The "Line Total" shows the actual billed amount for the billing period
 * - All line totals sum exactly to the invoice sub_total
 */

export interface ProratedItem {
  /** The original item with all fields preserved */
  [key: string]: any;
  /** The monthly/full rate for display in PRICING column */
  display_rent: number;
  /** Printing charges (unchanged) */
  display_printing: number;
  /** Mounting charges (unchanged) */
  display_mounting: number;
  /** The prorated rent amount for this billing period */
  prorated_rent: number;
  /** The prorated line total (rent + printing + mounting, adjusted to match sub_total) */
  prorated_line_total: number;
  /** Number of billable days for this item in this invoice period */
  billable_days: number;
}

export function prorateInvoiceLineItems(items: any[], invoiceSubTotal: number): ProratedItem[] {
  if (!items || items.length === 0) return [];

  // Step 1: Calculate raw prorated amounts for each item
  const enriched = items.map((item: any) => {
    const monthlyRate = item.rent_amount ?? item.rate ?? item.amount ?? 0;
    const printingCharges = item.printing_charges ?? item.printing_cost ?? 0;
    const mountingCharges = item.mounting_charges ?? item.mounting_cost ?? 0;

    const startDate = item.booking_start_date || item.start_date;
    const endDate = item.booking_end_date || item.end_date;

    let billingDays = 0;
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      billingDays = Math.max(1, Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }

    // Calculate prorated rent:
    // If billing period < 30 days and we have dates, prorate using daily rate
    let proratedRent = monthlyRate;
    if (billingDays > 0 && billingDays < 30) {
      const dailyRate = item.daily_rate || (monthlyRate / 30);
      proratedRent = dailyRate * billingDays;
    }

    const rawLineTotal = proratedRent + printingCharges + mountingCharges;

    return {
      ...item,
      display_rent: monthlyRate,
      display_printing: printingCharges,
      display_mounting: mountingCharges,
      prorated_rent: proratedRent,
      prorated_line_total: rawLineTotal,
      billable_days: billingDays,
      _raw_rent: proratedRent,
    };
  });

  // Step 2: Adjust proportionally so line totals sum to invoice sub_total
  const rawSum = enriched.reduce((sum, item) => sum + item.prorated_line_total, 0);

  if (rawSum > 0 && invoiceSubTotal > 0 && Math.abs(rawSum - invoiceSubTotal) > 0.50) {
    // Scale all items proportionally
    const scale = invoiceSubTotal / rawSum;
    let runningTotal = 0;
    enriched.forEach((item, idx) => {
      if (idx < enriched.length - 1) {
        item.prorated_rent = Math.round(item._raw_rent * scale * 100) / 100;
        item.prorated_line_total = Math.round((item._raw_rent + item.display_printing + item.display_mounting) * scale * 100) / 100;
        runningTotal += item.prorated_line_total;
      } else {
        // Last item absorbs rounding difference
        item.prorated_line_total = Math.round((invoiceSubTotal - runningTotal) * 100) / 100;
        item.prorated_rent = item.prorated_line_total - item.display_printing - item.display_mounting;
      }
    });
  }

  // Clean up temp fields
  enriched.forEach(item => delete item._raw_rent);

  return enriched as ProratedItem[];
}
