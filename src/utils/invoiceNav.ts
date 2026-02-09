/**
 * Navigate to invoice detail with encoded ID (handles slashes in IDs like INV/2025-26/0001)
 */
export function getInvoiceDetailPath(invoiceId: string): string {
  return `/admin/invoices/view/${encodeURIComponent(invoiceId)}`;
}
