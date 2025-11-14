-- First, alter the table to add granular permission columns
ALTER TABLE role_permissions 
  ADD COLUMN IF NOT EXISTS can_view boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_update boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete boolean DEFAULT false;

-- Drop the old can_access column if it exists
ALTER TABLE role_permissions DROP COLUMN IF EXISTS can_access;

-- Delete existing permissions to reset
DELETE FROM role_permissions;

-- Configure sales role permissions
INSERT INTO role_permissions (role, module, can_view, can_create, can_update, can_delete)
VALUES 
  -- Sales CAN access these modules
  ('sales', 'clients', true, true, true, false),
  ('sales', 'leads', true, true, true, false),
  ('sales', 'media_assets', true, false, false, false),
  ('sales', 'plans', true, true, true, false),
  ('sales', 'campaigns', true, true, true, false),
  ('sales', 'invoices', true, false, false, false),
  ('sales', 'estimations', true, true, true, false),
  ('sales', 'proformas', true, true, true, false),
  -- Sales CANNOT access administrative modules
  ('sales', 'user_management', false, false, false, false),
  ('sales', 'company_settings', false, false, false, false),
  ('sales', 'role_permissions', false, false, false, false),
  ('sales', 'expenses', false, false, false, false),
  ('sales', 'power_bills', false, false, false, false);

-- Configure operations role permissions
INSERT INTO role_permissions (role, module, can_view, can_create, can_update, can_delete)
VALUES 
  ('operations', 'campaigns', true, false, true, false),
  ('operations', 'media_assets', true, false, false, false),
  ('operations', 'power_bills', true, true, true, false),
  ('operations', 'clients', true, false, false, false),
  ('operations', 'user_management', false, false, false, false),
  ('operations', 'company_settings', false, false, false, false);

-- Configure finance role permissions
INSERT INTO role_permissions (role, module, can_view, can_create, can_update, can_delete)
VALUES 
  ('finance', 'invoices', true, true, true, false),
  ('finance', 'expenses', true, true, true, false),
  ('finance', 'estimations', true, false, true, false),
  ('finance', 'proformas', true, true, true, false),
  ('finance', 'clients', true, false, false, false),
  ('finance', 'campaigns', true, false, false, false),
  ('finance', 'power_bills', true, true, true, false),
  ('finance', 'user_management', false, false, false, false),
  ('finance', 'company_settings', false, false, false, false);

-- Configure admin role (full access to everything)
INSERT INTO role_permissions (role, module, can_view, can_create, can_update, can_delete)
VALUES 
  ('admin', 'clients', true, true, true, true),
  ('admin', 'leads', true, true, true, true),
  ('admin', 'media_assets', true, true, true, true),
  ('admin', 'plans', true, true, true, true),
  ('admin', 'campaigns', true, true, true, true),
  ('admin', 'invoices', true, true, true, true),
  ('admin', 'estimations', true, true, true, true),
  ('admin', 'proformas', true, true, true, true),
  ('admin', 'expenses', true, true, true, true),
  ('admin', 'power_bills', true, true, true, true),
  ('admin', 'user_management', true, true, true, true),
  ('admin', 'company_settings', true, true, true, true),
  ('admin', 'role_permissions', true, true, true, true);

-- Configure user role (basic read access)
INSERT INTO role_permissions (role, module, can_view, can_create, can_update, can_delete)
VALUES 
  ('user', 'clients', true, false, false, false),
  ('user', 'media_assets', true, false, false, false),
  ('user', 'plans', true, false, false, false),
  ('user', 'campaigns', true, false, false, false),
  ('user', 'user_management', false, false, false, false),
  ('user', 'company_settings', false, false, false, false);