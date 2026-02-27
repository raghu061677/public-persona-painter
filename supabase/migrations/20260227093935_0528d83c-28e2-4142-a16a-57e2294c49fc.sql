-- Add 'Partial' to invoice_status enum
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'Partial' AFTER 'Sent';

-- Fix the function to cast text to invoice_status enum
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
    status::TEXT
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

  -- Update invoice with explicit cast to enum
  UPDATE public.invoices
  SET 
    paid_amount = v_total_paid,
    balance_due = v_balance,
    status = v_new_status::invoice_status,
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$$;