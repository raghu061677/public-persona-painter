
-- Enhance client_registrations table with missing columns
ALTER TABLE public.client_registrations
  ADD COLUMN IF NOT EXISTS registration_type text NOT NULL DEFAULT 'gst'
    CHECK (registration_type IN ('gst','sez','unregistered','export','other')),
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS trade_name text,
  ADD COLUMN IF NOT EXISTS billing_district text,
  ADD COLUMN IF NOT EXISTS billing_country text NOT NULL DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS shipping_district text,
  ADD COLUMN IF NOT EXISTS shipping_country text NOT NULL DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS place_of_supply_state text,
  ADD COLUMN IF NOT EXISTS place_of_supply_state_code text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes text;

-- Add composite index for active registrations
CREATE INDEX IF NOT EXISTS idx_client_registrations_active
  ON public.client_registrations(client_id, is_active);

-- Unique GSTIN per client (prevent duplicate GSTINs under same client)
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_registrations_gstin_unique
  ON public.client_registrations(company_id, client_id, gstin) WHERE gstin IS NOT NULL;

-- Add nullable FK columns to plans, campaigns, invoices
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS client_registration_id uuid REFERENCES public.client_registrations(id);

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS client_registration_id uuid REFERENCES public.client_registrations(id);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_registration_id uuid REFERENCES public.client_registrations(id);

-- Add nullable invoice registration snapshot columns
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS registration_label_snapshot text,
  ADD COLUMN IF NOT EXISTS registration_gstin_snapshot text,
  ADD COLUMN IF NOT EXISTS registration_billing_address_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS registration_shipping_address_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS registration_state_snapshot text,
  ADD COLUMN IF NOT EXISTS registration_state_code_snapshot text;

-- Backfill: update existing default registrations with new column defaults
-- (registration_type and countries already have defaults, no data update needed)

-- Optional: backfill client_registration_id into plans/campaigns/invoices
-- Set to the default registration for each client where currently null
UPDATE public.plans p
SET client_registration_id = cr.id
FROM public.client_registrations cr
WHERE cr.client_id = p.client_id
  AND cr.is_default = true
  AND p.client_registration_id IS NULL;

UPDATE public.campaigns c
SET client_registration_id = cr.id
FROM public.client_registrations cr
WHERE cr.client_id = c.client_id
  AND cr.is_default = true
  AND c.client_registration_id IS NULL;

UPDATE public.invoices i
SET client_registration_id = cr.id
FROM public.client_registrations cr
WHERE cr.client_id = i.client_id
  AND cr.is_default = true
  AND i.client_registration_id IS NULL;
