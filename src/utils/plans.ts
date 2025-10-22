// Utility functions for plans and quotations

/**
 * Calculate duration in days between two dates
 */
export function calculateDurationDays(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
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
 * Calculate plan item totals
 */
export function calculatePlanItemTotals(
  salesPrice: number,
  printingCharges: number = 0,
  mountingCharges: number = 0,
  gstPercent: number = 18
) {
  const subtotal = salesPrice + printingCharges + mountingCharges;
  const gstAmount = calculateGST(subtotal, gstPercent);
  const totalWithGst = subtotal + gstAmount;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    totalWithGst: Math.round(totalWithGst * 100) / 100,
  };
}

/**
 * Generate plan ID in format PLAN-YYYYMM-XXXX
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
