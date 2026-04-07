

## Fix: Invoices Incorrectly Showing "Overdue" Despite Future Due Dates

### Problem
Two invoices (`INV/2025-26/0068` with due date April 15, and `INV-Z/2026-27/0001` with due date April 14) are marked as "Overdue" in the database even though their due dates haven't passed yet. Today is April 7, 2026.

### Root Cause
There is a database trigger (`check_invoice_overdue_on_update`) that automatically marks invoices as "Overdue" when `due_date < CURRENT_DATE`. However, this trigger has two problems:

1. **No reverse logic**: If an invoice's due date is later updated to a future date, the trigger never reverts the status back to "Sent"
2. **Bulk function ran prematurely**: The `update_overdue_invoices()` function may have been called when these invoices had different due dates, or there was a timezone/date issue

### Plan

**Step 1: Fix the database trigger to handle both directions**

Update `auto_mark_invoice_overdue()` to:
- Mark as "Overdue" when `status = 'Sent'` AND `due_date < CURRENT_DATE` AND balance > 0
- **Revert to "Sent"** when `status = 'Overdue'` AND `due_date >= CURRENT_DATE` (due date was pushed forward)

```sql
CREATE OR REPLACE FUNCTION public.auto_mark_invoice_overdue()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'Sent' THEN
    IF NEW.due_date < CURRENT_DATE AND COALESCE(NEW.balance_due, NEW.total_amount, 0) > 0 THEN
      NEW.status := 'Overdue';
    END IF;
  ELSIF NEW.status = 'Overdue' THEN
    IF NEW.due_date >= CURRENT_DATE THEN
      NEW.status := 'Sent';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

**Step 2: Fix the two currently incorrect invoices**

Run a corrective update to revert the 2 invoices with future due dates back to "Sent":

```sql
UPDATE invoices 
SET status = 'Sent', updated_at = now()
WHERE status = 'Overdue' AND due_date >= CURRENT_DATE;
```

**Step 3: Update `update_overdue_invoices()` bulk function**

Add a reverse clause so the bulk function also fixes incorrectly-overdue invoices:

```sql
-- Also revert incorrectly overdue invoices
UPDATE invoices SET status = 'Sent', updated_at = now()
WHERE status = 'Overdue' AND due_date >= CURRENT_DATE;
```

### Files Changed
- **1 database migration** (trigger fix + data correction)
- No frontend code changes needed -- the view page correctly displays whatever status is in the DB

### Impact
- Non-breaking, additive change to existing trigger
- Fixes 2 currently affected invoices
- Prevents future occurrences when due dates are edited

