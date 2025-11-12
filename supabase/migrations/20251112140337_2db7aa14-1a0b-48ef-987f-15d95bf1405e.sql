-- Clean up and recreate policies properly

-- Drop all user_roles policies and recreate them cleanly
DROP POLICY IF EXISTS "Service role can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Allow service role (used by edge functions) to manage all roles
CREATE POLICY "Service role can manage all roles"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow admins to manage user roles
CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Ensure profiles table allows service role
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

CREATE POLICY "Service role can manage all profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Make sure current logged-in user has admin role
DO $$
DECLARE
  raghu_user_id uuid;
BEGIN
  -- Get raghu's user id from auth.users  
  SELECT id INTO raghu_user_id FROM auth.users WHERE email IN ('raghu@go-ads.in', 'raghu.g@go-ads.in') LIMIT 1;
  
  IF raghu_user_id IS NOT NULL THEN
    -- Ensure raghu has admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (raghu_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update profile
    INSERT INTO public.profiles (id, username)
    VALUES (raghu_user_id, 'Raghu Gajula (Admin)')
    ON CONFLICT (id) DO UPDATE SET username = 'Raghu Gajula (Admin)';
    
    RAISE NOTICE 'Admin role granted to user %', raghu_user_id;
  END IF;
END $$;