
-- Fix generate_invoice_id to use INV/FY/SEQ format with INV-Z for 0% GST
CREATE OR REPLACE FUNCTION public.generate_invoice_id(p_gst_rate numeric DEFAULT 18)
RETURNS TEXT
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
BEGIN
  -- Determine prefix based on GST rate
  IF p_gst_rate = 0 THEN
    v_prefix := 'INV-Z';
  ELSE
    v_prefix := 'INV';
  END IF;

  -- Calculate Indian Financial Year (April to March)
  IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
    v_fy_start_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  ELSE
    v_fy_start_year := (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::INTEGER;
  END IF;
  v_fy_end_year := v_fy_start_year + 1;

  -- Format: 2025-26
  v_fy := v_fy_start_year::TEXT || '-' || RIGHT(v_fy_end_year::TEXT, 2);

  -- Get next sequence for this prefix + FY
  -- Match pattern: INV/2025-26/0001 or INV-Z/2025-26/0001
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
