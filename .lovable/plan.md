

## Fix: Credit Note "Issue" Fails Due to Invoice Status Enum Mismatch

### Problem
When clicking "Issue Credit Note", the `issue_credit_note` RPC tries to set the invoice's `status` to `'Fully Credited'` or `'Partially Credited'`, but the `invoices.status` column uses the `invoice_status` enum which only allows: `Draft, Sent, Partial, Paid, Overdue, Cancelled`.

This causes the Postgres error: `column "status" is of type invoice_status but expression is of type text`.

### Fix (1 database migration)

Update the `issue_credit_note` RPC to use valid enum values when updating the invoice status:

- **`Fully Credited`** → Use `'Paid'` (the invoice is fully settled via credit)
- **`Partially Credited`** → Use `'Partial'` (partially settled)
- **`Sent`** remains `'Sent'` (already valid)

Additionally, cast the value explicitly to `invoice_status` to prevent future type mismatches.

```sql
CREATE OR REPLACE FUNCTION public.issue_credit_note(...)
  -- Lines 115-121 change from:
  IF v_new_credited >= v_invoice_total THEN
    v_new_status := 'Fully Credited';
  ELSIF v_new_credited > 0 THEN
    v_new_status := 'Partially Credited';
  ELSE
    v_new_status := 'Sent';
  END IF;

  -- To:
  IF (v_new_credited + v_invoice_paid) >= v_invoice_total THEN
    v_new_status := 'Paid';
  ELSIF v_new_credited > 0 THEN
    v_new_status := 'Partial';
  ELSE
    v_new_status := 'Sent';
  END IF;

  UPDATE public.invoices
  SET ... status = v_new_status::invoice_status ...
```

### Impact
- Fixes the error when issuing credit notes
- Uses semantically correct enum values that the rest of the system already understands
- No frontend changes needed

