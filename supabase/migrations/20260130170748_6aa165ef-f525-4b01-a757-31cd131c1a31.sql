-- =============================================
-- FIX 2: Update Auto-Overdue Functions with correct enum values
-- =============================================

-- Drop and recreate the trigger function with correct status values
CREATE OR REPLACE FUNCTION public.auto_mark_invoice_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process invoices that are Sent (the only status before Overdue)
  IF NEW.status = 'Sent' THEN
    -- Check if overdue: past due date with balance remaining
    IF NEW.due_date < CURRENT_DATE AND COALESCE(NEW.balance_due, NEW.total_amount, 0) > 0 THEN
      NEW.status := 'Overdue';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the bulk-update function with correct status
CREATE OR REPLACE FUNCTION public.update_overdue_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.invoices
  SET status = 'Overdue', updated_at = now()
  WHERE status = 'Sent'
    AND due_date < CURRENT_DATE
    AND COALESCE(balance_due, total_amount, 0) > 0;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Run the bulk update to fix existing overdue invoices
SELECT public.update_overdue_invoices();