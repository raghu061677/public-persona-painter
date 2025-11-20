-- Create platform_roles table for platform-level role definitions
CREATE TABLE IF NOT EXISTS public.platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create platform_role_permissions table for granular module permissions
CREATE TABLE IF NOT EXISTS public.platform_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.platform_roles(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, module_name)
);

-- Enable RLS
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only platform admins can manage platform roles
CREATE POLICY "Platform admins can view platform roles"
  ON public.platform_roles FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage platform roles"
  ON public.platform_roles FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can view role permissions"
  ON public.platform_role_permissions FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage role permissions"
  ON public.platform_role_permissions FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- Insert default platform roles
INSERT INTO public.platform_roles (role_name, description, is_system_role) VALUES
  ('platform_admin', 'Full platform administration access', true),
  ('platform_viewer', 'Read-only platform access', true)
ON CONFLICT (role_name) DO NOTHING;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_platform_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_roles_updated_at
  BEFORE UPDATE ON public.platform_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_roles_updated_at();