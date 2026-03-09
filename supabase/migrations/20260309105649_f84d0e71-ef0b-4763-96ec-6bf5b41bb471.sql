-- Normalize legacy role values in company_users to canonical roles
UPDATE public.company_users SET role = 'operations_manager' WHERE role IN ('operations'::public.app_role, 'manager'::public.app_role);
UPDATE public.company_users SET role = 'mounting' WHERE role = 'installation'::public.app_role;
UPDATE public.company_users SET role = 'monitoring' WHERE role = 'monitor'::public.app_role;
UPDATE public.company_users SET role = 'viewer' WHERE role = 'user'::public.app_role;