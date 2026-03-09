
-- Create security definer function to check role_permissions (cast app_role to text)
CREATE OR REPLACE FUNCTION public.check_role_permission(
  p_user_id uuid,
  p_module text,
  p_action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM role_permissions rp
    JOIN company_users cu ON cu.user_id = p_user_id AND cu.status = 'active'
    WHERE rp.role = cu.role::text
      AND rp.module = p_module
      AND rp.company_id IS NULL
      AND CASE p_action
        WHEN 'create' THEN rp.can_create
        WHEN 'edit' THEN COALESCE(rp.can_edit, rp.can_update)
        WHEN 'delete' THEN rp.can_delete
        ELSE false
      END = true
  )
  OR is_platform_admin(p_user_id)
$$;

-- Replace overly permissive RLS policies
DROP POLICY IF EXISTS "Users can create media assets" ON media_assets;
DROP POLICY IF EXISTS "Users can update media assets" ON media_assets;
DROP POLICY IF EXISTS "Users can delete media assets" ON media_assets;

CREATE POLICY "RBAC: create media assets" ON media_assets
FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM company_users 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  AND check_role_permission(auth.uid(), 'media_assets', 'create')
);

CREATE POLICY "RBAC: update media assets" ON media_assets
FOR UPDATE TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM company_users 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  AND check_role_permission(auth.uid(), 'media_assets', 'edit')
);

CREATE POLICY "RBAC: delete media assets" ON media_assets
FOR DELETE TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM company_users 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  AND check_role_permission(auth.uid(), 'media_assets', 'delete')
);
