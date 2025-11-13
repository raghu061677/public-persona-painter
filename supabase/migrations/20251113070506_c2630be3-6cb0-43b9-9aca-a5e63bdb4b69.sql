-- Reset admin password to 'Admin@123'
-- This is a one-time password reset for admin@go-ads.in

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the admin user ID
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@go-ads.in';

  -- Update the password using the auth schema functions
  -- Password hash for 'Admin@123'
  UPDATE auth.users 
  SET 
    encrypted_password = crypt('Admin@123', gen_salt('bf')),
    email_confirmed_at = NOW(),
    banned_until = NULL,
    updated_at = NOW()
  WHERE id = admin_user_id;

  -- Ensure user has admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

END $$;