-- Seed default permissions for installation and monitor roles
-- Installation role: Can only access operations and view campaigns/assets
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_update, can_delete)
VALUES 
  -- Installation role permissions
  ('installation', 'dashboard', true, false, false, false),
  ('installation', 'media_assets', true, false, false, false),
  ('installation', 'clients', false, false, false, false),
  ('installation', 'plans', false, false, false, false),
  ('installation', 'campaigns', true, false, false, false),
  ('installation', 'operations', true, true, true, false),
  ('installation', 'invoices', false, false, false, false),
  ('installation', 'expenses', false, false, false, false),
  ('installation', 'reports', false, false, false, false),
  ('installation', 'settings', false, false, false, false),
  ('installation', 'users', false, false, false, false),
  
  -- Monitor role permissions
  ('monitor', 'dashboard', true, false, false, false),
  ('monitor', 'media_assets', true, false, false, false),
  ('monitor', 'clients', false, false, false, false),
  ('monitor', 'plans', false, false, false, false),
  ('monitor', 'campaigns', true, false, false, false),
  ('monitor', 'operations', true, true, true, false),
  ('monitor', 'invoices', false, false, false, false),
  ('monitor', 'expenses', false, false, false, false),
  ('monitor', 'reports', false, false, false, false),
  ('monitor', 'settings', false, false, false, false),
  ('monitor', 'users', false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;