

## Fix: Cycle invoice charges — single-row display + delete-aware re-attachment

Two real defects to fix, both in the cycle billing → invoice path. No schema breakage, no impact on existing finalized invoices.

### Defect 1 — Two rows for one asset (display + printing on separate lines)

**Why it happens:** When generating a cycle invoice, the printing/mounting charge is appended as an *independent* line item with `charge_type = "printing"`, then `InvoiceTemplateZoho.tsx` renders charge-typed items as their own row (lines 357-386). Result: the asset appears twice — once as Display, once as Printing.

**Desired behavior (per screenshot 1 reference):** A single row per asset showing `Display: ₹1,00,000` + `Printing: ₹8,000` stacked under the PRICING column, and `Line Total` = ₹1,08,000.

### Defect 2 — Charge stuck as "Invoiced" after draft deletion

**Why it happens:** In the migration, `campaign_charge_items.invoice_id` uses `ON DELETE SET NULL`, so when the draft invoice is deleted the FK is cleared — but `is_invoiced = true` is *not* reset. Result: regenerating the same cycle excludes the charge (filtered by `if (it.is_invoiced) continue` in `useCampaignChargeItems`’s grouping), and the panel shows the badge "Invoiced" forever.

The single existing affected charge for `CAM-202604-0024` is verified in DB: `invoice_id = NULL` but `is_invoiced = true`.

---

### Implementation

**A. Merge printing/mounting into the asset row at invoice generation**
*File:* `src/components/campaigns/billing/AssetCycleBillingPreview.tsx`

Change the charge-append loop (around lines 217-243) so charges with `campaign_asset_id` matching a display line in the same cycle are **merged into that line** instead of pushed as new items:

- For each pending cycle charge:
  - If `charge_type ∈ {printing, reprinting}` AND `campaign_asset_id` matches an existing display item → set `displayItem.printing_charges += amount`, recompute `displayItem.amount/total = rent_amount + printing_charges + mounting_charges`, attach `charge_item_id` into a new `merged_charge_ids[]` field (so we still know which charge row contributed, for the post-insert "mark invoiced" step).
  - Same for `mounting/remounting` → `mounting_charges`.
  - For `misc` or charges with no matching asset → keep current behavior (append as a charge-line row).

Result on the invoice JSONB items: one row per asset carrying the rent + printing + mounting amounts. The existing template already knows how to render this correctly (lines 428-432).

**B. Template — keep the merged-row path, leave the "lonely charge row" path untouched**
*File:* `src/components/invoices/InvoiceTemplateZoho.tsx`

No structural change needed; the merged items will not have `charge_type` set on the asset row, so they fall through to the standard asset renderer that already displays `Display / Printing / Installation` stacked. The standalone charge-line branch stays for misc/unattached charges.

**C. Reset `is_invoiced` when the linked invoice is deleted**

Two complementary fixes (defense in depth):

1. **App-level (immediate fix for current state and all future deletes):**
   *File:* `src/pages/InvoiceDetail.tsx` — in `handleDelete` (lines 121-153), before `delete().eq('id', invoiceId)`, run:
   ```ts
   await supabase
     .from('campaign_charge_items')
     .update({ is_invoiced: false, invoice_id: null })
     .eq('invoice_id', invoiceId);
   ```

2. **DB-level safety net (new migration):** Add a trigger on `invoices` `BEFORE DELETE` that resets `is_invoiced=false, invoice_id=null` for all charge items where `invoice_id = OLD.id`. Same migration also runs a one-time backfill:
   ```sql
   UPDATE public.campaign_charge_items
      SET is_invoiced = false
    WHERE is_invoiced = true AND invoice_id IS NULL;
   ```
   This unsticks the existing printing charge for `CAM-202604-0024` and any similar orphans.

**D. Charges panel — refresh after generation already wired**

`refetchCharges()` is already called after invoice insert (line 308). After fix C, regenerating a deleted draft will correctly find the charge as pending and re-attach it.

---

### Guardrails

- Only **draft cycle invoices** are deletable (existing rule in `handleDelete`). Finalized invoices remain immutable; their linked charges keep `is_invoiced=true` and never reset.
- Single Invoice and Calendar Monthly billing modes are not touched.
- Existing draft/finalized invoice JSONB items are not mutated — the merge logic only runs at *new* invoice generation time.
- Backfill is conservative: only resets rows where `invoice_id IS NULL` (orphaned), never touches charges still linked to a live invoice.

### Files changed

1. `src/components/campaigns/billing/AssetCycleBillingPreview.tsx` — merge printing/mounting charges into matching asset display lines.
2. `src/pages/InvoiceDetail.tsx` — reset charge items before deleting a draft invoice.
3. New `supabase/migrations/<ts>_charge_items_release_on_invoice_delete.sql` — `BEFORE DELETE` trigger on `invoices` + one-time backfill of orphaned `is_invoiced=true, invoice_id=null` rows.

### Expected result

- Regenerate the deleted cycle-1 draft → printing ₹8,000 reappears, panel chip moves from "Invoiced" back to "Cycle 1".
- New invoice renders **one row** for `MNS-HYD-PUB-0002` with Display ₹1,00,000, Printing ₹8,000, Line Total ₹1,08,000 — matching screenshot 1.
- Sub Total ₹1,08,000 · GST ₹19,440 · Grand Total ₹1,27,440 unchanged.

