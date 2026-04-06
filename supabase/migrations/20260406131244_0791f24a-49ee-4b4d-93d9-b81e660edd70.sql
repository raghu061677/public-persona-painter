
-- Fix finalize_invoice_number to use invoice_date for FY determination
CREATE OR REPLACE FUNCTION public.finalize_invoice_number(
  p_draft_id TEXT,
  p_gst_rate NUMERIC DEFAULT 18,
  p_company_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_fy TEXT;
  v_fy_start INTEGER;
  v_fy_end INTEGER;
  v_new_seq INTEGER;
  v_new_id TEXT;
  v_company_id UUID;
  v_invoice_date DATE;
  v_max_attempts INTEGER := 20;
  v_attempt INTEGER := 0;
BEGIN
  -- Get invoice details
  IF p_company_id IS NOT NULL THEN
    v_company_id := p_company_id;
    SELECT invoice_date::date INTO v_invoice_date FROM public.invoices WHERE id = p_draft_id;
  ELSE
    SELECT company_id, invoice_date::date INTO v_company_id, v_invoice_date FROM public.invoices WHERE id = p_draft_id;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Draft invoice % not found or has no company_id', p_draft_id;
  END IF;

  -- Use invoice_date for FY, fallback to CURRENT_DATE if null
  IF v_invoice_date IS NULL THEN
    v_invoice_date := CURRENT_DATE;
  END IF;

  IF p_gst_rate = 0 THEN v_prefix := 'INV-Z'; ELSE v_prefix := 'INV'; END IF;

  -- Determine FY from invoice_date, not CURRENT_DATE
  IF EXTRACT(MONTH FROM v_invoice_date) >= 4 THEN
    v_fy_start := EXTRACT(YEAR FROM v_invoice_date)::INTEGER;
  ELSE
    v_fy_start := (EXTRACT(YEAR FROM v_invoice_date) - 1)::INTEGER;
  END IF;
  v_fy_end := v_fy_start + 1;
  v_fy := v_fy_start::TEXT || '-' || RIGHT(v_fy_end::TEXT, 2);

  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > v_max_attempts THEN
      RAISE EXCEPTION 'Could not assign invoice number after % attempts', v_max_attempts;
    END IF;

    INSERT INTO public.invoice_counters (company_id, prefix, fy_label, last_seq)
    VALUES (v_company_id, v_prefix, v_fy, 1)
    ON CONFLICT (company_id, prefix, fy_label)
    DO UPDATE SET last_seq = invoice_counters.last_seq + 1, updated_at = now()
    RETURNING last_seq INTO v_new_seq;

    v_new_id := v_prefix || '/' || v_fy || '/' || LPAD(v_new_seq::TEXT, 4, '0');

    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id = v_new_id) THEN
      EXIT;
    END IF;
  END LOOP;

  UPDATE public.invoices
  SET id = v_new_id,
      draft_number = p_draft_id,
      is_draft = false,
      invoice_type = 'TAX_INVOICE',
      status = 'Sent',
      updated_at = now()
  WHERE id = p_draft_id;

  RETURN v_new_id;
END;
$$;

-- Fix preview_next_invoice_number to accept invoice_date
CREATE OR REPLACE FUNCTION public.preview_next_invoice_number(
  p_company_id UUID,
  p_gst_rate NUMERIC DEFAULT 18,
  p_invoice_date DATE DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_fy TEXT;
  v_fy_start INTEGER;
  v_next_seq INTEGER;
  v_ref_date DATE;
BEGIN
  IF p_gst_rate = 0 THEN
    v_prefix := 'INV-Z';
  ELSE
    v_prefix := 'INV';
  END IF;

  -- Use provided invoice_date, fallback to CURRENT_DATE
  v_ref_date := COALESCE(p_invoice_date, CURRENT_DATE);

  IF EXTRACT(MONTH FROM v_ref_date) >= 4 THEN
    v_fy_start := EXTRACT(YEAR FROM v_ref_date)::INTEGER;
  ELSE
    v_fy_start := (EXTRACT(YEAR FROM v_ref_date) - 1)::INTEGER;
  END IF;
  v_fy := v_fy_start::TEXT || '-' || RIGHT((v_fy_start + 1)::TEXT, 2);

  SELECT COALESCE(last_seq, 0) + 1
  INTO v_next_seq
  FROM public.invoice_counters
  WHERE company_id = p_company_id AND prefix = v_prefix AND fy_label = v_fy;

  IF NOT FOUND THEN
    v_next_seq := 1;
  END IF;

  RETURN v_prefix || '/' || v_fy || '/' || LPAD(v_next_seq::TEXT, 4, '0');
END;
$$;
