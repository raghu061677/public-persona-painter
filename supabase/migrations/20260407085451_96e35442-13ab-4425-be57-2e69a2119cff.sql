CREATE OR REPLACE FUNCTION public.validate_payment_record()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_total_amount NUMERIC;
  v_invoice_status TEXT;
  v_total_paid NUMERIC;
  v_total_tds NUMERIC;
  v_actual_balance NUMERIC;
BEGIN
  SELECT total_amount, status
  INTO v_total_amount, v_invoice_status
  FROM public.invoices
  WHERE id = NEW.invoice_id;

  IF v_invoice_status IS NULL THEN
    RAISE EXCEPTION 'Invoice not found: %', NEW.invoice_id;
  END IF;

  IF v_invoice_status = 'Draft' THEN
    RAISE EXCEPTION 'Cannot add payment to draft invoice. Please finalize the invoice first.';
  END IF;

  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(COALESCE(tds_amount, 0)), 0)
  INTO v_total_paid, v_total_tds
  FROM public.payment_records
  WHERE invoice_id = NEW.invoice_id
    AND (is_deleted IS NULL OR is_deleted = false);

  v_actual_balance := v_total_amount - v_total_paid - v_total_tds;

  IF (NEW.amount + COALESCE(NEW.tds_amount, 0)) > v_actual_balance + 1.00 THEN
    RAISE EXCEPTION 'Payment amount + TDS (%) exceeds invoice balance (%)', 
      (NEW.amount + COALESCE(NEW.tds_amount, 0)), v_actual_balance;
  END IF;

  RETURN NEW;
END;
$function$;