
-- 1) Add TDS fields to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tds_applicable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_tds_rate numeric(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tds_notes text DEFAULT NULL;

-- 2) Add TDS fields to payment_records table
ALTER TABLE public.payment_records
  ADD COLUMN IF NOT EXISTS tds_amount numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_certificate_no text DEFAULT NULL;

-- 3) Update validate_payment trigger to account for TDS
CREATE OR REPLACE FUNCTION public.validate_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_status TEXT;
  v_total_amount NUMERIC(15,2);
  v_total_paid NUMERIC(15,2);
  v_total_tds NUMERIC(15,2);
  v_actual_balance NUMERIC(15,2);
BEGIN
  -- Get invoice status and total
  SELECT status, COALESCE(total_amount, 0)
  INTO v_invoice_status, v_total_amount
  FROM public.invoices
  WHERE id = NEW.invoice_id;

  IF v_invoice_status IS NULL THEN
    RAISE EXCEPTION 'Invoice not found: %', NEW.invoice_id;
  END IF;

  IF v_invoice_status = 'Draft' THEN
    RAISE EXCEPTION 'Cannot add payment to draft invoice. Please finalize the invoice first.';
  END IF;

  -- Calculate actual balance from existing payment_records (amount + tds), excluding soft-deleted
  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(COALESCE(tds_amount, 0)), 0)
  INTO v_total_paid, v_total_tds
  FROM public.payment_records
  WHERE invoice_id = NEW.invoice_id
    AND (is_deleted IS NULL OR is_deleted = false);

  v_actual_balance := v_total_amount - v_total_paid - v_total_tds;

  -- Check if payment amount + tds exceeds calculated balance (with tolerance)
  IF (NEW.amount + COALESCE(NEW.tds_amount, 0)) > v_actual_balance + 0.01 THEN
    RAISE EXCEPTION 'Payment amount + TDS (%) exceeds invoice balance (%)', 
      (NEW.amount + COALESCE(NEW.tds_amount, 0)), v_actual_balance;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Create/replace trigger to auto-update invoice paid_amount/balance_due/status after payment insert/delete
CREATE OR REPLACE FUNCTION public.sync_invoice_after_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Determine status
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
      status = v_new_status,
      updated_at = now()
  WHERE id = v_invoice_id
    AND status NOT IN ('Draft', 'Cancelled');

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_after_payment ON public.payment_records;
CREATE TRIGGER trg_sync_invoice_after_payment
AFTER INSERT OR UPDATE OR DELETE ON public.payment_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_invoice_after_payment();
