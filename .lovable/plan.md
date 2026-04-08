

## Fix: Generate Button Not Appearing After Invoice Cancellation (Monthly Mode)

### Root Cause

**INV/2026-27/0010** has `is_monthly_split: true`, so it's classified as a **monthly** invoice (not single). The monthly billing path has two places that don't account for cancelled invoices:

1. **`MonthlyBillingScheduleTable.tsx` line 62-72**: `getInvoiceForPeriod()` finds the cancelled invoice for April 2026, sets `hasInvoice = true`, and shows "View" instead of "Generate".

2. **`CampaignBillingTab.tsx` line 570**: `existingInvoices.length === 0` hides the "Generate All" button because the cancelled invoice is still counted.

The single-invoice mode was already fixed in the previous round (line 712), but the monthly mode was missed.

### Fix (2 files, 2 small changes)

**File 1: `src/components/campaigns/billing/MonthlyBillingScheduleTable.tsx`**
- Line 63: Filter out Cancelled invoices in `getInvoiceForPeriod`:
  ```
  return existingInvoices.filter(inv => inv.status !== 'Cancelled').find(inv => { ... });
  ```

**File 2: `src/components/campaigns/billing/CampaignBillingTab.tsx`**
- Line 570: Change `existingInvoices.length === 0` to exclude cancelled invoices:
  ```
  existingInvoices.filter(inv => inv.status !== 'Cancelled').length === 0
  ```

### What stays untouched
- No schema changes
- No finance engine changes
- No single invoice mode changes (already working)
- No credit note or payment flow changes
- Cancelled invoices remain visible in the invoice list for audit trail

### Expected Result
After the fix, navigating to CAM-202604-0011 billing tab will show the "Generate" button for April 2026 since the cancelled invoice is ignored.

