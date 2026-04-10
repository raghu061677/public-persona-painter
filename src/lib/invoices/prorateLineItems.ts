/**
 * Prorated Line Items Utility
 * 
 * Invoice items can contain either the already-billed prorated rent_amount OR
 * a legacy monthly snapshot. This utility normalizes both cases so PDFs and
 * previews always show the billed prorated rent for the invoice period.
 * This utility calculates each item's prorated line total so that:
 * - The "Display" price shows the billed prorated rent
 * - The "Line Total" shows the actual billed amount for the billing period
 * - All line totals sum exactly to the invoice sub_total
 */

export interface ProratedItem {
  /** The original item with all fields preserved */
  [key: string]: any;
  /** The billed/prorated rent for display in PRICING column */
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
    const printingCharges = Number(item.printing_charges ?? item.printing_cost ?? 0);
    const mountingCharges = Number(item.mounting_charges ?? item.mounting_cost ?? 0);
    const explicitRent = item.rent_amount ?? item.rate;
    const amountDerivedRent = item.amount != null
      ? Math.max(0, Number(item.amount) - printingCharges - mountingCharges)
      : null;
    const storedRent = Number(explicitRent ?? amountDerivedRent ?? 0);

    const startDate = item.booking_start_date || item.start_date;
    const endDate = item.booking_end_date || item.end_date;

    let billingDays = Number(item.booked_days ?? item.billable_days ?? 0);
    if ((!billingDays || billingDays < 0) && startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      billingDays = Math.max(1, Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }

    const explicitDailyRate = Number(item.daily_rate ?? 0);
    const monthlyReference = Number(item.display_rate ?? item.negotiated_rate ?? 0);

    // Detect whether the stored rent is already prorated.
    const looksAlreadyProrated = billingDays > 0 && billingDays < 30 && (
      (explicitDailyRate > 0 && Math.abs(storedRent - (explicitDailyRate * billingDays)) <= 1) ||
      (monthlyReference > 0 && storedRent < monthlyReference)
    );

    let proratedRent = storedRent;
    if (billingDays > 0 && billingDays < 30 && !looksAlreadyProrated) {
      const billingBase = monthlyReference > 0 ? monthlyReference : storedRent;
      const derivedDailyRate = explicitDailyRate > 0 ? explicitDailyRate : (billingBase / 30);
      proratedRent = derivedDailyRate * billingDays;
    }

    proratedRent = Math.round(proratedRent * 100) / 100;

    const rawLineTotal = proratedRent + printingCharges + mountingCharges;

    return {
      ...item,
      display_rent: proratedRent,
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
