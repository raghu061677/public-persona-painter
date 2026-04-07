
-- Add sequence exclusion fields to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_finance_mistake boolean NOT NULL DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS exclude_from_sequence boolean NOT NULL DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS voided_by uuid;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS voided_at timestamptz;

-- Create index for efficient sequence queries
CREATE INDEX IF NOT EXISTS idx_invoices_sequence_exclusion ON public.invoices (company_id, exclude_from_sequence) WHERE exclude_from_sequence = true;

-- Function to reset invoice counter for a series+FY, skipping excluded invoices
CREATE OR REPLACE FUNCTION public.reset_invoice_counter(
  p_company_id uuid,
  p_prefix text,
  p_fy_label text,
  p_target_seq integer,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_last_seq integer;
  v_max_active_seq integer;
  v_excluded_count integer;
  v_active_count integer;
  v_conflict_id text;
  v_result jsonb;
BEGIN
  -- Get current counter value
  SELECT last_seq INTO v_current_last_seq
  FROM invoice_counters
  WHERE company_id = p_company_id AND prefix = p_prefix AND fy_label = p_fy_label;

  IF v_current_last_seq IS NULL THEN
    v_current_last_seq := 0;
  END IF;

  -- Count excluded invoices in this series+FY
  SELECT count(*) INTO v_excluded_count
  FROM invoices
  WHERE company_id = p_company_id
    AND id LIKE p_prefix || '/' || p_fy_label || '/%'
    AND exclude_from_sequence = true;

  -- Find max active (non-excluded) sequence number
  SELECT COALESCE(max(
    (regexp_match(id, '/' || p_fy_label || '/(\d+)$'))[1]::integer
  ), 0) INTO v_max_active_seq
  FROM invoices
  WHERE company_id = p_company_id
    AND id LIKE p_prefix || '/' || p_fy_label || '/%'
    AND exclude_from_sequence = false
    AND is_finance_mistake = false;

  -- Count active invoices
  SELECT count(*) INTO v_active_count
  FROM invoices
  WHERE company_id = p_company_id
    AND id LIKE p_prefix || '/' || p_fy_label || '/%'
    AND exclude_from_sequence = false
    AND is_finance_mistake = false;

  -- Check if target seq would conflict with an active invoice
  v_conflict_id := p_prefix || '/' || p_fy_label || '/' || LPAD(p_target_seq::text, 4, '0');
  IF EXISTS (
    SELECT 1 FROM invoices
    WHERE id = v_conflict_id
      AND exclude_from_sequence = false
      AND is_finance_mistake = false
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target number ' || v_conflict_id || ' already exists as an active invoice',
      'current_last_seq', v_current_last_seq,
      'max_active_seq', v_max_active_seq,
      'excluded_count', v_excluded_count,
      'active_count', v_active_count
    );
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'current_last_seq', v_current_last_seq,
    'max_active_seq', v_max_active_seq,
    'excluded_count', v_excluded_count,
    'active_count', v_active_count,
    'proposed_next_seq', p_target_seq,
    'proposed_next_id', p_prefix || '/' || p_fy_label || '/' || LPAD(p_target_seq::text, 4, '0')
  );

  IF NOT p_dry_run THEN
    -- Set counter to target_seq - 1 so next finalize produces target_seq
    INSERT INTO invoice_counters (company_id, prefix, fy_label, last_seq)
    VALUES (p_company_id, p_prefix, p_fy_label, p_target_seq - 1)
    ON CONFLICT (company_id, prefix, fy_label)
    DO UPDATE SET last_seq = p_target_seq - 1, updated_at = now();

    v_result := v_result || jsonb_build_object('applied', true);
  END IF;

  RETURN v_result;
END;
$$;
