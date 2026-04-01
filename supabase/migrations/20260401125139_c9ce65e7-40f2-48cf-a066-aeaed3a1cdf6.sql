-- 1. Add company_id to invoice_counters
ALTER TABLE public.invoice_counters ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- Backfill existing rows with the only company
UPDATE public.invoice_counters SET company_id = '0b75c4c9-43fe-496a-9fc6-036900ebbfe0';

-- Make it NOT NULL
ALTER TABLE public.invoice_counters ALTER COLUMN company_id SET NOT NULL;

-- 2. Drop old unique constraint and create new one scoped by company
ALTER TABLE public.invoice_counters DROP CONSTRAINT invoice_counters_prefix_fy_label_key;
ALTER TABLE public.invoice_counters ADD CONSTRAINT invoice_counters_company_prefix_fy_key UNIQUE (company_id, prefix, fy_label);

-- 3. Recreate finalize_invoice_number with company_id scoping
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

  -- Update the invoice: swap draft ID to permanent ID
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

-- 4. Fix orphaned drafts (is_draft=true but status is Paid/Overdue)
UPDATE public.invoices 
SET is_draft = false 
WHERE is_draft = true AND status IN ('Paid', 'Overdue', 'Sent');

-- 5. RLS on invoice_counters
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company counters"
ON public.invoice_counters
FOR ALL
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));