

## Plan: GSTR-1 Sales Register — Extend Existing Invoice Export System

This is a large but well-scoped extension of the existing `invoiceExportMapper` + `exportInvoiceExcel` + `InvoiceExportDialog` stack. No new reporting engine needed.

---

### Files to Change

| File | Change |
|------|--------|
| `src/utils/exports/invoiceExportMapper.ts` | Add `gstr1_sales_register` to `ExportType`, labels, groups, sheet names, file slugs. Add GSTR-1 column keys. Add GSTR-1 prefilter logic. Add validation flag helpers. |
| `src/utils/exports/excel/exportInvoiceExcel.ts` | Add GSTR-1 specific column keys to `loadSavedColumnKeys`. Add 3-sheet workbook generation for `gstr1_sales_register` (Sales Register + Reconciliation + Summary). Add company header/GSTIN/period/timestamp to Sheet 1. |
| `src/utils/exports/pdf/exportInvoicePdf.ts` | Add GSTR-1 landscape mode with company header, report period, totals footer, page numbers, and footer note. |
| `src/components/invoices/InvoiceExportDialog.tsx` | When `gstr1_sales_register` is selected: lock date basis to `invoice_date`, show GSTR-1 specific filters (Tax Type, Billing Mode, GST Rate), show toggles (Include zero-GST, Include INV-Z, Include drafts, etc.), show enhanced KPI preview (Invoice Count, IGST/CGST/SGST totals, Excluded count), add smart search box, add group-by/sort options. |
| `src/pages/InvoicesList.tsx` | Add "Export GSTR-1" quick action button that opens `InvoiceExportDialog` pre-set to `gstr1_sales_register`. |
| `src/pages/GSTReports.tsx` | Add "Export GSTR-1 Sales Register" button in the exports tab or header area. |

---

### Technical Details

#### 1. New Export Type in `invoiceExportMapper.ts`

- Add `"gstr1_sales_register"` to `ExportType` union
- `EXPORT_TYPE_LABELS`: `"GSTR-1 Sales Register"`
- `EXPORT_TYPE_GROUPS`: Add to `"GST / GSTR Reports"` array
- `EXPORT_TYPE_SHEET_NAMES`: `"GSTR-1 Sales Register"`
- `EXPORT_TYPE_FILE_SLUGS`: `"GST_Filing_Report"`
- Add `GSTR1_SALES_REGISTER_KEYS`: exact 14 columns: `sno, client_name, client_gstin, campaign_display, display_period (split to bill_from/bill_to), invoice_number, invoice_date, total_value, rate_percent, taxable_value, igst, cgst, sgst`
- `isDetailedExportType`: return `true` for `gstr1_sales_register`
- `prefilterForExportType`: when `gstr1_sales_register`, exclude `is_draft=true`, `status in Cancelled/Void`, `rate_percent <= 0`, `invoice_number starts with INV-Z/`, `taxable_value <= 0` — unless override toggles are passed

#### 2. GSTR-1 Prefilter with Toggle Overrides

Add a new interface `GSTR1FilterOptions` with boolean toggles:
- `includeZeroGst`, `includeInvZ`, `includeZeroTaxable`, `includeDrafts`, `includeCancelled`
- `taxTypeFilter`: `"all" | "igst" | "cgst_sgst"`
- `billingModeFilter`: `"all" | "single_invoice" | "calendar_monthly" | "asset_cycle"`
- `gstRateFilter`: `number | null`
- `searchTerm`: string (searches invoice_no, client_name, gstin, campaign)

Pass these from dialog to prefilter function.

#### 3. Validation Flags

Add `getGSTR1ValidationFlags(inv: NormalizedInvoice)` returning array of warning strings:
- Missing GSTIN, missing invoice_no, missing invoice_date, missing campaign
- IGST row with CGST/SGST > 0, CGST/SGST row with IGST > 0
- Taxable/GST material mismatch, negative taxable value

#### 4. Excel 3-Sheet Workbook (`exportInvoiceExcel.ts`)

When `exportType === "gstr1_sales_register"`:
- **Sheet 1 "GSTR-1 Sales Register"**: Company name, GSTIN, report title, period, generated timestamp in merged header rows. Then frozen header row with 14 columns. Data rows. Totals row at bottom. Indian currency, dd-MM-yyyy dates.
- **Sheet 2 "Reconciliation"**: Counts of included/excluded invoices by category (drafts, cancelled, zero-GST, INV-Z, zero taxable). Validation issue summary. Row-level validation issues if any.
- **Sheet 3 "Summary"**: Grouped totals by month and tax type using existing `aggregateMonthwise` + custom tax-type grouping.
- Filename: `GST_Filing_Report_<CompanyName>_<Period>.xlsx`

#### 5. PDF Export (`exportInvoicePdf.ts`)

When `gstr1_sales_register`:
- Force landscape orientation
- Company header with GSTIN
- Report period subtitle
- 14-column table with repeated headers
- Totals footer
- Footer note: "System Generated Report — For GST Reconciliation Use"
- Page numbers

#### 6. Dialog Enhancements (`InvoiceExportDialog.tsx`)

Conditional sections shown only when `exportType === "gstr1_sales_register"`:
- Lock `dateBasis` to `"invoice_date"` (disable selector)
- **Filters section**: Tax Type dropdown (All/IGST/CGST+SGST), Billing Mode dropdown, GST Rate dropdown, smart search input
- **Toggles section**: 5 checkboxes (Include zero-GST, Include INV-Z, Include zero taxable, Include drafts, Include cancelled/void) — all default OFF
- **Enhanced KPI preview**: Show Invoice Count, Total Taxable, Total IGST, Total CGST, Total SGST, Total Tax, Total Invoice Value, Excluded Count
- **Group By / Sort**: dropdowns for grouping (None/Month/Client/GST Rate/Tax Type/Billing Mode) and sort (Invoice Date/Number/Client/Taxable/Total + Asc/Desc)
- Add system preset `"sys_gstr1"` with name "GSTR-1 Sales Register"

#### 7. Quick Action Buttons

- `InvoicesList.tsx`: Add a "Export GSTR-1" button next to existing export button. Opens dialog with `exportType` pre-set to `gstr1_sales_register`.
- `GSTReports.tsx`: Add "Export GSTR-1 Sales Register" button in the header or exports tab area.

---

### What Will NOT Change

- Invoice creation, numbering, finalization logic
- GST SQL views module (`gst_b2b_v`, etc.)
- All 15 existing export types — unchanged
- Normal invoice list visibility — zero-GST and INV-Z remain visible
- No database migrations required
- `normalizeInvoice()` function — no changes needed (already maps all required fields)

### Safety

- All GSTR-1 exclusion rules apply only when `exportType === "gstr1_sales_register"`
- Toggle overrides let users include excluded categories when needed
- Existing `normalizeInvoices()` default filter (excludes Draft+Cancelled) is bypassed for GSTR-1 since we apply our own stricter filter that also handles toggles
- Company/tenant isolation preserved via existing Supabase RLS

