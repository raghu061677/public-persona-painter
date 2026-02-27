
-- 1) Fix the validate_payment trigger to calculate balance from actual payments instead of trusting stored balance_due
CREATE OR REPLACE FUNCTION public.validate_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_status TEXT;
  v_total_amount NUMERIC(15,2);
  v_total_paid NUMERIC(15,2);
  v_actual_balance NUMERIC(15,2);
BEGIN
  -- Get invoice status and total
  SELECT status, COALESCE(total_amount, 0)
  INTO v_invoice_status, v_total_amount
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

  -- Calculate actual balance from existing payment_records (excluding soft-deleted)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM public.payment_records
  WHERE invoice_id = NEW.invoice_id
    AND (is_deleted IS NULL OR is_deleted = false);

  v_actual_balance := v_total_amount - v_total_paid;

  -- Check if payment amount exceeds calculated balance (with small tolerance for rounding)
  IF NEW.amount > v_actual_balance + 0.01 THEN
    RAISE EXCEPTION 'Payment amount (%) exceeds invoice balance (%)', NEW.amount, v_actual_balance;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Fix all invoices with stale balance_due: recalculate from actual payments
UPDATE public.invoices
SET
  paid_amount = COALESCE(sub.total_paid, 0),
  balance_due = total_amount - COALESCE(sub.total_paid, 0),
  status = CASE
    WHEN COALESCE(sub.total_paid, 0) >= total_amount THEN 'Paid'
    WHEN COALESCE(sub.total_paid, 0) > 0 THEN 'Partial'
    ELSE status
  END,
  updated_at = now()
FROM (
  SELECT invoice_id, SUM(amount) AS total_paid
  FROM public.payment_records
  WHERE is_deleted IS NULL OR is_deleted = false
  GROUP BY invoice_id
) sub
WHERE invoices.id = sub.invoice_id
  AND invoices.balance_due != invoices.total_amount - COALESCE(sub.total_paid, 0);

-- 3) Fix invoices with NO payments but wrong balance_due
UPDATE public.invoices
SET
  balance_due = total_amount,
  paid_amount = 0,
  updated_at = now()
WHERE balance_due != total_amount
  AND paid_amount = 0
  AND id NOT IN (
    SELECT DISTINCT invoice_id FROM public.payment_records
    WHERE is_deleted IS NULL OR is_deleted = false
  )
  AND status NOT IN ('Draft', 'Cancelled', 'Paid');
