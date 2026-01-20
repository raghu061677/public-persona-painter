-- Add tax type columns to plans table
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'CGST_SGST' CHECK (tax_type IN ('CGST_SGST', 'IGST')),
ADD COLUMN IF NOT EXISTS cgst_percent NUMERIC DEFAULT 9,
ADD COLUMN IF NOT EXISTS sgst_percent NUMERIC DEFAULT 9,
ADD COLUMN IF NOT EXISTS igst_percent NUMERIC DEFAULT 18,
ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_amount NUMERIC DEFAULT 0;

-- Add same columns to plan_items for per-item tax tracking
ALTER TABLE public.plan_items
ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'CGST_SGST' CHECK (tax_type IN ('CGST_SGST', 'IGST')),
ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_amount NUMERIC DEFAULT 0;

COMMENT ON COLUMN plans.tax_type IS 'CGST_SGST for same state, IGST for inter-state transactions';
COMMENT ON COLUMN plans.cgst_percent IS 'Central GST percentage (typically 9%)';
COMMENT ON COLUMN plans.sgst_percent IS 'State GST percentage (typically 9%)';
COMMENT ON COLUMN plans.igst_percent IS 'Integrated GST percentage (typically 18%)';