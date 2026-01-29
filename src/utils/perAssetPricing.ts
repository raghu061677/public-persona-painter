/**
 * Per-Asset Duration Pricing Utilities
 * Shared logic for computing per-asset booking days, daily rates, and rent amounts
 * Used by Plans, Campaigns, and Invoice generation
 */

export const BILLING_CYCLE_DAYS = 30;

export type BillingMode = 'FULL_MONTH' | 'PRORATA_30' | 'DAILY';

export interface AssetDuration {
  start_date: Date | string;
  end_date: Date | string;
  booked_days?: number;
  billing_mode?: BillingMode;
}

export interface AssetPricingInput {
  monthly_rate: number;
  billing_mode?: BillingMode;
  daily_rate?: number;
}

export interface AssetRentResult {
  booked_days: number;
  daily_rate: number;
  rent_amount: number;
  billing_mode: BillingMode;
}

/**
 * Calculate inclusive booked days between two dates
 * @param start Start date
 * @param end End date
 * @returns Number of days (minimum 1)
 */
export function computeBookedDays(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  
  // Normalize to date only (ignore time)
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = endDate.getTime() - startDate.getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive
  
  return Math.max(days, 1);
}

/**
 * Calculate daily rate based on monthly rate and billing mode
 * @param monthlyRate Monthly rate
 * @param billingMode Billing mode (default: PRORATA_30)
 * @param providedDailyRate Optional pre-calculated daily rate for DAILY mode
 * @param forDisplay If true, rounds to 2 decimal places. If false, returns raw value for calculations.
 * @returns Daily rate
 */
export function computeDailyRate(
  monthlyRate: number,
  billingMode: BillingMode = 'PRORATA_30',
  providedDailyRate?: number,
  forDisplay: boolean = true
): number {
  if (billingMode === 'DAILY' && providedDailyRate !== undefined && providedDailyRate > 0) {
    return forDisplay ? Math.round(providedDailyRate * 100) / 100 : providedDailyRate;
  }
  
  // For PRORATA_30 and FULL_MONTH, daily rate = monthly / 30
  // Only round if for display purposes - keep precision for calculations
  const dailyRate = monthlyRate / BILLING_CYCLE_DAYS;
  return forDisplay ? Math.round(dailyRate * 100) / 100 : dailyRate;
}

/**
 * Calculate rent amount for an asset based on duration and pricing
 * @param monthlyRate Monthly rate
 * @param startDate Start date
 * @param endDate End date  
 * @param billingMode Billing mode
 * @param providedDailyRate Optional daily rate for DAILY mode
 * @returns Rent calculation result
 */
export function computeRentAmount(
  monthlyRate: number,
  startDate: Date | string,
  endDate: Date | string,
  billingMode: BillingMode = 'PRORATA_30',
  providedDailyRate?: number
): AssetRentResult {
  const bookedDays = computeBookedDays(startDate, endDate);
  // Use unrounded daily rate for calculations to avoid compounding errors
  const rawDailyRate = computeDailyRate(monthlyRate, billingMode, providedDailyRate, false);
  // Rounded daily rate for display
  const displayDailyRate = computeDailyRate(monthlyRate, billingMode, providedDailyRate, true);
  
  let rentAmount: number;
  
  switch (billingMode) {
    case 'FULL_MONTH':
      // Full month billing: round to nearest month and charge full months
      const fullMonths = Math.ceil(bookedDays / BILLING_CYCLE_DAYS);
      rentAmount = monthlyRate * fullMonths;
      break;
      
    case 'DAILY':
      // Daily billing with provided or computed daily rate
      // Use raw rate for calculation, only round the final result
      rentAmount = rawDailyRate * bookedDays;
      break;
      
    case 'PRORATA_30':
    default:
      // Pro-rata billing: (monthly_rate / 30) × days
      // Use raw rate for calculation to avoid precision errors
      // Example: 50000/30 × 180 days = 300000.00 (not 300000.60)
      rentAmount = rawDailyRate * bookedDays;
      break;
  }
  
  return {
    booked_days: bookedDays,
    daily_rate: displayDailyRate, // Display value is rounded
    rent_amount: Math.round(rentAmount * 100) / 100, // Final amount is rounded
    billing_mode: billingMode,
  };
}

