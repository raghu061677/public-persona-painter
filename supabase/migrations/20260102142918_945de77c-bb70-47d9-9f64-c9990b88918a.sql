-- Fix 1: CRITICAL - Profiles table RLS policy is too permissive
-- Drop the overly permissive policy that allows any authenticated user to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Create company-scoped policy for viewing profiles
CREATE POLICY "Users view own profile and company members"
ON profiles FOR SELECT
USING (
  -- Users can always see their own profile
  id = auth.uid() 
  OR
  -- Users can see profiles of other users in their company
  id IN (
    SELECT DISTINCT cu.user_id 
    FROM company_users cu
    WHERE cu.company_id IN (
      SELECT company_id 
      FROM company_users 
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
    AND cu.status = 'active'
  )
  OR
  -- Platform admins can see all profiles
  is_platform_admin(auth.uid())
);

-- Fix 2: Add user_has_role helper function for server-side role validation
CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id uuid, p_required_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.company_users
    WHERE user_id = p_user_id
    AND role = p_required_role
    AND status = 'active'
  )
$$;

-- Fix 3: Fix search_path on existing functions that may be missing it
-- Update has_role function with explicit search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users
    WHERE user_id = _user_id
      AND role = _role
      AND status = 'active'
  )
$$;

-- Update is_platform_admin function with explicit search_path
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.companies c ON cu.company_id = c.id
    WHERE cu.user_id = _user_id
      AND cu.status = 'active'
      AND cu.role = 'admin'
      AND c.type = 'platform_admin'
  )
$$;

-- Update get_current_user_company_id function with explicit search_path
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
  LIMIT 1
$$;

-- Update get_user_company_id function with explicit search_path
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_users
  WHERE user_id = _user_id
    AND status = 'active'
  LIMIT 1
$$;