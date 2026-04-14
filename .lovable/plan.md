

## Plan: Ensure Invoice FY Determination Uses Only Invoice Date

### Current State (Audit Results)

After thorough investigation, the core FY logic is **already correct**:

- **DB RPCs** (`finalize_invoice_number`, `preview_next_invoice_number`): Both derive FY from `invoice_date` using month >= 4 logic. Correct.
- **`getFinancialYear()` utility** (`src/utils/finance.ts`): Uses `getMonth() >= 3` (April+). Correct.
- **Invoice List FY filter**: Filters by `invoice_date`, not `due_date`. Correct.
- **Invoice Detail page**: Passes `invoice_date` to preview RPC. Correct.
- **`InvoiceMetadataEditor`**: On save → `onUpdate` → refetch → re-preview with new date. Correct.

### What Needs Fixing

**1. Add visible FY label on Invoice Detail page** — Currently the page shows no explicit FY label, so users can't confirm which FY the invoice belongs to. Add a clear "FY 2025-26" badge next to the invoice number/preview.

**2. Refresh preview number immediately when invoice date changes** — Currently requires a full save+refetch cycle. Add immediate preview refresh when the date field changes in `InvoiceMetadataEditor`.

**3. Hardcoded FY boundary in AssetCycleBillingPreview** — The smart date logic uses `new Date(2026, 3, 1)` which is hardcoded to 2026. Replace with dynamic FY boundary calculation using `getFinancialYear()`.

### Files to Change

| File | Change |
|------|--------|
| `src/pages/InvoiceDetail.tsx` | Add FY label badge derived from `invoice.invoice_date` using `getFinancialYear()`. Expose `fetchPreviewNumber` so metadata editor can trigger immediate refresh. |
| `src/components/invoices/InvoiceMetadataEditor.tsx` | Accept optional `onInvoiceDateChange` callback; call it on date change to trigger preview refresh before save. |
| `src/components/campaigns/billing/AssetCycleBillingPreview.tsx` | Replace hardcoded `new Date(2026, 3, 1)` with dynamic FY start calculation. |

### What Remains Backward Compatible

- No DB migration needed — RPCs already correct
- No changes to finalized invoice numbers
- No changes to stored totals/tax values
- No changes to `getFinancialYear()` utility
- Invoice List FY filtering unchanged (already uses `invoice_date`)
- `due_date` is never used for FY determination anywhere

### Verification Points

- Invoice Date = 2026-03-31 → FY badge shows "2025-26", preview shows `INV/2025-26/XXXX`
- Invoice Date = 2026-04-01 → FY badge shows "2026-27", preview shows `INV/2026-27/XXXX`
- Changing only Due Date does not change FY badge or preview number
- Changing Invoice Date across FY boundary updates preview immediately

