

## Fix: Single Invoice Smart Date for FY 2025-26 Campaigns

### Problem

Campaign **CAM-2026-January-848** (Kidzonia, Nov 18 2025 – Feb 15 2026) is fully completed but has no invoice yet. When generating a **single invoice** now (April 8, 2026), the system uses `new Date()` as the invoice date, placing it in **FY 2026-27**. The campaign belongs to **FY 2025-26**.

The `getSmartInvoiceDate()` function already exists in `MonthlyInvoiceGenerator.tsx` and correctly backdates to March 31, 2026 for old-FY periods — but **`handleGenerateSingleInvoice` in `CampaignBillingTab.tsx` does not use it**.

### Fix

**File**: `src/components/campaigns/billing/CampaignBillingTab.tsx`

In `handleGenerateSingleInvoice` (around lines 266-278):

1. Add the same smart date logic inline (or extract the shared helper):
   - If `campaign.end_date` is before April 1, 2026 → set `invoice_date` to `2026-03-31` and `due_date` to `2026-04-30`
   - Otherwise use today's date as currently done

2. Specifically change:
   ```typescript
   // BEFORE (lines 266-278):
   const dueDate = new Date();
   dueDate.setDate(dueDate.getDate() + 30);
   // invoice_date: format(new Date(), 'yyyy-MM-dd'),

   // AFTER:
   const fy2627Start = new Date(2026, 3, 1);
   const campaignEnd = new Date(campaign.end_date);
   const invoiceDate = campaignEnd < fy2627Start
     ? new Date(2026, 2, 31)  // March 31, 2026
     : new Date();
   const dueDate = new Date(invoiceDate);
   dueDate.setDate(dueDate.getDate() + 30);
   // invoice_date: format(invoiceDate, 'yyyy-MM-dd'),
   ```

### What stays untouched
- No schema changes
- No finance calculation changes
- Monthly invoice generator unchanged
- Invoice amounts, GST, items all unchanged
- Only the date assignment for single invoices is corrected

