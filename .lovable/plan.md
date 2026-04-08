

## Fix: CAM-2026-January-001 Overdue + Show Payment Date in Billing Tab

### Issue 1: Campaign showing "Overdue" despite invoice being Paid

**Root Cause**: Campaign runs Jan 15 – Feb 8, 2026. Billable months = `2025-01`, `2025-02`. Invoice INV/2025-26/0011 has `billing_month: 2026-01` but no `invoice_period_start/end` and no `booking_start_date`/`booking_end_date` in items. So `extractInvoicedMonths` only picks up `2026-01`. Month `2026-02` is never matched → marked overdue.

**Fix**: Data correction — update INV/2025-26/0011 to set `invoice_period_start = 2026-01-15` and `invoice_period_end = 2026-02-08` so the engine recognizes both months as covered.

### Issue 2: Show payment date for paid invoices in Billing tab

**Root Cause**: The Generated Invoices section in `CampaignBillingTab.tsx` only fetches invoice fields — it doesn't query `payment_records` for payment dates.

**Fix**: 
1. After fetching invoices, fetch the latest `payment_date` from `payment_records` for each invoice
2. Display "Paid on: DD MMM YYYY" below the due date for invoices with status = 'Paid'

### Implementation

**1 data update**: Fix INV/2025-26/0011 period fields
```sql
UPDATE invoices SET
  invoice_period_start = '2026-01-15',
  invoice_period_end = '2026-02-08',
  updated_at = now()
WHERE id = 'INV/2025-26/0011';
```

**1 code file**: `src/components/campaigns/billing/CampaignBillingTab.tsx`

- In `fetchExistingInvoices`, after fetching invoices, also fetch payment records for paid invoices:
```typescript
// Fetch payment dates for paid invoices
const paidIds = (data || []).filter(inv => inv.status === 'Paid').map(inv => inv.id);
if (paidIds.length > 0) {
  const { data: payments } = await supabase
    .from('payment_records')
    .select('invoice_id, payment_date')
    .in('invoice_id', paidIds)
    .order('payment_date', { ascending: false });
  // Build a map: invoice_id → latest payment_date
}
```

- Store payment dates in state (e.g., `paymentDates` map)
- In the invoice card rendering (line ~626), add below the due date:
```tsx
{inv.status === 'Paid' && paymentDates[inv.id] && (
  <div className="text-xs text-green-600">
    Paid on: {format(new Date(paymentDates[inv.id]), "dd MMM yyyy")}
  </div>
)}
```

### Impact
- CAM-2026-January-001 will show "Fully Invoiced" instead of "Overdue"
- All paid invoices in the billing tab will show their payment date
- No schema changes needed

