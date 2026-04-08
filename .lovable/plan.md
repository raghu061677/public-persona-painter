

## Fix: CAM-202511-0002 Overdue Status + DRAFT Invoice FY Date

### Issue 1: CAM-202511-0002 (Indian Academy) Showing Overdue

**Root Cause**: The campaign runs Nov 13 – Dec 12, 2025. Its billable months are `2025-11` and `2025-12`. The paid invoice (INV/2025-26/0008) has:
- `billing_month: 2026-01` (wrong — should be 2025-11 or cover both months)
- Items have no `booking_start_date` / `booking_end_date` fields
- No `invoice_period_start` / `invoice_period_end`

So `extractInvoicedMonths` falls through to `billing_month = 2026-01`, which doesn't match `2025-11` or `2025-12`. Both months remain "pending" and are marked overdue (month-end + 3 days passed long ago).

**Fix**: Database data correction — update INV/2025-26/0008 to set correct period fields so the invoice status engine can recognize it covers the campaign's billing months:
- Set `billing_month` to `2025-11`
- Set `invoice_period_start` to `2025-11-13`
- Set `invoice_period_end` to `2025-12-12`

This is a data-only fix. The invoice was generated during early development before the smart billing engine was built, so the fields were never populated correctly.

### Issue 2: DRAFT-1775634880491-595 Has Wrong Invoice Date

**Root Cause**: This draft invoice for campaign CAM-202601-0003 (Aravinda, Jan–Mar 2026) has:
- `invoice_date: 2026-04-08` (today) — should be `2026-03-31` for FY 2025-26
- `billing_month: 2026-04` — wrong, period is Jan–Mar 2026
- `invoice_period_start: 2026-01-01`, `invoice_period_end: 2026-03-31` — these are correct

The `getSmartInvoiceDate()` function uses the `billing_month` to decide whether to backdate. Since the user selected `2026-04` from the dropdown (or the month was calculated incorrectly), the smart date check saw April 2026 as FY 2026-27 and did NOT backdate.

**Fix (2 parts)**:

**Part A — Data correction** (migration):
- Update this specific draft invoice: set `invoice_date` to `2026-03-31`, `due_date` to `2026-04-30`, `billing_month` to `2026-01`

**Part B — Code fix** in `MonthlyInvoiceGenerator.tsx`:
- Improve `getSmartInvoiceDate()` to also check `invoice_period_end` (not just billing_month). If the invoice period ends before April 2026, backdate to March 31 regardless of which billing month was selected.
- This prevents future occurrences when multi-month invoices are generated.

### Implementation

**1 migration file**: Corrects data for both invoices

```sql
-- Fix INV/2025-26/0008: set correct period for Indian Academy campaign
UPDATE invoices SET
  billing_month = '2025-11',
  invoice_period_start = '2025-11-13',
  invoice_period_end = '2025-12-12',
  updated_at = now()
WHERE id = 'INV/2025-26/0008';

-- Fix DRAFT invoice: backdate to FY 2025-26
UPDATE invoices SET
  invoice_date = '2026-03-31',
  due_date = '2026-04-30',
  billing_month = '2026-01',
  updated_at = now()
WHERE id = 'DRAFT-1775634880491-595';
```

**1 code file**: `src/components/campaigns/billing/MonthlyInvoiceGenerator.tsx`

Update `getSmartInvoiceDate` to accept an optional `periodEnd` parameter:
```typescript
function getSmartInvoiceDate(billingMonth: string, periodEnd?: string): Date {
  const fy2627Start = new Date(2026, 3, 1);
  // Check period end date first (handles multi-month invoices)
  if (periodEnd) {
    const endDate = new Date(periodEnd);
    if (endDate < fy2627Start) {
      return new Date(2026, 2, 31);
    }
  }
  // Fallback: check billing month
  const [y, m] = billingMonth.split('-').map(Number);
  const billingDate = new Date(y, m - 1, 1);
  if (billingDate < fy2627Start) {
    return new Date(2026, 2, 31);
  }
  return new Date();
}
```

Update the call site to pass `periodEnd` when available.

### Impact
- CAM-202511-0002 will show "fully_invoiced" instead of "overdue"
- The draft invoice will have correct FY 2025-26 dating
- Future multi-month invoices will correctly backdate when period ends before April 2026

