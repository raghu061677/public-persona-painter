
-- Fix existing invoice that has is_draft = true after finalization
UPDATE public.invoices 
SET is_draft = false 
WHERE id LIKE 'INV/%' AND is_draft = true;

-- Recreate the finalize_invoice_number function to also set invoice_type
CREATE OR REPLACE FUNCTION public.finalize_invoice_number(
  p_draft_id TEXT,
  p_gst_rate NUMERIC,
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
BEGIN
  -- Resolve company_id: use parameter or look up from draft invoice
  IF p_company_id IS NOT NULL THEN
    v_company_id := p_company_id;
  ELSE
    SELECT company_id INTO v_company_id FROM public.invoices WHERE id = p_draft_id;
    IF v_company_id IS NULL THEN
      RAISE EXCEPTION 'Draft invoice % not found or has no company_id', p_draft_id;
    END IF;
  END IF;

  -- Determine prefix based on GST rate
  IF p_gst_rate = 0 THEN
    v_prefix := 'INV-Z';
  ELSE
    v_prefix := 'INV';
  END IF;

  -- Calculate Indian Financial Year
  IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
    v_fy_start := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  ELSE
    v_fy_start := (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::INTEGER;
  END IF;
  v_fy_end := v_fy_start + 1;
  v_fy := v_fy_start::TEXT || '-' || RIGHT(v_fy_end::TEXT, 2);

  -- Atomically increment counter scoped by company + prefix + FY
  INSERT INTO public.invoice_counters (company_id, prefix, fy_label, last_seq)
  VALUES (v_company_id, v_prefix, v_fy, 1)
  ON CONFLICT (company_id, prefix, fy_label)
  DO UPDATE SET last_seq = invoice_counters.last_seq + 1, updated_at = now()
  RETURNING last_seq INTO v_new_seq;

  v_new_id := v_prefix || '/' || v_fy || '/' || LPAD(v_new_seq::TEXT, 4, '0');

  -- Update the invoice: swap draft ID to permanent ID, mark as finalized TAX_INVOICE
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
