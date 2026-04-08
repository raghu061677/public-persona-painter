

## Fix: Invoice Preview Shows Campaign Total Instead of Monthly Amount

### Root Cause

**INV-Z/2026-27/0005** is a monthly invoice for April 2026 with a correct line total of ₹35,000 stored in the `invoices.items` JSONB. However, the preview shows ₹70,000 because:

1. **`InvoiceTemplateZoho.tsx` line 172**: The enrichment logic unconditionally overrides the invoice item's `rent_amount` with `campaign_assets.rent_amount`:
   ```
   const rentAmount = ca?.rent_amount != null ? ca.rent_amount : item.rent_amount;
   ```
   `campaign_assets.rent_amount` = 70,000 (full 2-month campaign total), while `item.rent_amount` = 35,000 (correct monthly amount).

2. **`generateInvoicePDF.ts` line 101**: Same issue in the fallback path:
   ```
   const rentAmt = ca.rent_amount || ca.negotiated_rate || ca.card_rate || 0;
   ```

### The Fix (2 files)

**Principle**: The invoice's own JSONB items are the source of truth for line pricing. Campaign assets should only fill missing metadata (location, dimensions, etc.), never override existing financial values.

**File 1: `src/components/invoices/InvoiceTemplateZoho.tsx`**
- Lines 172-175: Change pricing override to only fill gaps, not replace existing values:
  ```typescript
  // Only use campaign_assets pricing when the invoice item has NO pricing
  const rentAmount = item.rent_amount != null ? item.rent_amount : (ca?.rent_amount ?? item.rent_amount);
  const printingCharges = item.printing_charges != null ? item.printing_charges : (ca?.printing_charges ?? 0);
  const mountingCharges = item.mounting_charges != null ? item.mounting_charges : (ca?.mounting_charges ?? 0);
  ```
- This ensures monthly invoices keep their prorated amounts; campaign_assets only backfill when the invoice item is missing data entirely.

**File 2: `src/lib/invoices/generateInvoicePDF.ts`**
- Lines 100-104 (fallback rebuild path): Same fix — when rebuilding from campaign_assets for invoices that lack item detail, use the invoice's stored `rent_amount` first if available from the existing JSONB item:
  ```typescript
  const existing = items[idx] || {};
  const rentAmt = existing.rent_amount ?? existing.rate ?? ca.rent_amount ?? ca.negotiated_rate ?? 0;
  ```

### Additional Safety: Recalculate line total from components
In both files, after resolving rent/printing/mounting, recalculate `lineTotal` from those three values rather than trusting any pre-computed `amount` field.

### What stays untouched
- No database/schema changes
- No changes to invoice generation logic (the amounts are stored correctly)
- No changes to the trigger `sync_invoice_after_payment` (already correct)
- The balance_due of ₹35,000 is correct in the database — only the preview was wrong

### Expected Result
- Invoice preview for INV-Z/2026-27/0005 will show ₹35,000 (matching the database)
- All monthly split invoices will display their correct prorated amounts
- Campaign-level totals will never leak into monthly invoice previews

