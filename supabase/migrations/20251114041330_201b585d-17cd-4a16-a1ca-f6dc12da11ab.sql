-- Update the audit log function to handle null user_id gracefully
CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.client_audit_log (client_id, user_id, action, new_values)
    VALUES (NEW.id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'insert', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.client_audit_log (client_id, user_id, action, old_values, new_values, changed_fields)
    VALUES (
      NEW.id, 
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 
      'update', 
      to_jsonb(OLD),
      to_jsonb(NEW),
      (
        SELECT jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val))
        FROM (
          SELECT o.key, o.value as old_val, n.value as new_val
          FROM jsonb_each(to_jsonb(OLD)) AS o(key, value)
          JOIN jsonb_each(to_jsonb(NEW)) AS n(key, value) ON o.key = n.key
          WHERE o.value IS DISTINCT FROM n.value
        ) changes
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.client_audit_log (client_id, user_id, action, old_values)
    VALUES (OLD.id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'delete', to_jsonb(OLD));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create default company for existing data
INSERT INTO public.companies (
  id,
  name,
  legal_name,
  type,
  status,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Go-Ads Platform',
  'Go-Ads Media Solutions',
  'platform_admin',
  'active',
  now()
) ON CONFLICT (id) DO NOTHING;

-- Assign all existing data to default company
UPDATE public.media_assets SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.clients SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.plans SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.campaigns SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.estimations SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.invoices SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.expenses SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.leads SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- Create default company_user record for the first admin user
DO $$
DECLARE
  first_admin_id uuid;
BEGIN
  SELECT user_id INTO first_admin_id
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;
  
  IF first_admin_id IS NOT NULL THEN
    INSERT INTO public.company_users (
      company_id,
      user_id,
      role,
      is_primary,
      status
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      first_admin_id,
      'admin',
      true,
      'active'
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;