/**
 * Calculate pro-rata factor for a given number of days
 * @param bookedDays Number of booked days
 * @returns Pro-rata factor (0-N where 1 = 30 days)
 */
export function computeProRataFactor(bookedDays: number): number {
  return Math.round((bookedDays / BILLING_CYCLE_DAYS) * 100) / 100;
}

/**
 * Calculate overlap days between asset booking and a billing period
 * Used for monthly invoicing
 * @param assetStart Asset start date
 * @param assetEnd Asset end date
 * @param periodStart Billing period start date
 * @param periodEnd Billing period end date
 * @returns Number of overlap days (0 if no overlap)
 */
export function computeOverlapDays(
  assetStart: Date | string,
  assetEnd: Date | string,
  periodStart: Date | string,
  periodEnd: Date | string
): number {
  const aStart = typeof assetStart === 'string' ? new Date(assetStart) : assetStart;
  const aEnd = typeof assetEnd === 'string' ? new Date(assetEnd) : assetEnd;
  const pStart = typeof periodStart === 'string' ? new Date(periodStart) : periodStart;
  const pEnd = typeof periodEnd === 'string' ? new Date(periodEnd) : periodEnd;
  
  // Normalize to date only
  [aStart, aEnd, pStart, pEnd].forEach(d => d.setHours(0, 0, 0, 0));
  
  // Calculate overlap
  const overlapStart = new Date(Math.max(aStart.getTime(), pStart.getTime()));
  const overlapEnd = new Date(Math.min(aEnd.getTime(), pEnd.getTime()));
  
  if (overlapEnd < overlapStart) {
    return 0; // No overlap
  }
  
  const diffTime = overlapEnd.getTime() - overlapStart.getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive
  
  return Math.max(days, 0);
}

/**
 * Calculate rent amount for a specific billing period with overlap logic
 * @param monthlyRate Monthly rate
 * @param assetStart Asset start date
 * @param assetEnd Asset end date
 * @param periodStart Billing period start
 * @param periodEnd Billing period end
 * @param billingMode Billing mode
 * @returns Rent amount for this period (0 if no overlap)
 */
export function computePeriodRentAmount(
  monthlyRate: number,
  assetStart: Date | string,
  assetEnd: Date | string,
  periodStart: Date | string,
  periodEnd: Date | string,
  billingMode: BillingMode = 'PRORATA_30'
): number {
  const overlapDays = computeOverlapDays(assetStart, assetEnd, periodStart, periodEnd);
  
  if (overlapDays === 0) {
    return 0;
  }
  
  const dailyRate = computeDailyRate(monthlyRate, billingMode);
  return Math.round(dailyRate * overlapDays * 100) / 100;
}

/**
 * Check if asset's start_date falls within a billing period
 * Used to determine if one-time charges (printing/mounting) should apply
 * @param assetStart Asset start date
 * @param periodStart Billing period start
 * @param periodEnd Billing period end
 * @returns True if asset starts in this period
 */
export function assetStartsInPeriod(
  assetStart: Date | string,
  periodStart: Date | string,
  periodEnd: Date | string
): boolean {
  const aStart = typeof assetStart === 'string' ? new Date(assetStart) : assetStart;
  const pStart = typeof periodStart === 'string' ? new Date(periodStart) : periodStart;
  const pEnd = typeof periodEnd === 'string' ? new Date(periodEnd) : periodEnd;
  
  // Normalize to date only
  [aStart, pStart, pEnd].forEach(d => d.setHours(0, 0, 0, 0));
  
  return aStart >= pStart && aStart <= pEnd;
}

/**
 * Format billing mode for display
 */
export function formatBillingMode(mode: BillingMode): string {
  switch (mode) {
    case 'FULL_MONTH':
      return 'Full Month';
    case 'DAILY':
      return 'Daily';
    case 'PRORATA_30':
    default:
      return 'Pro-rata (30-day)';
  }
}
