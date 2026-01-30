-- =============================================
-- Recreate Triggers for Invoice Automation
-- =============================================

-- Trigger 1: Auto-populate invoice_no from id
CREATE OR REPLACE FUNCTION public.set_invoice_no_from_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.invoice_no IS NULL THEN
    NEW.invoice_no := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_invoice_no_populated ON public.invoices;
CREATE TRIGGER ensure_invoice_no_populated
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION set_invoice_no_from_id();

-- Trigger 2: Auto-populate billing_month from invoice_date
CREATE OR REPLACE FUNCTION public.set_billing_month_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.billing_month IS NULL AND NEW.invoice_date IS NOT NULL THEN
    NEW.billing_month := to_char(NEW.invoice_date, 'YYYY-MM');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_billing_month_populated ON public.invoices;
CREATE TRIGGER ensure_billing_month_populated
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION set_billing_month_default();

-- Trigger 3: Auto-mark overdue invoices
CREATE OR REPLACE FUNCTION public.auto_mark_invoice_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process invoices that are Sent
  IF NEW.status = 'Sent' THEN
    -- Check if overdue: past due date with balance remaining
    IF NEW.due_date < CURRENT_DATE AND COALESCE(NEW.balance_due, NEW.total_amount, 0) > 0 THEN
      NEW.status := 'Overdue';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_invoice_overdue_on_update ON public.invoices;
CREATE TRIGGER check_invoice_overdue_on_update
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION auto_mark_invoice_overdue();

-- Function to bulk-update existing overdue invoices (callable manually or via cron)
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