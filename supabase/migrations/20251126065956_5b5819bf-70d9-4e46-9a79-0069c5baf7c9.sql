-- Create helper function to check if user is field operations role
-- This function is used by RLS policies to allow installation and monitor users
-- to access only their assigned campaigns and related data
CREATE OR REPLACE FUNCTION public.is_field_operations_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users
    WHERE user_id = _user_id
    AND role IN ('installation', 'monitor', 'operations')
    AND status = 'active'
  );
$$;