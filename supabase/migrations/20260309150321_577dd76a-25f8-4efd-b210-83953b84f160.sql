
-- Add granular permission columns to role_permissions
ALTER TABLE public.role_permissions
  ADD COLUMN IF NOT EXISTS can_view_financial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_contacts boolean NOT NULL DEFAULT false;

-- Backfill: copy can_view_sensitive to both new columns for existing rows
UPDATE public.role_permissions
SET can_view_financial = can_view_sensitive,
    can_view_contacts = can_view_sensitive
WHERE can_view_sensitive = true;

-- For admin roles, enable both
UPDATE public.role_permissions
SET can_view_financial = true,
    can_view_contacts = true
WHERE role IN ('admin', 'platform_admin');

-- For finance role, enable financial but not contacts
UPDATE public.role_permissions
SET can_view_financial = true
WHERE role = 'finance' AND can_view_financial = false;
