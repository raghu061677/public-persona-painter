
-- Step 1: Add missing role values to app_role enum (safe, additive only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'operations_manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'operations_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'mounting' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'mounting';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'viewer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'viewer';
  END IF;
END$$;

-- Step 2: Extend role_permissions table with new columns
ALTER TABLE public.role_permissions 
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS can_assign boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_approve boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_export boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_upload_proof boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_sensitive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scope_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS can_edit boolean NOT NULL DEFAULT false;

-- Sync existing can_update values to can_edit
UPDATE public.role_permissions SET can_edit = can_update WHERE can_edit = false AND can_update = true;

-- Step 3: Add unique index for role+module+company
CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_role_module_company_unique 
  ON public.role_permissions (role, module, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Step 4: Create role normalization function
CREATE OR REPLACE FUNCTION public.normalize_role(raw_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE raw_role
    WHEN 'ops' THEN 'operations'
    WHEN 'accounts' THEN 'finance'
    WHEN 'company_admin' THEN 'admin'
    WHEN 'mounter' THEN 'mounting'
    ELSE raw_role
  END;
$$;

-- Step 5: Create function to get permissions for a role+module
CREATE OR REPLACE FUNCTION public.get_role_permission(p_role text, p_module text, p_company_id uuid DEFAULT NULL)
RETURNS TABLE (
  can_view boolean,
  can_create boolean,
  can_edit boolean,
  can_delete boolean,
  can_assign boolean,
  can_approve boolean,
  can_export boolean,
  can_upload_proof boolean,
  can_view_sensitive boolean,
  scope_mode text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(co.can_view, gl.can_view, false),
    COALESCE(co.can_create, gl.can_create, false),
    COALESCE(co.can_edit, gl.can_edit, false),
    COALESCE(co.can_delete, gl.can_delete, false),
    COALESCE(co.can_assign, gl.can_assign, false),
    COALESCE(co.can_approve, gl.can_approve, false),
    COALESCE(co.can_export, gl.can_export, false),
    COALESCE(co.can_upload_proof, gl.can_upload_proof, false),
    COALESCE(co.can_view_sensitive, gl.can_view_sensitive, false),
    COALESCE(co.scope_mode, gl.scope_mode, 'none')
  FROM (SELECT 1) AS dummy
  LEFT JOIN role_permissions gl ON gl.role = p_role AND gl.module = p_module AND gl.company_id IS NULL
  LEFT JOIN role_permissions co ON co.role = p_role AND co.module = p_module AND co.company_id = p_company_id
  LIMIT 1;
$$;
