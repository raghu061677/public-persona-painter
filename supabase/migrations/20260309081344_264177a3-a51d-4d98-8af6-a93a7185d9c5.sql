ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS manual_discount_amount numeric DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS manual_discount_reason text;