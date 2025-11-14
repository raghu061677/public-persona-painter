-- =====================================================
-- PHASE 1: MULTI-TENANT FOUNDATION SCHEMA
-- =====================================================

-- 1. Create company type enum
CREATE TYPE company_type AS ENUM ('media_owner', 'agency', 'platform_admin');

-- 2. Create company status enum
CREATE TYPE company_status AS ENUM ('pending', 'active', 'suspended', 'cancelled');

-- 3. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type company_type NOT NULL,
  legal_name TEXT,
  gstin TEXT,
  pan TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  country TEXT DEFAULT 'India',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  theme_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#10b981',
  status company_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Create company_users table (link users to companies with roles)
CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  is_primary BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, user_id)
);

-- 5. Add company_id to existing tables
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS owner_company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.estimations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_type ON public.companies(type);
CREATE INDEX IF NOT EXISTS idx_company_users_company ON public.company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_company ON public.media_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_plans_company ON public.plans(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_company ON public.campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company_id);

-- 7. Create helper function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM public.company_users
  WHERE user_id = _user_id
  AND status = 'active'
  LIMIT 1;
$$;

-- 8. Create helper function to check if user belongs to company
CREATE OR REPLACE FUNCTION public.user_in_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users
    WHERE user_id = _user_id
    AND company_id = _company_id
    AND status = 'active'
  );
$$;

-- 9. Create helper function to check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.companies c ON cu.company_id = c.id
    WHERE cu.user_id = _user_id
    AND c.type = 'platform_admin'
    AND c.status = 'active'
  );
$$;

-- 10. Enable RLS on new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies for companies table
CREATE POLICY "Platform admins can view all companies"
  ON public.companies FOR SELECT
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id = get_user_company_id(auth.uid()));

CREATE POLICY "Platform admins can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update companies"
  ON public.companies FOR UPDATE
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Users can update their own company"
  ON public.companies FOR UPDATE
  USING (id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- 12. RLS Policies for company_users table
CREATE POLICY "Platform admins can view all company users"
  ON public.company_users FOR SELECT
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Users can view their company members"
  ON public.company_users FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can insert users"
  ON public.company_users FOR INSERT
  WITH CHECK (
    user_in_company(auth.uid(), company_id) 
    AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Company admins can update users"
  ON public.company_users FOR UPDATE
  USING (
    user_in_company(auth.uid(), company_id) 
    AND has_role(auth.uid(), 'admin')
  );

-- 13. Update RLS policies for existing tables to include company_id filtering
-- Media Assets
DROP POLICY IF EXISTS "Authenticated users can view media assets" ON public.media_assets;
CREATE POLICY "Users can view their company assets"
  ON public.media_assets FOR SELECT
  USING (
    company_id = get_user_company_id(auth.uid()) 
    OR is_public = true
    OR is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can insert media assets" ON public.media_assets;
CREATE POLICY "Admins can insert company assets"
  ON public.media_assets FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can update media assets" ON public.media_assets;
CREATE POLICY "Admins can update company assets"
  ON public.media_assets FOR UPDATE
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete media assets" ON public.media_assets;
CREATE POLICY "Admins can delete company assets"
  ON public.media_assets FOR DELETE
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- Plans
DROP POLICY IF EXISTS "Admin and sales can view all plans" ON public.plans;
CREATE POLICY "Users can view their company plans"
  ON public.plans FOR SELECT
  USING (
    company_id = get_user_company_id(auth.uid())
    OR is_platform_admin(auth.uid())
  );

-- Campaigns
DROP POLICY IF EXISTS "Admin and sales can view all campaigns" ON public.campaigns;
CREATE POLICY "Users can view their company campaigns"
  ON public.campaigns FOR SELECT
  USING (
    company_id = get_user_company_id(auth.uid())
    OR is_platform_admin(auth.uid())
  );

-- Clients
DROP POLICY IF EXISTS "Admin and sales can view clients" ON public.clients;
CREATE POLICY "Users can view their company clients"
  ON public.clients FOR SELECT
  USING (
    company_id = get_user_company_id(auth.uid())
    OR is_platform_admin(auth.uid())
  );

-- 14. Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_companies_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_companies_updated_at();

-- 15. Create default platform admin company if it doesn't exist
INSERT INTO public.companies (name, type, status, legal_name)
VALUES ('Go-Ads Platform', 'platform_admin', 'active', 'Go-Ads 360 Platform')
ON CONFLICT DO NOTHING;