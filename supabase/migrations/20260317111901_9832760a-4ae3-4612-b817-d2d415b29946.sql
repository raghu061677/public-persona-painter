
CREATE OR REPLACE FUNCTION public.sync_invoice_after_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_invoice_id TEXT;
  v_total_amount NUMERIC(15,2);
  v_total_paid NUMERIC(15,2);
  v_total_tds NUMERIC(15,2);
  v_total_settled NUMERIC(15,2);
  v_new_status TEXT;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(total_amount, 0)
  INTO v_total_amount
  FROM public.invoices
  WHERE id = v_invoice_id;

  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(COALESCE(tds_amount, 0)), 0)
  INTO v_total_paid, v_total_tds
  FROM public.payment_records
  WHERE invoice_id = v_invoice_id
    AND (is_deleted IS NULL OR is_deleted = false);

  v_total_settled := v_total_paid + v_total_tds;

  IF v_total_settled >= v_total_amount - 0.01 THEN
    v_new_status := 'Paid';
  ELSIF v_total_paid > 0 OR v_total_tds > 0 THEN
    v_new_status := 'Partial';
  ELSE
    v_new_status := 'Sent';
  END IF;

  UPDATE public.invoices
  SET paid_amount = v_total_paid,
      balance_due = GREATEST(v_total_amount - v_total_settled, 0),
      status = v_new_status::invoice_status,
      updated_at = now()
  WHERE id = v_invoice_id
    AND status NOT IN ('Draft'::invoice_status, 'Cancelled'::invoice_status);

  RETURN COALESCE(NEW, OLD);
END;
$function$;
