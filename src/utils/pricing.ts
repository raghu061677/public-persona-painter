/**
 * Pricing calculation utilities for Plan Module
 */

/**
 * Calculate number of days inclusively between two dates
 * Example: 10 Nov to 19 Nov = 10 days (not 9)
 */
export function getDaysInclusive(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - start.getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(days, 1);
}

/**
 * Calculate pro-rata rate based on monthly rate and number of days
 * Formula: (monthly_rate / 30) × number_of_days
 */
export function calcProRata(monthlyRate: number, days: number): number {
  if (!monthlyRate || !days || days < 0) return 0;
  const dailyRate = monthlyRate / 30;
  return Math.round(dailyRate * days * 100) / 100;
}

/**
 * Calculate discount value and percentage
 * Discount = Card Rate - Negotiated Price
 */
export function calcDiscount(cardRate: number, negotiatedPrice: number) {
  const value = Math.round((cardRate - negotiatedPrice) * 100) / 100;
  const percent = cardRate > 0 ? Math.round((value / cardRate) * 10000) / 100 : 0;
  return { value, percent };
}

/**
 * Calculate profit value and percentage
 * Profit = Negotiated Price - Base Rate
 */
export function calcProfit(baseRate: number, negotiatedPrice: number) {
  const value = Math.round((negotiatedPrice - baseRate) * 100) / 100;
  const percent = baseRate > 0 ? Math.round((value / baseRate) * 10000) / 100 : 0;
  return { value, percent };
}

/**
 * Validate negotiated price against card rate and base rate
 */
export function validateNegotiatedPrice(
  negotiatedPrice: number,
  cardRate: number,
  baseRate: number
): { isValid: boolean; message?: string } {
  if (negotiatedPrice > cardRate) {
    return {
      isValid: false,
      message: "Negotiated price cannot exceed card rate."
    };
  }
  if (negotiatedPrice < baseRate) {
    return {
      isValid: false,
      message: "Negotiated price cannot be below base rate (below cost)."
    };
  }
  return { isValid: true };
}

/**
 * Calculate complete line item totals
 */
export function calculateLineItemTotals(
  cardRate: number,
  baseRate: number,
  negotiatedPrice: number,
  days: number,
  printingCharges: number = 0,
  mountingCharges: number = 0
) {
  const proRata = calcProRata(negotiatedPrice, days);
  const discount = calcDiscount(cardRate, negotiatedPrice);
  const profit = calcProfit(baseRate, negotiatedPrice);
  const subtotal = proRata + printingCharges + mountingCharges;

  return {
    proRata: Math.round(proRata * 100) / 100,
    discountValue: discount.value,
    discountPercent: discount.percent,
    profitValue: profit.value,
    profitPercent: profit.percent,
    subtotal: Math.round(subtotal * 100) / 100,
  };
}
