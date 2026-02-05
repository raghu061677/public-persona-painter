-- =====================================================
-- GST-Based Invoice Number Series Implementation
-- INV for GST > 0%, INV-Z for GST = 0%
-- =====================================================

-- Add prefix column to company_counters for future use
ALTER TABLE public.company_counters ADD COLUMN IF NOT EXISTS prefix TEXT;

-- Create a unique constraint that includes prefix
ALTER TABLE public.company_counters DROP CONSTRAINT IF EXISTS company_counters_unique_key;
CREATE UNIQUE INDEX IF NOT EXISTS company_counters_unique_key 
ON public.company_counters(company_id, counter_type, period, COALESCE(prefix, ''));

-- Add invoice_series_prefix column to invoices table for audit clarity
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_series_prefix TEXT;

-- Create or replace the generate_invoice_id function to support GST-based prefixes
CREATE OR REPLACE FUNCTION public.generate_invoice_id(p_gst_rate NUMERIC DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period TEXT;
  v_prefix TEXT;
  v_seq INTEGER;
  v_new_id TEXT;
BEGIN
  -- Determine prefix based on GST rate
  -- INV-Z for 0% GST, INV for taxable invoices
  IF p_gst_rate IS NOT NULL AND p_gst_rate = 0 THEN
    v_prefix := 'INV-Z';
  ELSE
    v_prefix := 'INV';
  END IF;
  
  -- Format: PREFIX-YYYYMM-#### (monthly sequence)
  v_period := TO_CHAR(CURRENT_DATE, 'YYYYMM');
  
  -- Get next sequence for this month and prefix
  SELECT COALESCE(MAX(
    CASE 
      WHEN id ~ ('^' || v_prefix || '-[0-9]{6}-[0-9]+$')
      THEN CAST(SUBSTRING(id FROM v_prefix || '-[0-9]{6}-([0-9]+)$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO v_seq
  FROM invoices
  WHERE id LIKE v_prefix || '-' || v_period || '-%';
  
  v_new_id := v_prefix || '-' || v_period || '-' || LPAD(v_seq::TEXT, 4, '0');
  
  RETURN v_new_id;
END;
$$;

-- Create generate_invoice_number function for more control (with company and date params)
CREATE OR REPLACE FUNCTION public.generate_invoice_number(
  p_company_id UUID,
  p_invoice_date DATE DEFAULT CURRENT_DATE,
  p_gst_rate NUMERIC DEFAULT 18
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period TEXT;
  v_prefix TEXT;
  v_seq INTEGER;
  v_new_id TEXT;
BEGIN
  -- Determine prefix based on GST rate
  IF p_gst_rate = 0 THEN
    v_prefix := 'INV-Z';
  ELSE
    v_prefix := 'INV';
  END IF;
  
  -- Format period from invoice date
  v_period := TO_CHAR(p_invoice_date, 'YYYYMM');
  
  -- Atomic sequence increment using company_counters table
  INSERT INTO company_counters (company_id, counter_type, period, prefix, current_value)
  VALUES (p_company_id, 'INVOICE', v_period, v_prefix, 1)
  ON CONFLICT (company_id, counter_type, period) 
  WHERE COALESCE(prefix, '') = COALESCE(v_prefix, '')
  DO UPDATE SET 
    current_value = company_counters.current_value + 1,
    updated_at = NOW()
  RETURNING current_value INTO v_seq;
  
  -- If the insert/update didn't return a value, get it manually
  IF v_seq IS NULL THEN
    SELECT COALESCE(MAX(
      CASE 
        WHEN id ~ ('^' || v_prefix || '-[0-9]{6}-[0-9]+$')
        THEN CAST(SUBSTRING(id FROM v_prefix || '-[0-9]{6}-([0-9]+)$') AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO v_seq
    FROM invoices
    WHERE id LIKE v_prefix || '-' || v_period || '-%';
  END IF;
  
  v_new_id := v_prefix || '-' || v_period || '-' || LPAD(v_seq::TEXT, 4, '0');
  
  RETURN v_new_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_invoice_id(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(UUID, DATE, NUMERIC) TO authenticated;