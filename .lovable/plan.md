

## Fix: Credit Note Issue Error + Discount/TDS Settlement for INV/2025-26/0057

### Problem 1: "status is of type invoice_status but expression is of type text" (Still happening)

The previous fix updated the `issue_credit_note` RPC to use `::invoice_status` cast. However, there is a **separate trigger** (`apply_credit_note_to_invoice`, created in an earlier migration) that **also** fires when the credit note status changes to 'Issued'. This trigger updates the invoice `status` WITHOUT the enum cast, causing the error to persist.

**Flow causing the bug:**
```text
issue_credit_note RPC
  → Updates credit_notes.status = 'Issued'
  → Fires trigger: apply_credit_note_to_invoice()
    → Sets invoices.status = v_new_status (TEXT, no cast) ← ERROR HERE
  → RPC's own UPDATE to invoices never executes because trigger already failed
```

### Problem 2: How to handle the discount/TDS settlement

Your invoice breakdown:
- Invoice total: ₹1,75,230 (sub_total ₹1,48,500 + GST ₹26,730)
- One asset had maintenance issues → discount of ₹9,667.02 (pre-GST)
- Credit note: subtotal ₹9,667.02 + GST ₹1,740.06 = total ₹11,407.08
- After credit: effective invoice = ₹1,63,822.92
- Client deducted 2% TDS on taxable (₹1,38,832.98) = ₹2,776.66
- Client paid cash: ₹1,61,045 (approx ₹1,63,823 − ₹2,777)

**Steps after the fix:**
1. Issue the existing draft credit note (₹11,407.06)
2. Record payment: Cash ₹1,61,045 + TDS ₹2,776.66
3. Invoice settles to ~₹0 balance

### Fix (1 database migration)

**Replace the `apply_credit_note_to_invoice` trigger function** to add `::invoice_status` casts on all status assignments:

```sql
CREATE OR REPLACE FUNCTION public.apply_credit_note_to_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance NUMERIC(15,2);
  v_new_balance NUMERIC(15,2);
  v_new_status TEXT;
BEGIN
  IF NEW.status = 'Issued' AND (OLD.status IS NULL OR OLD.status != 'Issued') THEN
    SELECT COALESCE(balance_due, total_amount, 0)
    INTO v_current_balance
    FROM invoices WHERE id = NEW.invoice_id;
    
    v_new_balance := GREATEST(0, v_current_balance - NEW.total_amount);
    
    IF v_new_balance <= 0 THEN
      v_new_status := 'Paid';
    ELSE
      v_new_status := 'Partial';
    END IF;
    
    UPDATE invoices
    SET balance_due = v_new_balance,
        status = v_new_status::invoice_status,  -- FIX: add cast
        updated_at = now()
    WHERE id = NEW.invoice_id
      AND status NOT IN ('Draft'::invoice_status, 'Cancelled'::invoice_status);
  END IF;
  
  IF NEW.status = 'Cancelled' AND OLD.status = 'Issued' THEN
    UPDATE invoices
    SET balance_due = COALESCE(balance_due, 0) + OLD.total_amount,
        status = (CASE 
          WHEN COALESCE(balance_due, 0) + OLD.total_amount >= total_amount THEN 'Sent'
          ELSE 'Partial'
        END)::invoice_status,  -- FIX: add cast
        updated_at = now()
    WHERE id = NEW.invoice_id;
  END IF;
  
  RETURN NEW;
END;
$$;
```

Also update `validate_credit_note()` to cast any status comparisons if needed.

### No frontend changes needed

The existing credit note UI and payment recording panel already support this workflow. Once the trigger is fixed:
1. Click **Issue** on the draft credit note → it will work
2. Go to **Payments** tab → Record payment with cash amount + TDS amount
3. Invoice will auto-settle

### Impact
- Fixes the persistent enum cast error
- No data loss or schema changes
- Existing draft credit note (₹11,407.06) can be issued immediately after fix

