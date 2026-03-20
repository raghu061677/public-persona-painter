
-- Add missing direct tax columns to tax_settings
ALTER TABLE public.tax_settings ADD COLUMN IF NOT EXISTS tds_verify_pan boolean DEFAULT true;
ALTER TABLE public.tax_settings ADD COLUMN IF NOT EXISTS tcs_enabled boolean DEFAULT false;
ALTER TABLE public.tax_settings ADD COLUMN IF NOT EXISTS tcs_default_rate numeric DEFAULT 0.1;
ALTER TABLE public.tax_settings ADD COLUMN IF NOT EXISTS tcs_threshold numeric DEFAULT 50000;
