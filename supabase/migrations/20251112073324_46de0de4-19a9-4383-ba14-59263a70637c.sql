-- Create user management tables

-- Table for managing user permissions by role and module
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, module)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage role permissions"
  ON public.role_permissions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view role permissions"
  ON public.role_permissions
  FOR SELECT
  USING (true);

-- Insert default role permissions
INSERT INTO public.role_permissions (role, module, can_access) VALUES
  -- Admin: full access
  ('admin', 'sales', true),
  ('admin', 'planning', true),
  ('admin', 'execution', true),
  ('admin', 'inventory', true),
  ('admin', 'finance', true),
  ('admin', 'administration', true),
  
  -- Sales: sales and planning
  ('sales', 'sales', true),
  ('sales', 'planning', true),
  ('sales', 'execution', false),
  ('sales', 'inventory', false),
  ('sales', 'finance', false),
  ('sales', 'administration', false),
  
  -- Operations: execution and inventory
  ('operations', 'sales', false),
  ('operations', 'planning', true),
  ('operations', 'execution', true),
  ('operations', 'inventory', true),
  ('operations', 'finance', false),
  ('operations', 'administration', false),
  
  -- Finance: finance module
  ('finance', 'sales', false),
  ('finance', 'planning', false),
  ('finance', 'execution', false),
  ('finance', 'inventory', false),
  ('finance', 'finance', true),
  ('finance', 'administration', false)
ON CONFLICT (role, module) DO NOTHING;

-- Add updated_at trigger
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger to automatically create admin role for raghu@go-ads.in
CREATE OR REPLACE FUNCTION public.handle_raghu_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the new user is raghu@go-ads.in
  IF NEW.email = 'raghu@go-ads.in' OR NEW.email = 'raghu.g@go-ads.in' THEN
    -- Ensure admin role exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update profile
    UPDATE public.profiles 
    SET username = 'Raghu Gajula (Super Admin)'
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_raghu_admin ON auth.users;
CREATE TRIGGER on_auth_user_raghu_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_raghu_admin();