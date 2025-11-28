// Utility functions for plans and quotations
// Import the new billing engine for core calculations
import {
  calculateDurationDays as calcDays,
  BILLING_CYCLE_DAYS,
} from './billingEngine';

/**
 * Calculate duration in days between two dates (inclusive)
 * Example: 10 Nov to 19 Nov = 10 days (not 9)
 * @deprecated Use calculateDurationDays from billingEngine instead
 */
export function calculateDurationDays(startDate: Date, endDate: Date): number {
  return calcDays(startDate, endDate);
}

/**
 * Calculate pro-rata rate based on monthly rate and number of days
 * Formula: (monthly_rate / BILLING_CYCLE_DAYS) × number_of_days
 * @deprecated Use calculateLineItemTotals from billingEngine instead
 */
export function calculateProRata(monthlyRate: number, days: number): number {
  if (!monthlyRate || !days || days < 0) return 0;
  const dailyRate = monthlyRate / BILLING_CYCLE_DAYS;
  return Math.round(dailyRate * days * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate GST amount
 */
export function calculateGST(amount: number, gstPercent: number): number {
  return (amount * gstPercent) / 100;
}

/**
 * Calculate grand total with GST
 */
export function calculateGrandTotal(amount: number, gstPercent: number): number {
  const gst = calculateGST(amount, gstPercent);
  return amount + gst;
}

/**
 * Calculate plan item totals with pro-rata pricing
 */
export function calculatePlanItemTotals(
  monthlyRate: number,
  days: number,
  printingCharges: number = 0,
  mountingCharges: number = 0,
  gstPercent: number = 18
) {
  const proRataPrice = calculateProRata(monthlyRate, days);
  const subtotal = proRataPrice + printingCharges + mountingCharges;
  const gstAmount = calculateGST(subtotal, gstPercent);
  const totalWithGst = subtotal + gstAmount;
  
  return {
    proRataPrice: Math.round(proRataPrice * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    totalWithGst: Math.round(totalWithGst * 100) / 100,
  };
}

/**
 * Generate plan ID in format PLAN-YYYY-Month-XXX
 * Calls database function to get next sequential ID
 */
export async function generatePlanIdFromDB(supabase: any): Promise<string> {
  const { data, error } = await supabase.rpc('generate_plan_id');
  
  if (error) {
    console.error('Error generating plan ID:', error);
    // Fallback to client-side generation if DB function fails
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `PLAN-${year}-${month}-${random}`;
  }
  
  return data;
}

/**
 * Legacy: Generate plan ID in format PLAN-YYYYMM-XXXX
 */
export function generatePlanId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `PLAN-${year}${month}-${random}`;
}

/**
 * Get status color for plan badges
 */
export function getPlanStatusColor(status: string): string {
  switch (status) {
    case 'Draft':
      return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
    case 'Pending':
      return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    case 'Sent':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    case 'Approved':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'Rejected':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    case 'Converted':
      return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
