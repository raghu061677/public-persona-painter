

## Plan: Make All Plan/Campaign Exports Registration-Aware

### Problem
All PDF and Excel exports (Quotation, Visual Quotation, Release Order, Excel Export) fetch client address data directly from the `clients` table master record. They ignore the `plan.client_registration_id` field, so even when a Telangana registration is selected, exports show the legacy AP (Visakhapatnam) address.

### Affected Files
1. **`src/lib/exports/unifiedPDFExport.ts`** — 3 separate code paths all use raw `clientData`:
   - `generateROFromPlanData()` (Release Order) — lines 131-136
   - Standard quotation/estimate/work order path — lines 387-395
   - `generateFullDetailPDF()` — lines 453-466
   - `generateWithPhotosPDF()` — lines 569-573

2. **`src/lib/exports/generateVisualQuotationPDF.ts`** — lines 211-216, same pattern

3. **`src/lib/exports/unifiedExcelExport.ts`** — lines 35-92, same pattern

### Approach: Create a Shared Registration-Aware Client Resolver

Create a single helper function that all export paths call after fetching `clientData`. It checks `plan.client_registration_id`, and if present, fetches `client_registrations` and overrides billing address, GSTIN, city, state, pincode on the client object. If no registration exists, the client object passes through unchanged.

### Changes

**New helper** (in `src/lib/exports/resolveExportClient.ts`):
- `async function resolveExportClient(plan, clientData)` 
- If `plan.client_registration_id` exists, fetch `client_registrations` record
- Override: `billing_address_line1`, `billing_address_line2`, `billing_city`, `billing_state`, `billing_pincode`, `gst_number`, `name` (use `label` or `legal_name` if available, fallback to client name)
- Return enriched client object

**`src/lib/exports/unifiedPDFExport.ts`**:
- Import and call `resolveExportClient(plan, clientData)` in all 3 paths (RO, standard, full_detail/with_photos)
- Use the resolved client object instead of raw `clientData`

**`src/lib/exports/generateVisualQuotationPDF.ts`**:
- Same: call `resolveExportClient(plan, clientData)` after the client fetch

**`src/lib/exports/unifiedExcelExport.ts`**:
- Same: call `resolveExportClient(plan, clientData)` after the client fetch

### Safety
- No stored data changes — this only affects how exports read client addresses at generation time
- No financial formula changes — totals, GST amounts remain untouched
- Full backward compatibility — if no `client_registration_id`, behavior is identical to current
- No invoice/campaign data rewrite

