-- Function to recalculate invoice payment status
CREATE OR REPLACE FUNCTION public.update_invoice_payment_status(p_invoice_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_paid NUMERIC(15,2);
  v_total_amount NUMERIC(15,2);
  v_balance NUMERIC(15,2);
  v_due_date DATE;
  v_current_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Get sum of payments for this invoice
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.payment_records
  WHERE invoice_id = p_invoice_id;

  -- Get invoice details
  SELECT 
    COALESCE(total_amount, 0),
    due_date,
    status
  INTO v_total_amount, v_due_date, v_current_status
  FROM public.invoices
  WHERE id = p_invoice_id;

  -- Calculate balance
  v_balance := v_total_amount - v_total_paid;

  -- Determine new status
  IF v_current_status = 'Draft' THEN
    v_new_status := 'Draft';
  ELSIF v_current_status = 'Cancelled' THEN
    v_new_status := 'Cancelled';
  ELSIF v_balance <= 0 THEN
    v_new_status := 'Paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'Partial';
  ELSIF v_due_date IS NOT NULL AND v_due_date < CURRENT_DATE THEN
    v_new_status := 'Overdue';
  ELSE
    v_new_status := COALESCE(v_current_status, 'Sent');
  END IF;

  -- Update invoice
  UPDATE public.invoices
  SET 
    paid_amount = v_total_paid,
    balance_due = v_balance,
    status = v_new_status,
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;

-- Trigger function to auto-update invoice on payment change
CREATE OR REPLACE FUNCTION public.trigger_update_invoice_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_invoice_payment_status(OLD.invoice_id);
    RETURN OLD;
  ELSE
    PERFORM public.update_invoice_payment_status(NEW.invoice_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on payment_records
DROP TRIGGER IF EXISTS trg_update_invoice_on_payment ON public.payment_records;
CREATE TRIGGER trg_update_invoice_on_payment
AFTER INSERT OR UPDATE OR DELETE ON public.payment_records
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_invoice_on_payment();

-- Function to check if payment is valid before insert
CREATE OR REPLACE FUNCTION public.validate_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_status TEXT;
  v_current_balance NUMERIC(15,2);
BEGIN
  -- Get invoice status and balance
  SELECT status, COALESCE(balance_due, total_amount, 0)
  INTO v_invoice_status, v_current_balance
  FROM public.invoices
  WHERE id = NEW.invoice_id;

  -- Check if invoice exists
  IF v_invoice_status IS NULL THEN
    RAISE EXCEPTION 'Invoice not found: %', NEW.invoice_id;
  END IF;

  -- Check if invoice is in Draft status
  IF v_invoice_status = 'Draft' THEN
    RAISE EXCEPTION 'Cannot add payment to draft invoice. Please finalize the invoice first.';
  END IF;

  -- Check if payment amount exceeds balance (with small tolerance for rounding)
  IF NEW.amount > v_current_balance + 0.01 THEN
    RAISE EXCEPTION 'Payment amount (%) exceeds invoice balance (%)', NEW.amount, v_current_balance;
  END IF;

  RETURN NEW;
END;
$$;

-- Create validation trigger
DROP TRIGGER IF EXISTS trg_validate_payment ON public.payment_records;
CREATE TRIGGER trg_validate_payment
BEFORE INSERT ON public.payment_records
FOR EACH ROW
EXECUTE FUNCTION public.validate_payment();

-- Create view for client outstanding summary (using SECURITY INVOKER to avoid linter warnings)
DROP VIEW IF EXISTS public.client_outstanding_summary;
CREATE VIEW public.client_outstanding_summary 
WITH (security_invoker = true)
AS
SELECT 
  i.client_id,
  i.client_name,
  i.company_id,
  COUNT(*) as invoice_count,
  SUM(COALESCE(i.total_amount, 0)) as total_invoiced,
  SUM(COALESCE(i.paid_amount, 0)) as total_paid,
  SUM(COALESCE(i.balance_due, COALESCE(i.total_amount, 0) - COALESCE(i.paid_amount, 0))) as total_outstanding,
  COUNT(*) FILTER (WHERE i.status = 'Overdue') as overdue_count,
  SUM(COALESCE(i.balance_due, 0)) FILTER (WHERE i.status = 'Overdue') as overdue_amount
FROM public.invoices i
WHERE i.status NOT IN ('Draft', 'Cancelled')
GROUP BY i.client_id, i.client_name, i.company_id;

-- Create view for aging report (using SECURITY INVOKER)
DROP VIEW IF EXISTS public.invoice_aging_report;
CREATE VIEW public.invoice_aging_report 
WITH (security_invoker = true)
AS
SELECT 
  i.id as invoice_id,
  i.client_id,
  i.client_name,
  i.campaign_id,
  i.company_id,
  i.invoice_date,
  i.due_date,
  i.status,
  COALESCE(i.total_amount, 0) as total_amount,
  COALESCE(i.paid_amount, 0) as paid_amount,
  COALESCE(i.balance_due, COALESCE(i.total_amount, 0) - COALESCE(i.paid_amount, 0)) as balance_due,
  CASE 
    WHEN i.status = 'Paid' THEN 0
    WHEN i.due_date IS NULL THEN 0
    ELSE GREATEST(0, CURRENT_DATE - i.due_date)
  END as days_overdue,
  CASE 
    WHEN i.status = 'Paid' THEN 'Paid'
    WHEN i.due_date IS NULL OR CURRENT_DATE <= i.due_date THEN 'Current'
    WHEN CURRENT_DATE - i.due_date <= 30 THEN '1-30 Days'
    WHEN CURRENT_DATE - i.due_date <= 60 THEN '31-60 Days'
    WHEN CURRENT_DATE - i.due_date <= 90 THEN '61-90 Days'
    ELSE '90+ Days'
  END as aging_bucket
FROM public.invoices i
WHERE i.status NOT IN ('Draft', 'Cancelled');