
CREATE TABLE public.tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  gstin text,
  pan text,
  msme_registered boolean DEFAULT false,
  msme_number text,
  enable_einvoicing boolean DEFAULT false,
  enable_eway_bill boolean DEFAULT false,
  tds_applicable boolean DEFAULT false,
  tds_percentage numeric DEFAULT 0,
  tds_enabled boolean DEFAULT false,
  default_tds_rate numeric DEFAULT 0,
  tan_number text,
  einvoicing_enabled boolean DEFAULT false,
  einvoicing_api_key text,
  einvoicing_api_secret text,
  eway_bill_enabled boolean DEFAULT false,
  eway_bill_api_key text,
  eway_bill_api_secret text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company tax settings"
  ON public.tax_settings FOR SELECT
  TO authenticated
  USING (company_id = public.current_company_id());

CREATE POLICY "Users can insert own company tax settings"
  ON public.tax_settings FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.current_company_id());

CREATE POLICY "Users can update own company tax settings"
  ON public.tax_settings FOR UPDATE
  TO authenticated
  USING (company_id = public.current_company_id());
