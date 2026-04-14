
-- 1. Drop and recreate the old 2-param finalize_invoice_number to use invoice_date
DROP FUNCTION IF EXISTS public.finalize_invoice_number(text, numeric);

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
  v_invoice_date DATE;
BEGIN
  SELECT invoice_date::date INTO v_invoice_date FROM public.invoices WHERE id = p_draft_id;
  IF v_invoice_date IS NULL THEN
    v_invoice_date := CURRENT_DATE;
  END IF;

  IF p_gst_rate = 0 THEN v_prefix := 'INV-Z'; ELSE v_prefix := 'INV'; END IF;

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

    INSERT INTO public.invoice_counters (prefix, fy_label, last_seq)
    VALUES (v_prefix, v_fy, 1)
    ON CONFLICT (prefix, fy_label) WHERE company_id IS NULL
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
      status = 'Sent',
      updated_at = now()
  WHERE id = p_draft_id;

  RETURN v_new_id;
END;
$$;

-- 2. Drop and recreate generate_invoice_id to accept optional invoice_date
DROP FUNCTION IF EXISTS public.generate_invoice_id(numeric);

CREATE OR REPLACE FUNCTION public.generate_invoice_id(p_gst_rate numeric DEFAULT 18, p_invoice_date date DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_fy TEXT;
  v_seq INTEGER;
  v_new_id TEXT;
  v_fy_start_year INTEGER;
  v_fy_end_year INTEGER;
  v_ref_date DATE;
BEGIN
  v_ref_date := COALESCE(p_invoice_date, CURRENT_DATE);

  IF p_gst_rate = 0 THEN
    v_prefix := 'INV-Z';
  ELSE
    v_prefix := 'INV';
  END IF;

  IF EXTRACT(MONTH FROM v_ref_date) >= 4 THEN
    v_fy_start_year := EXTRACT(YEAR FROM v_ref_date)::INTEGER;
  ELSE
    v_fy_start_year := (EXTRACT(YEAR FROM v_ref_date) - 1)::INTEGER;
  END IF;
  v_fy_end_year := v_fy_start_year + 1;

  v_fy := v_fy_start_year::TEXT || '-' || RIGHT(v_fy_end_year::TEXT, 2);

  SELECT COALESCE(MAX(
    CASE
      WHEN id ~ ('^' || REPLACE(v_prefix, '-', '-') || '/[0-9]{4}-[0-9]{2}/[0-9]+$')
      THEN CAST(SUBSTRING(id FROM '/([0-9]+)$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO v_seq
  FROM invoices
  WHERE id LIKE v_prefix || '/' || v_fy || '/%';

  v_new_id := v_prefix || '/' || v_fy || '/' || LPAD(v_seq::TEXT, 4, '0');

  RETURN v_new_id;
END;
$$;

-- 3. Add billing_window_key column
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS billing_window_key text;

-- 4. Backfill billing_mode for existing invoices
UPDATE public.invoices
SET billing_mode = 'calendar_monthly'
WHERE billing_mode IS NULL AND is_monthly_split = true;

UPDATE public.invoices
SET billing_mode = 'single_invoice'
WHERE billing_mode IS NULL AND is_monthly_split IS DISTINCT FROM true AND campaign_id IS NOT NULL;

-- 5. Backfill billing_window_key for existing invoices
-- Calendar monthly: use billing_month
UPDATE public.invoices
SET billing_window_key = billing_month
WHERE billing_window_key IS NULL AND billing_mode = 'calendar_monthly' AND billing_month IS NOT NULL;

-- Asset cycle: use cycle dates
UPDATE public.invoices
SET billing_window_key = cycle_start_date::text || ':' || cycle_end_date::text
WHERE billing_window_key IS NULL AND billing_mode = 'asset_cycle' AND cycle_start_date IS NOT NULL AND cycle_end_date IS NOT NULL;

-- Single invoice: use invoice_period_start to allow legitimate multiples
UPDATE public.invoices
SET billing_window_key = COALESCE(invoice_period_start::text, id)
WHERE billing_window_key IS NULL AND (billing_mode = 'single_invoice' OR billing_mode IS NULL) AND campaign_id IS NOT NULL;

-- 6. Drop the broken unique index
DROP INDEX IF EXISTS public.idx_invoices_unique_monthly_billing;

-- 7. Create proper unique index (only for calendar_monthly and asset_cycle where dedup matters)
CREATE UNIQUE INDEX idx_invoices_unique_billing_window
ON public.invoices (company_id, campaign_id, billing_mode, billing_window_key)
WHERE campaign_id IS NOT NULL
  AND billing_mode IS NOT NULL
  AND billing_window_key IS NOT NULL
  AND company_id IS NOT NULL
  AND status <> 'Cancelled'::invoice_status
  AND billing_mode IN ('calendar_monthly', 'asset_cycle');
