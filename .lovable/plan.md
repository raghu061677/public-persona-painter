

## Fix: Invoice Date for Old FY 2025-26 Campaigns

### Problem
32 completed campaigns from FY 2025-26 have no invoices. When generating invoices now (April 2026), the system always sets `invoice_date = today`, which would:
- Place the invoice in FY 2026-27 series (INV/2026-27/xxxx)
- Create a date mismatch with the actual campaign period

### Solution
Add smart invoice date logic to the Monthly Invoice Generator. When the billing period falls within FY 2025-26 (before April 1, 2026), the invoice date defaults to **March 31, 2026** instead of today. This keeps the invoice in the correct FY series.

### Changes

**File: `src/components/campaigns/billing/MonthlyInvoiceGenerator.tsx`**

1. Add a helper function to determine the correct invoice date based on billing period:
   - If the billing month (e.g., `2025-12`, `2026-03`) is before April 2026, use `2026-03-31`
   - If the billing month is April 2026 or later, use today's date
   - This ensures the `finalize_invoice_number` RPC assigns the correct FY prefix

2. Update line 579 to use this smart date instead of `new Date()`

3. Update the due date calculation accordingly (30 days from invoice date)

4. Add a visible info banner in the dialog when backdating is applied, so the admin knows the invoice date will be March 31, 2026 instead of today

**File: `supabase/functions/auto-generate-invoice/index.ts`**

5. Apply the same FY-aware date logic (line 157) for the edge function path, in case it's used

### No database changes needed
The existing `finalize_invoice_number` RPC already handles FY detection from the invoice date. Setting invoice_date to March 31 will automatically assign it to the INV/2025-26/ series.

### How to use after implementation
1. Go to each old campaign's Billing tab
2. Select the billing period and generate the invoice as usual
3. The system will automatically set the invoice date to March 31, 2026
4. Finalize the invoice — it will get an INV/2025-26/ number

