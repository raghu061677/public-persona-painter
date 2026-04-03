
-- Drop both overloads and recreate with retry logic
DROP FUNCTION IF EXISTS public.finalize_invoice_number(text, numeric);
DROP FUNCTION IF EXISTS public.finalize_invoice_number(text, numeric, uuid);

-- Overload 1: without company_id
CREATE OR REPLACE FUNCTION public.finalize_invoice_number(p_draft_id text, p_gst_rate numeric DEFAULT 0)
RETURNS text
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
  v_max_attempts INTEGER := 20;
  v_attempt INTEGER := 0;
BEGIN
  IF p_gst_rate = 0 THEN v_prefix := 'INV-Z'; ELSE v_prefix := 'INV'; END IF;

  IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
    v_fy_start := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  ELSE
    v_fy_start := (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::INTEGER;
  END IF;
  v_fy_end := v_fy_start + 1;
  v_fy := v_fy_start::TEXT || '-' || RIGHT(v_fy_end::TEXT, 2);

  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > v_max_attempts THEN
      RAISE EXCEPTION 'Could not assign invoice number after % attempts', v_max_attempts;
    END IF;

    INSERT INTO public.invoice_counters (prefix, fy_label, last_seq)
    VALUES (v_prefix, v_fy, 1)
    ON CONFLICT (prefix, fy_label) WHERE company_id IS NULL
    DO UPDATE SET last_seq = invoice_counters.last_seq + 1, updated_at = now()
    RETURNING last_seq INTO v_new_seq;

    v_new_id := v_prefix || '/' || v_fy || '/' || LPAD(v_new_seq::TEXT, 4, '0');

    -- Check if this ID already exists (counter was out of sync)
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id = v_new_id) THEN
      EXIT; -- Found a free ID
    END IF;
  END LOOP;

  UPDATE public.invoices
  SET id = v_new_id,
      draft_number = p_draft_id,
      is_draft = false,
      status = 'Sent',
      updated_at = now()
  WHERE id = p_draft_id;

  RETURN v_new_id;
END;
$$;

-- Overload 2: with company_id
CREATE OR REPLACE FUNCTION public.finalize_invoice_number(p_draft_id text, p_gst_rate numeric, p_company_id uuid)
RETURNS text
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
  v_max_attempts INTEGER := 20;
  v_attempt INTEGER := 0;
BEGIN
  IF p_company_id IS NOT NULL THEN
    v_company_id := p_company_id;
  ELSE
    SELECT company_id INTO v_company_id FROM public.invoices WHERE id = p_draft_id;
    IF v_company_id IS NULL THEN
      RAISE EXCEPTION 'Draft invoice % not found or has no company_id', p_draft_id;
    END IF;
  END IF;

  IF p_gst_rate = 0 THEN v_prefix := 'INV-Z'; ELSE v_prefix := 'INV'; END IF;

  IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
    v_fy_start := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  ELSE
    v_fy_start := (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::INTEGER;
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
