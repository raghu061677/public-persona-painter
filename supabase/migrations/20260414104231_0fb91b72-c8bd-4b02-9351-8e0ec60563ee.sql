CREATE OR REPLACE FUNCTION public.preview_next_invoice_number(
  p_company_id uuid,
  p_gst_rate numeric DEFAULT 18,
  p_invoice_date date DEFAULT NULL::date
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_prefix TEXT;
  v_fy TEXT;
  v_fy_start INTEGER;
  v_max_seq INTEGER;
  v_ref_date DATE;
  v_candidate TEXT;
  i INTEGER;
BEGIN
  IF p_gst_rate = 0 THEN
    v_prefix := 'INV-Z';
  ELSE
    v_prefix := 'INV';
  END IF;

  v_ref_date := COALESCE(p_invoice_date, CURRENT_DATE);

  IF EXTRACT(MONTH FROM v_ref_date) >= 4 THEN
    v_fy_start := EXTRACT(YEAR FROM v_ref_date)::INTEGER;
  ELSE
    v_fy_start := (EXTRACT(YEAR FROM v_ref_date) - 1)::INTEGER;
  END IF;

  v_fy := v_fy_start::TEXT || '-' || RIGHT((v_fy_start + 1)::TEXT, 2);

  SELECT COALESCE(last_seq, 0)
  INTO v_max_seq
  FROM public.invoice_counters
  WHERE company_id = p_company_id
    AND prefix = v_prefix
    AND fy_label = v_fy;

  IF NOT FOUND THEN
    v_max_seq := 0;
  END IF;

  FOR i IN 1..v_max_seq + 1 LOOP
    v_candidate := v_prefix || '/' || v_fy || '/' || LPAD(i::TEXT, 4, '0');

    IF NOT EXISTS (
      SELECT 1
      FROM public.invoices
      WHERE id = v_candidate
        AND status <> 'Cancelled'::invoice_status
    ) THEN
      RETURN v_candidate;
    END IF;
  END LOOP;

  RETURN v_prefix || '/' || v_fy || '/' || LPAD((v_max_seq + 1)::TEXT, 4, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_invoice_number(
  p_draft_id text,
  p_gst_rate numeric DEFAULT 18,
  p_company_id uuid DEFAULT NULL::uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_prefix TEXT;
  v_fy TEXT;
  v_fy_start INTEGER;
  v_fy_end INTEGER;
  v_new_seq INTEGER;
  v_new_id TEXT;
  v_company_id UUID;
  v_invoice_date DATE;
  v_max_seq INTEGER;
  v_candidate TEXT;
  v_found BOOLEAN := FALSE;
  i INTEGER;
BEGIN
  IF p_company_id IS NOT NULL THEN
    v_company_id := p_company_id;
    SELECT invoice_date::date INTO v_invoice_date
    FROM public.invoices
    WHERE id = p_draft_id;
  ELSE
    SELECT company_id, invoice_date::date
    INTO v_company_id, v_invoice_date
    FROM public.invoices
    WHERE id = p_draft_id;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Draft invoice % not found or has no company_id', p_draft_id;
  END IF;

  IF v_invoice_date IS NULL THEN
    v_invoice_date := CURRENT_DATE;
  END IF;

  IF p_gst_rate = 0 THEN
    v_prefix := 'INV-Z';
  ELSE
    v_prefix := 'INV';
  END IF;

  IF EXTRACT(MONTH FROM v_invoice_date) >= 4 THEN
    v_fy_start := EXTRACT(YEAR FROM v_invoice_date)::INTEGER;
  ELSE
    v_fy_start := (EXTRACT(YEAR FROM v_invoice_date) - 1)::INTEGER;
  END IF;

  v_fy_end := v_fy_start + 1;
  v_fy := v_fy_start::TEXT || '-' || RIGHT(v_fy_end::TEXT, 2);

  SELECT COALESCE(last_seq, 0)
  INTO v_max_seq
  FROM public.invoice_counters
  WHERE company_id = v_company_id
    AND prefix = v_prefix
    AND fy_label = v_fy;

  IF NOT FOUND THEN
    v_max_seq := 0;
  END IF;

  FOR i IN 1..v_max_seq + 1 LOOP
    v_candidate := v_prefix || '/' || v_fy || '/' || LPAD(i::TEXT, 4, '0');

    IF NOT EXISTS (
      SELECT 1
      FROM public.invoices
      WHERE id = v_candidate
        AND status <> 'Cancelled'::invoice_status
    ) THEN
      v_new_id := v_candidate;
      v_new_seq := i;
      v_found := TRUE;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_found THEN
    RAISE EXCEPTION 'Could not assign invoice number after scanning all sequences';
  END IF;

  DELETE FROM public.invoices
  WHERE id = v_new_id
    AND status = 'Cancelled'::invoice_status;

  IF v_new_seq > v_max_seq THEN
    INSERT INTO public.invoice_counters (company_id, prefix, fy_label, last_seq)
    VALUES (v_company_id, v_prefix, v_fy, v_new_seq)
    ON CONFLICT (company_id, prefix, fy_label)
    DO UPDATE SET last_seq = EXCLUDED.last_seq, updated_at = now();
  END IF;

  UPDATE public.invoices
  SET id = v_new_id,
      draft_number = p_draft_id,
      is_draft = false,
      invoice_type = 'TAX_INVOICE',
      status = 'Sent',
      updated_at = now()
  WHERE id = p_draft_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft invoice % not found during finalization', p_draft_id;
  END IF;

  RETURN v_new_id;
END;
$function$;