// Utility functions for finance module

/**
 * Get current financial year in format YYYY-YY
 */
export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${year}-${(year + 1).toString().slice(2)}`;
}

/**
 * Get financial year date range
 */
export function getFYRange(date: Date = new Date()): { start: Date; end: Date; label: string } {
  const y = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return {
    start: new Date(y, 3, 1, 0, 0, 0), // April 1
    end: new Date(y + 1, 2, 31, 23, 59, 59), // March 31
    label: `${y}-${(y + 1).toString().slice(2)}`
  };
}

/**
 * Generate estimation ID
 */
export async function generateEstimationId(supabase: any): Promise<string> {
  const { data, error } = await supabase.rpc('generate_estimation_id');
  if (error) {
    console.error('Error generating estimation ID:', error);
    const fy = getFinancialYear();
    return `EST-${fy}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  }
  return data;
}

/**
 * Generate invoice ID
 * @param supabase - Supabase client
 * @param gstRate - GST rate (0 for zero-rated invoices, uses INV-Z prefix)
 * @returns Invoice ID with appropriate prefix (INV or INV-Z)
 */
export async function generateInvoiceId(supabase: any, gstRate?: number): Promise<string> {
  // IMPORTANT: Default to 0 (not 18) so callers that forget to pass gstRate
  // don't accidentally generate a taxable prefix for zero-GST invoices.
  // Callers MUST pass the actual GST rate from the campaign/client.
  const effectiveRate = gstRate ?? 0;
  const { data, error } = await supabase.rpc('generate_invoice_id', { 
    p_gst_rate: effectiveRate 
  });
  if (error) {
    console.error('Error generating invoice ID:', error);
    const fy = getFinancialYear();
    // Use appropriate prefix based on GST rate
    const prefix = gstRate === 0 ? 'INV-Z' : 'INV';
    const period = new Date().toISOString().slice(0, 7).replace('-', '');
    return `${prefix}-${period}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  }
  return data;
}

/**
 * Determine invoice prefix based on GST rate
 * INV for taxable (GST > 0), INV-Z for zero-rated (GST = 0)
 */
export function getInvoicePrefix(gstRate: number): 'INV' | 'INV-Z' {
  return gstRate === 0 ? 'INV-Z' : 'INV';
}

/**
 * Generate expense ID
 */
export async function generateExpenseId(supabase: any): Promise<string> {
  const { data, error } = await supabase.rpc('generate_expense_id');
  if (error) {
    console.error('Error generating expense ID:', error);
    const fy = getFinancialYear();
    return `EXP-${fy}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  }
  return data;
}

/**
 * Get status color for estimations
 */
export function getEstimationStatusColor(status: string): string {
  switch (status) {
    case 'Draft':
      return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
    case 'Sent':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    case 'Approved':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'Rejected':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Get status color for invoices
 */
export function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case 'Draft':
      return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
    case 'Sent':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    case 'Paid':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'Overdue':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    case 'Cancelled':
      return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Calculate days overdue
 */
export function getDaysOverdue(dueDate: string | Date): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Get aging bucket for invoice
 */
export function getAgingBucket(daysOverdue: number): string {
  if (daysOverdue === 0) return 'Current';
  if (daysOverdue <= 30) return '0-30 days';
  if (daysOverdue <= 60) return '31-60 days';
  if (daysOverdue <= 90) return '61-90 days';
  return '90+ days';
}

/**
 * Format currency for India
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
