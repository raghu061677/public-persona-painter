
-- Add tax_type to campaigns (CGST_SGST or IGST)
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS tax_type text DEFAULT 'cgst_sgst';

-- Add tax_type to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_type text DEFAULT 'cgst_sgst';

-- Add IGST amount columns to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS cgst_amount numeric DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sgst_amount numeric DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS igst_amount numeric DEFAULT 0;
