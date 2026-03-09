
-- Add owner_id and secondary_owner_ids to clients, plans, campaigns
-- owner_id: active responsible owner (backfilled from created_by)
-- secondary_owner_ids: additional users with full-detail access

-- CLIENTS
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS secondary_owner_ids uuid[] DEFAULT '{}';

-- PLANS
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS secondary_owner_ids uuid[] DEFAULT '{}';

-- CAMPAIGNS
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS secondary_owner_ids uuid[] DEFAULT '{}';

-- Backfill owner_id from created_by where null
UPDATE public.clients SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE public.plans SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE public.campaigns SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;

-- Create a security definer function to check record ownership
-- Used by frontend and can be used in RLS policies
CREATE OR REPLACE FUNCTION public.check_record_detail_access(
  p_table_name text,
  p_record_id text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner boolean := false;
  v_is_admin boolean := false;
BEGIN
  -- Check if user is platform admin or company admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN true;
  END IF;
  
  -- Check company_users for admin role
  SELECT EXISTS (
    SELECT 1 FROM public.company_users WHERE user_id = p_user_id AND role = 'admin'
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN true;
  END IF;

  -- Check ownership based on table
  IF p_table_name = 'clients' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = p_record_id
        AND (created_by = p_user_id OR owner_id = p_user_id OR p_user_id = ANY(secondary_owner_ids))
    ) INTO v_is_owner;
  ELSIF p_table_name = 'plans' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.plans
      WHERE id = p_record_id
        AND (created_by = p_user_id OR owner_id = p_user_id OR p_user_id = ANY(secondary_owner_ids))
    ) INTO v_is_owner;
  ELSIF p_table_name = 'campaigns' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id = p_record_id
        AND (created_by = p_user_id OR owner_id = p_user_id OR p_user_id = ANY(secondary_owner_ids))
    ) INTO v_is_owner;
  END IF;

  RETURN v_is_owner;
END;
$$;
