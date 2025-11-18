-- Priority 2.8: Consolidate role system - Update app_role enum and migrate data

-- 1. Update app_role enum to include all roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'operations';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'finance';

-- 2. Ensure company_users table has proper role assignments
-- Migrate any missing roles from user_roles to company_users
INSERT INTO company_users (company_id, user_id, role, is_primary, status, joined_at)
SELECT 
  COALESCE(
    (SELECT company_id FROM company_users cu2 WHERE cu2.user_id = ur.user_id LIMIT 1),
    '00000000-0000-0000-0000-000000000001'::uuid  -- Default to Matrix Network
  ) as company_id,
  ur.user_id,
  ur.role,
  false,
  'active',
  now()
FROM user_roles ur
WHERE NOT EXISTS (
  SELECT 1 FROM company_users cu 
  WHERE cu.user_id = ur.user_id 
  AND cu.role = ur.role
)
ON CONFLICT (company_id, user_id) DO NOTHING;

-- 3. Create view to provide backward compatibility for code still using user_roles
CREATE OR REPLACE VIEW user_roles_compat AS
SELECT DISTINCT
  cu.user_id,
  cu.role,
  cu.joined_at as created_at
FROM company_users cu
WHERE cu.status = 'active';

COMMENT ON VIEW user_roles_compat IS 'Compatibility view for legacy code using user_roles table - maps to company_users';

-- 4. Add helper function to get user roles across all their companies
CREATE OR REPLACE FUNCTION public.get_user_all_roles(p_user_id uuid)
RETURNS TABLE(role app_role, company_id uuid, company_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT 
    cu.role,
    cu.company_id,
    c.name as company_name
  FROM company_users cu
  JOIN companies c ON c.id = cu.company_id
  WHERE cu.user_id = p_user_id
  AND cu.status = 'active'
  ORDER BY cu.is_primary DESC, cu.joined_at ASC;
$function$;

COMMENT ON FUNCTION get_user_all_roles IS 'Returns all roles for a user across all their company associations';