
-- 1. Add draft_number column to invoices for temporary draft IDs
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS draft_number TEXT;

-- 2. Add is_draft flag to distinguish draft vs finalized numbering
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT true;

-- Mark all existing invoices with permanent numbers as not draft
UPDATE public.invoices SET is_draft = false WHERE id LIKE 'INV/%' OR id LIKE 'INV-Z/%';

-- 3. Create invoice_counters table for atomic sequential numbering
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefix TEXT NOT NULL,          -- 'INV' or 'INV-Z'
  fy_label TEXT NOT NULL,        -- '2026-27'
  last_seq INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prefix, fy_label)
);

ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read counters"
  ON public.invoice_counters FOR SELECT TO authenticated USING (true);

-- 4. Seed counters from existing invoices so numbering continues correctly
INSERT INTO public.invoice_counters (prefix, fy_label, last_seq)
SELECT 
  CASE 
    WHEN split_part(id, '/', 1) = 'INV-Z' THEN 'INV-Z'
    ELSE 'INV'
  END as prefix,
  split_part(id, '/', 2) as fy_label,
  MAX(CAST(split_part(id, '/', 3) AS INTEGER)) as last_seq
FROM public.invoices
WHERE id ~ '^INV(-Z)?/[0-9]{4}-[0-9]{2}/[0-9]+$'
GROUP BY 1, 2
ON CONFLICT (prefix, fy_label) DO UPDATE SET last_seq = GREATEST(invoice_counters.last_seq, EXCLUDED.last_seq);

-- 5. Create function to finalize a draft invoice with a permanent number
CREATE OR REPLACE FUNCTION public.finalize_invoice_number(p_draft_id TEXT, p_gst_rate NUMERIC DEFAULT 0)
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
BEGIN
  -- Determine prefix
  IF p_gst_rate = 0 THEN
    v_prefix := 'INV-Z';
  ELSE
    v_prefix := 'INV';
  END IF;

  -- Calculate Indian FY
  IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
    v_fy_start := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  ELSE
    v_fy_start := (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::INTEGER;
  END IF;
  v_fy_end := v_fy_start + 1;
  v_fy := v_fy_start::TEXT || '-' || RIGHT(v_fy_end::TEXT, 2);

  -- Atomically increment counter
  INSERT INTO public.invoice_counters (prefix, fy_label, last_seq)
  VALUES (v_prefix, v_fy, 1)
  ON CONFLICT (prefix, fy_label)
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
