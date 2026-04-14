ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS billing_mode text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cycle_start_date date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cycle_end_date date;