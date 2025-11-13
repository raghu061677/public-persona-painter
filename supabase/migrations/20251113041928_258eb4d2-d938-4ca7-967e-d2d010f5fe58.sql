-- Ensure the handle_raghu_admin trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created_raghu ON auth.users;

CREATE TRIGGER on_auth_user_created_raghu
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_raghu_admin();

-- Also ensure existing raghu accounts have admin role
DO $$
DECLARE
  raghu_user_id uuid;
BEGIN
  -- Get raghu's user ID
  SELECT id INTO raghu_user_id
  FROM auth.users
  WHERE email IN ('raghu@go-ads.in', 'raghu.g@go-ads.in')
  LIMIT 1;
  
  IF raghu_user_id IS NOT NULL THEN
    -- Insert admin role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (raghu_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update profile name if needed
    UPDATE public.profiles 
    SET username = 'Raghu Gajula (Super Admin)'
    WHERE id = raghu_user_id;
  END IF;
END $$;