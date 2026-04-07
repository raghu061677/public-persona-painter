
CREATE OR REPLACE FUNCTION public.issue_credit_note(p_credit_note_uuid UUID, p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fy_start INTEGER;
  v_fy_end INTEGER;
  v_fy TEXT;
  v_new_seq INTEGER;
  v_cn_no TEXT;
  v_invoice_id TEXT;
  v_cn_total NUMERIC;
  v_invoice_total NUMERIC;
  v_invoice_credited NUMERIC;
  v_invoice_paid NUMERIC;
  v_new_credited NUMERIC;
  v_new_balance NUMERIC;
  v_new_status TEXT;
  v_is_draft BOOLEAN;
BEGIN
  -- Get credit note details
  SELECT invoice_id, total_amount, status
  INTO v_invoice_id, v_cn_total, v_new_status
  FROM public.credit_notes
  WHERE id = p_credit_note_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit note not found';
  END IF;

  IF v_new_status != 'Draft' THEN
    RAISE EXCEPTION 'Credit note is already %', v_new_status;
  END IF;

  -- Get invoice details
  SELECT total_amount, COALESCE(credited_amount, 0), COALESCE(paid_amount, 0), COALESCE(is_draft, false)
  INTO v_invoice_total, v_invoice_credited, v_invoice_paid, v_is_draft
  FROM public.invoices
  WHERE id = v_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', v_invoice_id;
  END IF;

  IF v_is_draft THEN
    RAISE EXCEPTION 'Cannot issue credit note against a draft invoice';
  END IF;

  -- Validate amount
  v_new_credited := v_invoice_credited + v_cn_total;
  IF v_new_credited > v_invoice_total THEN
    RAISE EXCEPTION 'Credit note amount exceeds remaining invoice balance (max: %)', (v_invoice_total - v_invoice_credited);
  END IF;

  -- Calculate Indian FY
  IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
    v_fy_start := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  ELSE
    v_fy_start := (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::INTEGER;
  END IF;
  v_fy_end := v_fy_start + 1;
  v_fy := v_fy_start::TEXT || '-' || RIGHT(v_fy_end::TEXT, 2);

  -- Atomically increment CN counter
  INSERT INTO public.credit_note_counters (company_id, fy_label, last_seq)
  VALUES (p_company_id, v_fy, 1)
  ON CONFLICT (company_id, fy_label)
  DO UPDATE SET last_seq = credit_note_counters.last_seq + 1, updated_at = now()
  RETURNING last_seq INTO v_new_seq;

  v_cn_no := 'CN/' || v_fy || '/' || LPAD(v_new_seq::TEXT, 4, '0');

  -- Update credit note
  UPDATE public.credit_notes
  SET credit_note_id = v_cn_no,
      status = 'Issued',
      issued_at = now(),
      updated_at = now()
  WHERE id = p_credit_note_uuid;

  -- Update invoice
  v_new_balance := v_invoice_total - v_new_credited - v_invoice_paid;
  IF v_new_balance < 0 THEN v_new_balance := 0; END IF;

  -- Use valid invoice_status enum values
  IF (v_new_credited + v_invoice_paid) >= v_invoice_total THEN
    v_new_status := 'Paid';
  ELSIF v_new_credited > 0 THEN
    v_new_status := 'Partial';
  ELSE
    v_new_status := 'Sent';
  END IF;

  UPDATE public.invoices
  SET credited_amount = v_new_credited,
      balance_due = v_new_balance,
      status = v_new_status::invoice_status,
      updated_at = now()
  WHERE id = v_invoice_id;

  RETURN v_cn_no;
END;
$$;
