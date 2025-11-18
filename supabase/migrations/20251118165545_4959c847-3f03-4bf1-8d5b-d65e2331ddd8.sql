-- Fix log_security_event trigger to handle tables without company_id

-- Drop the old function
DROP FUNCTION IF EXISTS log_security_event() CASCADE;

-- Recreate with proper handling for tables without company_id
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  company_id_value uuid;
BEGIN
  -- Try to get company_id from NEW or OLD record if it exists
  BEGIN
    company_id_value := COALESCE(
      (to_jsonb(NEW)->>'company_id')::uuid,
      (to_jsonb(OLD)->>'company_id')::uuid
    );
  EXCEPTION WHEN OTHERS THEN
    company_id_value := NULL;
  END;

  INSERT INTO activity_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(OLD)->>'id')),
    jsonb_build_object(
      'company_id', company_id_value,
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Now seed Matrix Network Solutions
INSERT INTO public.companies (
  id,
  name,
  legal_name,
  type,
  gstin,
  pan,
  address_line1,
  city,
  state,
  pincode,
  country,
  phone,
  email,
  website,
  theme_color,
  secondary_color,
  status,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Matrix Network Solutions',
  'Matrix Network Solutions Pvt Ltd',
  'media_owner',
  '36AATFM4107H2Z3',
  'AATFM4107H',
  'Plot No. 123, Jubilee Hills',
  'Hyderabad',
  'Telangana',
  '500033',
  'India',
  '+91-9876543210',
  'info@matrixnetwork.in',
  'https://matrixnetwork.in',
  '#1e40af',
  '#10b981',
  'active',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name,
  gstin = EXCLUDED.gstin,
  pan = EXCLUDED.pan,
  status = EXCLUDED.status,
  updated_at = now();

-- Create auto-assign function
CREATE OR REPLACE FUNCTION public.assign_default_company_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  matrix_company_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  existing_company_count integer;
BEGIN
  SELECT COUNT(*) INTO existing_company_count
  FROM company_users
  WHERE user_id = NEW.id;
  
  IF existing_company_count = 0 THEN
    INSERT INTO company_users (
      company_id,
      user_id,
      role,
      is_primary,
      status,
      joined_at
    ) VALUES (
      matrix_company_id,
      NEW.id,
      'user',
      true,
      'active',
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created_assign_company ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_company
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_company_to_new_user();

-- Fix user_roles_compat view security
ALTER VIEW user_roles_compat SET (security_invoker = true);