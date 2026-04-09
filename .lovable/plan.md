

## Fix Plan: IGST Support in Plan/Quotation PDFs + Client ID Issue

### Problem Summary
1. **Plan PDF exports always show CGST/SGST** even when `tax_type = 'IGST'` is saved on the plan — the PDF template has no IGST rendering path
2. **GST is always split 50/50** in the export builders (`unifiedPDFExport.ts`, `generateVisualQuotationPDF.ts`) — they ignore `plan.tax_type` / `plan.igst_percent` / `plan.igst_amount`
3. **Client TG-0073** has Andhra Pradesh address but a Telangana-prefixed ID — this is a data entry error (wrong state selected at creation time). The code logic is correct; the client record needs manual correction in the database.

### Changes

**File 1: `src/lib/pdf/standardPDFTemplate.ts`**
- Add optional `igst` field to `PDFDocumentData` interface (alongside existing `cgst`/`sgst`)
- Add `isInterState` boolean to interface
- Update both summary table renderers (line ~397 and ~682) to conditionally show either:
  - `IGST @ 18%` (single row) when `isInterState = true`
  - `CGST @ 9%` + `SGST @ 9%` (two rows) when `isInterState = false`

**File 2: `src/lib/exports/unifiedPDFExport.ts`**
- Read `plan.tax_type` to determine inter-state vs intra-state
- When `tax_type === 'IGST'`: set `igst = gstTotal`, `cgst = 0`, `sgst = 0`, `isInterState = true`
- When `tax_type === 'CGST_SGST'` or default: keep current 50/50 split, `isInterState = false`
- Pass `igst` and `isInterState` to `generateStandardizedPDF()`

**File 3: `src/lib/exports/generateVisualQuotationPDF.ts`**
- Same tax_type-aware logic as File 2

**File 4: `src/lib/proforma/generateProformaPDF.ts`**
- Check if proforma also needs the same IGST support — apply same pattern

**Client ID (TG-0073):**
- The client "Street Media" was created with state = Telangana, so it got a TG- prefix. The address shows Andhra Pradesh. This is a data correction — the client's `state` field needs to be updated to "Andhra Pradesh" in the database. The client ID cannot be auto-changed (it's a primary key referenced across plans/campaigns/invoices). Options:
  - Leave existing ID as-is (safest, no referential integrity risk)
  - Or document it for manual review

### What stays untouched
- No schema changes
- No invoice logic changes
- No campaign billing changes
- No finance engine changes
- Client ID generation code is correct — this is a data issue only

