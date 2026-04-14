

## Plan: Phase 2 — Asset Cycle Billing Invoice Generation

### Summary
Enable row-wise invoice generation from the Asset Cycle Billing Schedule. Each cycle row gets a "Generate" button that creates one invoice for that exact cycle window, with duplicate prevention via 3 new nullable columns on `invoices`.

### Database Migration

Add 3 nullable columns to `invoices` (non-breaking, no impact on existing records):

```sql
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS billing_mode text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cycle_start_date date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cycle_end_date date;
```

### Files Changed

**1. `src/components/campaigns/billing/AssetCycleBillingPreview.tsx`**

Major changes — this is the core of Phase 2:

- Add new props: `campaignId`, `clientId`, `clientName`, `companyId`, `campaignName`, `taxType`, `onInvoiceGenerated`
- Add state for `cycleInvoices` — fetched from DB on mount, filtered by `billing_mode = 'asset_cycle'` and matching campaign
- Add `handleGenerateCycleInvoice(bucket)` function that:
  1. **Duplicate check**: queries `invoices` where `campaign_id` + `billing_mode = 'asset_cycle'` + `cycle_start_date` + `cycle_end_date` match — if found, toast error and abort
  2. Calls `buildRegistrationSnapshot(campaignId)` for registration-aware snapshots
  3. Fetches `media_asset_code` for assets in the bucket
  4. Builds `items[]` array from `bucket.assets` — each asset becomes a line item with:
     - `rate` / `rent_amount` = `asset.cycleAmount` (already prorated by generator)
     - `description` includes cycle period text
     - `booking_start_date` / `booking_end_date` = cycle window dates
  5. Calculates subtotal, GST, total using `gstPercent`
  6. Inserts invoice with:
     - `billing_mode: 'asset_cycle'`
     - `cycle_start_date` / `cycle_end_date` = bucket period
     - `invoice_period_start` / `invoice_period_end` = bucket period (reuse existing columns)
     - `is_monthly_split: false`
     - Registration snapshot fields
     - `status: 'Draft'`
  7. Refreshes cycle invoices list, calls `onInvoiceGenerated`

- Update table row rendering:
  - Check if bucket has a matching invoice in `cycleInvoices`
  - If invoiced: show "Invoiced" badge + invoice ID link, disable Generate button
  - If not: show active "Generate" button

- Remove "Preview" badge from header, update info note text

**2. `src/components/campaigns/billing/CampaignBillingTab.tsx`**

- Pass additional props to `AssetCycleBillingPreview`:
  - `campaignId={campaign.id}`
  - `clientId={campaign.client_id}`
  - `clientName={campaign.client_name}`
  - `companyId={campaign.company_id}`
  - `campaignName={campaign.campaign_name}`
  - `taxType={campaign.tax_type}`
  - `onInvoiceGenerated={() => { fetchExistingInvoices(); onRefresh?.(); }}`
- Remove "Preview" badge from the billing mode radio label
- Update `fetchExistingInvoices` to also detect `billing_mode = 'asset_cycle'` for auto-mode detection

### Invoice Generation Logic

```
per asset in bucket:
  cycleAmount = (negotiated_rate / 30) × cycleDays   // already computed by generator
  
subtotal = sum of all asset cycleAmounts in bucket
gstAmount = subtotal × (gstPercent / 100)
total = subtotal + gstAmount
```

### Duplicate Prevention

Before insert, query:
```sql
SELECT id FROM invoices 
WHERE campaign_id = ? 
  AND billing_mode = 'asset_cycle' 
  AND cycle_start_date = ? 
  AND cycle_end_date = ?
  AND status != 'Cancelled'
LIMIT 1
```
If found → block with toast message. Simple, safe, no complex asset-level dedup needed since buckets are deterministic (same dates = same assets).

### What Stays Unchanged
- Calendar Monthly billing logic — zero changes
- Single Invoice mode — zero changes  
- `generateAssetCycles` utility — zero changes
- Existing invoices — no modification
- Finance calculations, PDFs, exports — untouched
- `computeCampaignTotals` — untouched

### Assumptions & Limitations
- One-time charges (printing/mounting) are NOT included in cycle invoices (consistent with Phase 1 preview)
- No "Generate All Cycles" bulk button in this phase
- Partially invoiced cycle rows not supported — whole-row only
- Invoice finalization (DRAFT → permanent number) follows existing flow when user finalizes from invoice detail page

