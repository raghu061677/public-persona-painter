

## Fix: Asset Code UUID Display and Per-Asset Invoice Items

### Problem
1. **Asset codes show as UUIDs** (e.g., `MNS-98808d58-459e-4ec6-bf25-71ad754deb33`) instead of readable codes (e.g., `MNS-HYD-PUB-0001`) in invoice previews and PDFs.
2. **Root cause**: All three invoice generation paths fail to fetch and store `media_asset_code` from the `media_assets` table when creating invoice items. They store only the UUID `asset_id`.
3. **Hydration fallback issue**: Both `InvoiceTemplateZoho.tsx` and `generateInvoicePDF.ts` have UUID fallbacks in their `maCodeMap` construction (line `m.media_asset_code || m.id`), so when `media_asset_code` is missing from stored items, the UUID leaks through.

### Affected Files and Changes

#### 1. `src/components/campaigns/GenerateInvoiceDialog.tsx`
- **Before**: Items are built from `campaignAssets` without fetching `media_asset_code`.
- **Fix**: Before building items, fetch `media_asset_code` from `media_assets` for all `asset_id`s. Store it as `asset_code` and `media_asset_code` in each item.

#### 2. `src/components/campaigns/billing/CampaignBillingTab.tsx`
- **Both single and monthly invoice generators** create summary-only items (no per-asset detail).
- **Fix**: Replace summary items with per-asset detailed items that include `asset_code`, `location`, `area`, `dimensions`, etc. -- matching the standard from the memory entries. Fetch `media_asset_code` from `media_assets` for proper codes.

#### 3. `src/lib/invoices/generateInvoicePDF.ts` (line 98)
- **Before**: `maCodeMap` fallback is `m.media_asset_code || m.id` -- UUID leaks when code is null.
- **Fix**: Change to `m.media_asset_code || null` so UUID never becomes the "code". The `formatAssetDisplayCode` utility already handles UUID fallbacks properly via `getAssetDisplayCode`.

#### 4. `src/components/invoices/InvoiceTemplateZoho.tsx` (line 108)
- **Before**: Same UUID fallback: `ma.media_asset_code || ca.asset_id || '-'`
- **Fix**: Use `ma.media_asset_code || null` and let the `formatAssetDisplayCode` function handle fallback display properly (it shows `ASSET-XXXXXX` for UUIDs instead of raw UUIDs).

#### 5. `src/pages/InvoiceCreate.tsx`
- Already fetches `media_asset_code` via join -- verify it stores as `asset_code` properly.

### Summary of Changes

| File | What Changes |
|------|-------------|
| `GenerateInvoiceDialog.tsx` | Fetch `media_asset_code` from `media_assets`, store as `asset_code` in invoice items |
| `CampaignBillingTab.tsx` | Replace summary items with per-asset detailed items including `asset_code`, `location`, `dimensions`, etc. |
| `generateInvoicePDF.ts` | Fix `maCodeMap` UUID fallback to `null` instead of `m.id` |
| `InvoiceTemplateZoho.tsx` | Fix asset_code fallback to avoid raw UUIDs |

### Technical Detail

The `formatAssetDisplayCode` function already handles UUIDs properly by showing `ASSET-XXXXXX` (last 6 chars). The issue is that upstream code was storing the full UUID as `asset_code`, bypassing this logic. By ensuring `media_asset_code` is always fetched and stored at invoice creation time, and fixing fallbacks to never treat UUIDs as display codes, the problem is permanently resolved.

After these fixes, the user can regenerate invoice `INV/2025-26/0014` (which is currently Cancelled) and it will display the correct asset code `MNS-HYD-PUB-0001`.

