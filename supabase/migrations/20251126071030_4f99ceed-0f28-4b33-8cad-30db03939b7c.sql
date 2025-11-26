-- Fix the assign_default_company_to_new_user trigger to handle missing company gracefully
DROP TRIGGER IF EXISTS on_auth_user_created_assign_company ON auth.users;
DROP FUNCTION IF EXISTS public.assign_default_company_to_new_user();

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION public.assign_default_company_to_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  matrix_company_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  existing_company_count integer;
  company_exists boolean;
BEGIN
  -- Check if user already has company associations
  SELECT COUNT(*) INTO existing_company_count
  FROM company_users
  WHERE user_id = NEW.id;
  
  -- Only proceed if user has no company associations
  IF existing_company_count = 0 THEN
    -- Check if the default Matrix company exists
    SELECT EXISTS(
      SELECT 1 FROM companies WHERE id = matrix_company_id
    ) INTO company_exists;
    
    -- Only insert if the company exists
    IF company_exists THEN
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
      )
      ON CONFLICT (company_id, user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to assign default company: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_assign_company
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_company_to_new_user();