/**
 * Professional OOH Billing Engine
 * Handles month-wise and day-wise billing calculations
 */

// Global billing constant: 1 month = 30 days
export const BILLING_CYCLE_DAYS = 30;

export type DurationMode = 'MONTH' | 'DAYS';

export interface LineItemDuration {
  start_date: Date;
  end_date: Date;
  duration_days: number;
  duration_mode: DurationMode;
  months_count: number;
}

export interface LineItemPricing {
  base_rate_month: number;
  card_rate_month: number;
  negotiated_rate_month: number;
  printing_rate_month?: number;
  mounting_rate_month?: number;
  duration: LineItemDuration;
}

export interface LineItemTotals {
  line_base_rate: number;
  line_card_rate: number;
  line_negotiation_rate: number;
  line_printing_charge: number;
  line_mounting_charge: number;
  line_subtotal: number;
  duration_factor: number;
}

/**
 * Date-only helper to avoid timezone shifts
 */
export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/**
 * Parse YYYY-MM-DD string to Date without timezone issues
 */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format Date to YYYY-MM-DD for Supabase
 */
export function formatForSupabase(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculate inclusive duration in days between two dates
 * Special rule: If booking covers a complete calendar month (1st to last day),
 * bill it as 30 days regardless of actual month length (28/29/30/31 days)
 * Example: July 1 to July 31 = 30 days (not 31)
 * Example: Dec 1 to Dec 31 = 30 days (not 31)
 * Example: Feb 1 to Feb 28/29 = 30 days (full month)
 */
export function calculateDurationDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // Check if this is a complete calendar month
  const isFirstDay = start.getDate() === 1;
  const lastDayOfMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  const isLastDay = end.getDate() === lastDayOfMonth;
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  
  // If it's a complete calendar month (1st to last day), bill as 30 days
  if (isFirstDay && isLastDay && sameMonth) {
    return BILLING_CYCLE_DAYS; // 30 days
  }
  
  // Otherwise calculate actual inclusive days
  const diffTime = end.getTime() - start.getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive
  return Math.max(days, 1);
}

/**
 * Calculate end date from start date and duration
 */
export function calculateEndDate(startDate: Date, durationDays: number): Date {
  const end = new Date(startDate);
  end.setDate(end.getDate() + durationDays - 1); // -1 because duration is inclusive
  return end;
}

/**
 * Calculate duration factor based on mode
 */
export function calculateDurationFactor(
  durationDays: number,
  durationMode: DurationMode,
  monthsCount?: number
): number {
  if (durationMode === 'MONTH' && monthsCount !== undefined) {
    return monthsCount;
  }
  return durationDays / BILLING_CYCLE_DAYS;
}

/**
 * Calculate months from days
 * Rounds to nearest whole month: 1-44 days = 1 month, 45-74 days = 2 months, etc.
 */
export function calculateMonthsFromDays(durationDays: number): number {
  return Math.round(durationDays / BILLING_CYCLE_DAYS);
}

/**
 * Calculate days from months
 */
export function calculateDaysFromMonths(monthsCount: number): number {
  return monthsCount * BILLING_CYCLE_DAYS;
}

/**
 * Sync duration when start date changes
 */
export function syncDurationFromStartDate(
  startDate: Date,
  durationDays: number
): { end_date: Date } {
  return {
    end_date: calculateEndDate(startDate, durationDays),
  };
}

/**
 * Sync duration when end date changes
 */
export function syncDurationFromEndDate(
  startDate: Date,
  endDate: Date,
  durationMode: DurationMode
): { duration_days: number; months_count: number } {
  const duration_days = calculateDurationDays(startDate, endDate);
  const months_count = calculateMonthsFromDays(duration_days);
  
  return {
    duration_days,
    months_count,
  };
}

/**
 * Sync duration when duration days change
 */
export function syncDurationFromDays(
  startDate: Date,
  durationDays: number
): { end_date: Date; months_count: number } {
  return {
    end_date: calculateEndDate(startDate, durationDays),
    months_count: calculateMonthsFromDays(durationDays),
  };
}

/**
 * Sync duration when months change (MONTH mode only)
 */
export function syncDurationFromMonths(
  startDate: Date,
  monthsCount: number
): { duration_days: number; end_date: Date } {
  const duration_days = calculateDaysFromMonths(monthsCount);
  const end_date = calculateEndDate(startDate, duration_days);
  
  return {
    duration_days,
    end_date,
  };
}

/**
 * Calculate line item totals with factor-based pricing
 */
export function calculateLineItemTotals(pricing: LineItemPricing): LineItemTotals {
  const { duration } = pricing;
  
  // Calculate duration factor
  const duration_factor = calculateDurationFactor(
    duration.duration_days,
    duration.duration_mode,
    duration.months_count
  );
  
  // Apply factor to all monthly rates
  const line_base_rate = Math.round((pricing.base_rate_month * duration_factor) * 100) / 100;
  const line_card_rate = Math.round((pricing.card_rate_month * duration_factor) * 100) / 100;
  const line_negotiation_rate = Math.round((pricing.negotiated_rate_month * duration_factor) * 100) / 100;
  const line_printing_charge = Math.round(((pricing.printing_rate_month || 0) * duration_factor) * 100) / 100;
  const line_mounting_charge = Math.round(((pricing.mounting_rate_month || 0) * duration_factor) * 100) / 100;
  
  const line_subtotal = line_negotiation_rate + line_printing_charge + line_mounting_charge;
  
  return {
    line_base_rate,
    line_card_rate,
    line_negotiation_rate,
    line_printing_charge,
    line_mounting_charge,
    line_subtotal,
    duration_factor,
  };
}

/**
 * Calculate discount based on card rate and negotiated price
 */
export function calculateDiscount(cardRateMonth: number, negotiatedRateMonth: number, factor: number) {
  const cardRateTotal = cardRateMonth * factor;
  const negotiatedTotal = negotiatedRateMonth * factor;
  const discountValue = Math.max(0, cardRateTotal - negotiatedTotal);
  const discountPercent = cardRateTotal > 0 ? (discountValue / cardRateTotal) * 100 : 0;
  
  return {
    value: Math.round(discountValue * 100) / 100,
    percent: Math.round(discountPercent * 100) / 100,
  };
}

/**
 * Calculate profit based on base rate and negotiated price
 */
export function calculateProfit(baseRateMonth: number, negotiatedRateMonth: number, factor: number) {
  const baseRateTotal = baseRateMonth * factor;
  const negotiatedTotal = negotiatedRateMonth * factor;
  const profitValue = negotiatedTotal - baseRateTotal;
  const profitPercent = baseRateTotal > 0 ? (profitValue / baseRateTotal) * 100 : 0;
  
  return {
    value: Math.round(profitValue * 100) / 100,
    percent: Math.round(profitPercent * 100) / 100,
  };
}

/**
 * Validate duration inputs
 */
export function validateDuration(duration: Partial<LineItemDuration>): {
  isValid: boolean;
  message?: string;
} {
  if (duration.duration_days !== undefined && duration.duration_days < 1) {
    return { isValid: false, message: 'Duration must be at least 1 day' };
  }
  
  if (duration.duration_mode === 'MONTH' && duration.months_count !== undefined) {
    if (duration.months_count < 0.5) {
      return { isValid: false, message: 'Months must be at least 0.5' };
    }
  }
  
  if (duration.start_date && duration.end_date) {
    if (duration.end_date < duration.start_date) {
      return { isValid: false, message: 'End date must be after start date' };
    }
  }
  
  return { isValid: true };
}
