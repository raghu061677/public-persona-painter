

## Fix: Credit Note Dialog Showing Wrong Item Amounts

### Problem
The Create Credit Note dialog for `INV/2025-26/0057` shows incorrect item amounts. The JSONB `items` array stores **full campaign-period amounts** (e.g., ₹39,000 per item, sum = ₹4,28,570), but the invoice's actual `sub_total` is ₹1,48,499.67 (prorated for the billing month). The dialog picks up the raw `amount` field from each item and adds 18% GST on top, producing a credit note total of ~₹3,31,674 — nearly double the actual invoice total of ₹1,75,229.61.

### Root Cause
In `CreateCreditNoteDialog.tsx`, `getItemAmount()` (line 105-107) returns `item.amount` directly from the JSONB. These amounts represent the full rent + mounting + printing for the entire campaign period, not the prorated amount that was actually billed.

### Fix (1 file)

**File: `src/components/finance/CreateCreditNoteDialog.tsx`**

1. When building credit note items from invoice JSONB (lines 129-136), calculate each item's **proportional share** of the actual invoice `sub_total` instead of using the raw `amount`:

```typescript
// Calculate proportional amounts
const rawTotal = invoiceItems.reduce((s, item) => s + getItemAmount(item), 0);
const invoiceSubtotal = invoice.sub_total ?? (invoice.total_amount / (1 + (invoice.gst_percent ?? 18) / 100));

setItems(invoiceItems.map((item) => {
  const rawAmt = getItemAmount(item);
  // Scale each item proportionally to match invoice sub_total
  const proportionalAmt = rawTotal > 0 
    ? Math.round((rawAmt / rawTotal) * invoiceSubtotal * 100) / 100 
    : 0;
  return {
    id: crypto.randomUUID(),
    description: buildDescription(item),
    amount: proportionalAmt,
    selected: true,
  };
}));
```

2. Add `sub_total` to the `CreateCreditNoteDialogProps` invoice interface and pass it from InvoiceDetail.tsx

3. Update the max credit validation: `maxCredit` should use `invoice.total_amount` (already correct)

**File: `src/pages/InvoiceDetail.tsx`**

4. Pass `sub_total` to the dialog props:
```typescript
sub_total: invoice.sub_total,
```

### Result
- Each item in the credit note will show its correct prorated amount matching the actual invoice billing
- The total (subtotal + GST) will correctly match the invoice total when all items are selected
- Existing validation (total cannot exceed invoice total_amount) continues to work

