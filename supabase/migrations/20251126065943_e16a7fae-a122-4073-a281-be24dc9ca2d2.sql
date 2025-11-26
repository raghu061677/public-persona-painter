-- Add new roles for installation and monitor users to app_role enum
-- These must be added in separate transaction before they can be used
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'installation';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'monitor';