
CREATE OR REPLACE FUNCTION public.update_invoice_payment_status(p_invoice_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_paid NUMERIC(15,2);
  v_total_tds NUMERIC(15,2);
  v_total_credited NUMERIC(15,2);
  v_total_amount NUMERIC(15,2);
  v_total_settled NUMERIC(15,2);
  v_balance NUMERIC(15,2);
  v_due_date DATE;
  v_current_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Get sum of payments and TDS for this invoice
  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(COALESCE(tds_amount, 0)), 0)
  INTO v_total_paid, v_total_tds
  FROM public.payment_records
  WHERE invoice_id = p_invoice_id
    AND (is_deleted IS NULL OR is_deleted = false);

  -- Get invoice details including credited_amount
  SELECT 
    COALESCE(total_amount, 0),
    COALESCE(credited_amount, 0),
    due_date,
    status::TEXT
  INTO v_total_amount, v_total_credited, v_due_date, v_current_status
  FROM public.invoices
  WHERE id = p_invoice_id;

  -- Calculate total settled including TDS and credits
  v_total_settled := v_total_paid + v_total_tds + v_total_credited;
  v_balance := GREATEST(v_total_amount - v_total_settled, 0);

  -- Determine new status
  IF v_current_status = 'Draft' THEN
    v_new_status := 'Draft';
  ELSIF v_current_status = 'Cancelled' THEN
    v_new_status := 'Cancelled';
  ELSIF v_balance <= 1.00 THEN
    v_new_status := 'Paid';
  ELSIF v_total_paid > 0 OR v_total_tds > 0 OR v_total_credited > 0 THEN
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

-- Fix INV/2025-26/0073 balance immediately
UPDATE public.invoices
SET balance_due = 0,
    status = 'Paid'::invoice_status,
    updated_at = now()
WHERE id = 'INV/2025-26/0073'
  AND total_amount = 118000
  AND paid_amount = 116000;
