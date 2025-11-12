-- Add RLS policies for user_roles table to allow admins to manage them
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Update profiles table policies to allow admins to manage all profiles
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create a function to invite users (will be called from edge function)
CREATE OR REPLACE FUNCTION public.create_user_with_role(
  user_email TEXT,
  user_password TEXT,
  user_role app_role,
  user_name TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  result jsonb;
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- This function is a placeholder - actual user creation happens via Supabase Auth API
  -- Return success structure for edge function to handle
  result := jsonb_build_object(
    'success', true,
    'email', user_email,
    'role', user_role,
    'name', user_name
  );
  
  RETURN result;
END;
$$;