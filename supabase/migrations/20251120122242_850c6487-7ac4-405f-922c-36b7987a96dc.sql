-- =====================================================
-- Go-Ads 360° Multi-Tenant Setup for Matrix Network Solutions
-- =====================================================

-- 1. Ensure Matrix Network Solutions company exists
INSERT INTO public.companies (
  id,
  name,
  legal_name,
  type,
  status,
  gstin,
  pan,
  address_line1,
  city,
  state,
  country,
  phone,
  email,
  theme_color,
  secondary_color,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Matrix Network Solutions',
  'Matrix Network Solutions Private Limited',
  'media_owner',
  'active',
  '36AATFM4107H2Z3',
  'AATFM4107H',
  'Plot No. 123, Road No. 45, Jubilee Hills',
  'Hyderabad',
  'Telangana',
  'India',
  '+91-9876543210',
  'info@matrixnetwork.in',
  '#1e40af',
  '#10b981',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name,
  gstin = EXCLUDED.gstin,
  status = 'active',
  updated_at = now();

-- 2. Migrate existing media assets to Matrix Network Solutions
UPDATE public.media_assets
SET company_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

-- 3. Migrate existing clients to Matrix Network Solutions
UPDATE public.clients
SET company_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

-- 4. Migrate existing plans to Matrix Network Solutions
UPDATE public.plans
SET company_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

-- 5. Migrate existing campaigns to Matrix Network Solutions
UPDATE public.campaigns
SET company_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

-- 6. Migrate existing leads to Matrix Network Solutions
UPDATE public.leads
SET company_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

-- 7. Add is_public field to media_assets for marketplace visibility
ALTER TABLE public.media_assets 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- 8. Create onboarding_progress table for tracking testing steps
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  module_name text NOT NULL,
  step_name text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id, module_name, step_name)
);

-- Enable RLS on onboarding_progress
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for onboarding_progress
CREATE POLICY "Users can view their company onboarding progress"
ON public.onboarding_progress FOR SELECT
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can manage their company onboarding progress"
ON public.onboarding_progress FOR ALL
USING (company_id = get_current_user_company_id())
WITH CHECK (company_id = get_current_user_company_id());

-- 9. Create marketplace_inquiries table for public booking requests
CREATE TABLE IF NOT EXISTS public.marketplace_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  asset_id text,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  campaign_start_date date,
  campaign_end_date date,
  budget numeric,
  message text,
  lead_id uuid,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on marketplace_inquiries
ALTER TABLE public.marketplace_inquiries ENABLE ROW LEVEL SECURITY;

-- Allow public to insert inquiries
CREATE POLICY "Anyone can submit marketplace inquiries"
ON public.marketplace_inquiries FOR INSERT
WITH CHECK (true);

-- Company users can view their inquiries
CREATE POLICY "Company users can view their marketplace inquiries"
ON public.marketplace_inquiries FOR SELECT
USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

-- Company users can update their inquiries
CREATE POLICY "Company users can update their marketplace inquiries"
ON public.marketplace_inquiries FOR UPDATE
USING (company_id = get_current_user_company_id())
WITH CHECK (company_id = get_current_user_company_id());

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_assets_public ON public.media_assets(is_public, company_id) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_inquiries_company ON public.marketplace_inquiries(company_id, status);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_company ON public.onboarding_progress(company_id, user_id);

-- 11. Update trigger for onboarding_progress
CREATE OR REPLACE FUNCTION update_onboarding_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onboarding_progress_timestamp
BEFORE UPDATE ON public.onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION update_onboarding_progress_updated_at();