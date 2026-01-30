-- Monthly Invoice: Unique constraint to prevent duplicate monthly invoices per campaign
-- ========================================================

-- A) Add unique constraint on invoices(company_id, campaign_id, billing_month)
-- This prevents duplicate monthly invoices for the same campaign
-- First, remove any existing duplicates (keep the most recent)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY company_id, campaign_id, billing_month 
           ORDER BY created_at DESC
         ) as rn
  FROM invoices
  WHERE campaign_id IS NOT NULL 
    AND billing_month IS NOT NULL
    AND company_id IS NOT NULL
)
DELETE FROM invoices 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Now add the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_monthly_billing 
ON invoices (company_id, campaign_id, billing_month) 
WHERE campaign_id IS NOT NULL 
  AND billing_month IS NOT NULL 
  AND company_id IS NOT NULL;

-- B) Add gst_mode column to invoices (CGST_SGST or IGST)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'gst_mode'
  ) THEN
    ALTER TABLE invoices ADD COLUMN gst_mode TEXT DEFAULT 'CGST_SGST' 
      CHECK (gst_mode IN ('CGST_SGST', 'IGST'));
  END IF;
END $$;

-- C) Update generate_invoice_id function for monthly format INV-YYYYMM-####
CREATE OR REPLACE FUNCTION generate_invoice_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period TEXT;
  v_seq INTEGER;
  v_new_id TEXT;
BEGIN
  -- Format: INV-YYYYMM-#### (monthly sequence)
  v_period := TO_CHAR(CURRENT_DATE, 'YYYYMM');
  
  -- Get next sequence for this month
  SELECT COALESCE(MAX(
    CASE 
      WHEN id ~ '^INV-[0-9]{6}-[0-9]+$' 
      THEN CAST(SUBSTRING(id FROM 'INV-[0-9]{6}-([0-9]+)$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO v_seq
  FROM invoices
  WHERE id LIKE 'INV-' || v_period || '-%';
  
  v_new_id := 'INV-' || v_period || '-' || LPAD(v_seq::TEXT, 4, '0');
  
  RETURN v_new_id;
END;
$$;

-- D) Create function to check if invoice exists for campaign+month
CREATE OR REPLACE FUNCTION check_existing_monthly_invoice(
  p_company_id UUID,
  p_campaign_id TEXT,
  p_billing_month TEXT
)
RETURNS TABLE(
  invoice_id TEXT,
  status TEXT,
  total_amount NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id::TEXT,
    i.status::TEXT,
    i.total_amount,
    i.created_at
  FROM invoices i
  WHERE i.company_id = p_company_id
    AND i.campaign_id = p_campaign_id
    AND i.billing_month = p_billing_month
  LIMIT 1;
END;
$$;

-- E) Create function to determine GST mode based on company and client states
CREATE OR REPLACE FUNCTION get_gst_mode(
  p_company_state TEXT,
  p_client_state TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- If company and client are in the same state: CGST+SGST
  -- If different states: IGST
  IF LOWER(TRIM(COALESCE(p_company_state, ''))) = LOWER(TRIM(COALESCE(p_client_state, ''))) 
     AND p_company_state IS NOT NULL 
     AND p_client_state IS NOT NULL 
     AND TRIM(p_company_state) != '' 
     AND TRIM(p_client_state) != '' THEN
    RETURN 'CGST_SGST';
  ELSE
    -- Default to CGST_SGST if unable to determine (same state assumed for local)
    -- Or IGST if explicitly different states
    IF p_client_state IS NOT NULL AND TRIM(p_client_state) != '' THEN
      RETURN 'IGST';
    ELSE
      RETURN 'CGST_SGST';
    END IF;
  END IF;
END;
$$;