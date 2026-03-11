
-- Add payment_terms column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT NULL;

-- Add payment_terms column to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT NULL;

-- Add default_payment_terms column to organization_settings table
ALTER TABLE public.organization_settings ADD COLUMN IF NOT EXISTS default_payment_terms TEXT DEFAULT 'Net 30 Days';
