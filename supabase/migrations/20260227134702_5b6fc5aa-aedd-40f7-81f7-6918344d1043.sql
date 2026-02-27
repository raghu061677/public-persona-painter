
-- Enterprise Rate Settings table for OOH operations
CREATE TABLE public.rate_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category text NOT NULL, -- vendor_mounting, vendor_unmounting, vendor_print_nonlit, vendor_print_backlit, client_mounting_short, client_printing_markup, client_unmounting
  city text, -- nullable = default/all cities
  media_type text, -- nullable = default/all media types
  rate_value numeric NOT NULL DEFAULT 0,
  threshold_days numeric, -- for client_mounting_short: campaign duration threshold
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Index for fast lookups
CREATE INDEX idx_rate_settings_company ON public.rate_settings(company_id, category, is_active);
CREATE INDEX idx_rate_settings_lookup ON public.rate_settings(company_id, category, city, media_type, is_active, effective_from DESC);

-- RLS
ALTER TABLE public.rate_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_settings_tenant_isolation" ON public.rate_settings
  FOR ALL USING (company_id = public.current_company_id());

-- Seed default rates for all existing companies
INSERT INTO public.rate_settings (company_id, category, rate_value, notes)
SELECT c.id, 'vendor_mounting', 700, 'Default mounting rate per asset'
FROM public.companies c WHERE c.status = 'active';

INSERT INTO public.rate_settings (company_id, category, rate_value, notes)
SELECT c.id, 'vendor_unmounting', 350, 'Default unmounting rate per asset'
FROM public.companies c WHERE c.status = 'active';

INSERT INTO public.rate_settings (company_id, category, rate_value, notes)
SELECT c.id, 'vendor_print_nonlit', 6, 'Default non-lit printing rate per sqft'
FROM public.companies c WHERE c.status = 'active';

INSERT INTO public.rate_settings (company_id, category, rate_value, notes)
SELECT c.id, 'vendor_print_backlit', 14, 'Default backlit printing rate per sqft'
FROM public.companies c WHERE c.status = 'active';

INSERT INTO public.rate_settings (company_id, category, rate_value, threshold_days, notes)
SELECT c.id, 'client_mounting_short', 1500, 90, 'Client mounting charge for campaigns ≤90 days'
FROM public.companies c WHERE c.status = 'active';
