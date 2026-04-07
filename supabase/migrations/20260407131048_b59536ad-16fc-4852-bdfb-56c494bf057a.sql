
-- Step 1: Fix the trigger function
CREATE OR REPLACE FUNCTION public.auto_mark_invoice_overdue()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
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

-- Step 2: Drop and recreate bulk function
DROP FUNCTION IF EXISTS public.update_overdue_invoices();

CREATE FUNCTION public.update_overdue_invoices()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE invoices
  SET status = 'Overdue', updated_at = now()
  WHERE status = 'Sent'
    AND due_date < CURRENT_DATE
    AND COALESCE(balance_due, total_amount, 0) > 0;

  UPDATE invoices
  SET status = 'Sent', updated_at = now()
  WHERE status = 'Overdue'
    AND due_date >= CURRENT_DATE;
END;
$$;

-- Step 3: Fix currently incorrect invoices
UPDATE invoices
SET status = 'Sent', updated_at = now()
WHERE status = 'Overdue' AND due_date >= CURRENT_DATE;
