-- ============================================
-- PHASE 1: CLIENT PORTAL USERS & AUTHENTICATION
-- ============================================

-- Create client portal users table
CREATE TABLE IF NOT EXISTS public.client_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  email text UNIQUE NOT NULL,
  name text,
  phone text,
  role text DEFAULT 'viewer' CHECK (role IN ('viewer', 'admin')),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_login timestamptz,
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  magic_link_token text,
  magic_link_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on client_portal_users
ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_portal_users
CREATE POLICY "Admins can manage client portal users"
ON public.client_portal_users
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Client portal users can view their own record"
ON public.client_portal_users
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- ============================================
-- PHASE 2: MULTI-TENANT RLS POLICIES
-- ============================================

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM public.company_users
  WHERE user_id = auth.uid()
  AND status = 'active'
  LIMIT 1;
$$;

-- Add company_id to tables that don't have it
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- ============================================
-- RLS POLICIES: CLIENTS TABLE
-- ============================================

-- Drop existing policies to recreate with company_id
DROP POLICY IF EXISTS "Admin can update all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Operations and finance can view basic client info" ON public.clients;
DROP POLICY IF EXISTS "Sales can update assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view their company clients" ON public.clients;

-- New RLS policies for clients with tenant isolation
CREATE POLICY "Company users can view their company clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  company_id = get_current_user_company_id()
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Admins can insert company clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role))
  AND company_id = get_current_user_company_id()
);

CREATE POLICY "Admins can update company clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  company_id = get_current_user_company_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role))
);

CREATE POLICY "Admins can delete company clients"
ON public.clients
FOR DELETE
TO authenticated
USING (
  company_id = get_current_user_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Client portal users can view their client data"
ON public.clients
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT client_id FROM public.client_portal_users
    WHERE auth_user_id = auth.uid() AND is_active = true
  )
);

-- ============================================
-- RLS POLICIES: PLANS TABLE
-- ============================================

DROP POLICY IF EXISTS "Admins can delete plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can insert plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can update plans" ON public.plans;

CREATE POLICY "Company users can view their company plans"
ON public.plans
FOR SELECT
TO authenticated
USING (
  company_id = get_current_user_company_id()
  OR is_platform_admin(auth.uid())
  OR client_id IN (
    SELECT client_id FROM public.client_portal_users
    WHERE auth_user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can insert company plans"
ON public.plans
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role))
  AND company_id = get_current_user_company_id()
);

CREATE POLICY "Admins can update company plans"
ON public.plans
FOR UPDATE
TO authenticated
USING (
  company_id = get_current_user_company_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role))
);

CREATE POLICY "Admins can delete company plans"
ON public.plans
FOR DELETE
TO authenticated
USING (
  company_id = get_current_user_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- RLS POLICIES: CAMPAIGNS TABLE
-- ============================================

DROP POLICY IF EXISTS "Admins can delete campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins can insert campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins can update campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Finance can view campaigns for invoicing" ON public.campaigns;
DROP POLICY IF EXISTS "Operations can view assigned campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can view campaigns they created" ON public.campaigns;
DROP POLICY IF EXISTS "Users can view their company campaigns" ON public.campaigns;

CREATE POLICY "Company users can view their company campaigns"
ON public.campaigns
FOR SELECT
TO authenticated
USING (
  company_id = get_current_user_company_id()
  OR is_platform_admin(auth.uid())
  OR client_id IN (
    SELECT client_id FROM public.client_portal_users
    WHERE auth_user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can insert company campaigns"
ON public.campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role))
  AND company_id = get_current_user_company_id()
);

CREATE POLICY "Admins can update company campaigns"
ON public.campaigns
FOR UPDATE
TO authenticated
USING (
  company_id = get_current_user_company_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
);

CREATE POLICY "Admins can delete company campaigns"
ON public.campaigns
FOR DELETE
TO authenticated
USING (
  company_id = get_current_user_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- RLS POLICIES: INVOICES TABLE
-- ============================================

DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;

CREATE POLICY "Company users can view their company invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  company_id = get_current_user_company_id()
  OR is_platform_admin(auth.uid())
  OR client_id IN (
    SELECT client_id FROM public.client_portal_users
    WHERE auth_user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can insert company invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role))
  AND company_id = get_current_user_company_id()
);

CREATE POLICY "Admins can update company invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (
  company_id = get_current_user_company_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role))
);

CREATE POLICY "Admins can delete company invoices"
ON public.invoices
FOR DELETE
TO authenticated
USING (
  company_id = get_current_user_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- RLS POLICIES: EXPENSES TABLE
-- ============================================

DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;

CREATE POLICY "Company users can view their company expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  company_id = get_current_user_company_id()
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Admins can insert company expenses"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role))
  AND company_id = get_current_user_company_id()
);

CREATE POLICY "Admins can update company expenses"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  company_id = get_current_user_company_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role))
);

CREATE POLICY "Admins can delete company expenses"
ON public.expenses
FOR DELETE
TO authenticated
USING (
  company_id = get_current_user_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_plans_company_id ON public.plans(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON public.campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_users_email ON public.client_portal_users(email);
CREATE INDEX IF NOT EXISTS idx_client_portal_users_auth_user_id ON public.client_portal_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_users_client_id ON public.client_portal_users(client_id);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION public.update_client_portal_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_client_portal_users_updated_at
BEFORE UPDATE ON public.client_portal_users
FOR EACH ROW
EXECUTE FUNCTION public.update_client_portal_users_updated_at();