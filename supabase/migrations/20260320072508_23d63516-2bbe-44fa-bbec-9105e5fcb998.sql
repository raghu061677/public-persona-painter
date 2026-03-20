
-- Add bank detail columns to companies table with defaults matching current hardcoded values
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bank_name text DEFAULT 'HDFC Bank Limited';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bank_branch text DEFAULT 'Karkhana Road, Secunderabad – 500009';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bank_account_no text DEFAULT '50200010727301';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bank_ifsc text DEFAULT 'HDFC0001555';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS bank_account_name text DEFAULT 'Matrix Network Solutions';
