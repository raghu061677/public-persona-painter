-- Verify Matrix Network Solutions company exists and seed if needed
INSERT INTO companies (
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
  phone,
  email,
  status,
  theme_color,
  secondary_color,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Matrix Network Solutions',
  'Matrix Network Solutions Pvt Ltd',
  'media_owner',
  '36AAACM1234A1Z5',
  'AAACM1234A',
  '123 MG Road, Begumpet',
  'Hyderabad',
  'Telangana',
  '500016',
  '+91-9876543210',
  'info@matrixnetwork.in',
  'active',
  '#1e40af',
  '#10b981',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name,
  status = EXCLUDED.status,
  updated_at = now();

-- Add helper function to get user profile info (using existing profiles schema)
CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  username text,
  avatar_url text,
  roles jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    au.email,
    p.username,
    p.avatar_url,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'company_id', cu.company_id,
          'company_name', c.name,
          'role', cu.role,
          'is_primary', cu.is_primary,
          'status', cu.status
        )
      ) FILTER (WHERE cu.id IS NOT NULL),
      '[]'::jsonb
    ) as roles
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  LEFT JOIN company_users cu ON cu.user_id = p.id
  LEFT JOIN companies c ON c.id = cu.company_id
  WHERE p.id = p_user_id
  GROUP BY p.id, au.email, p.username, p.avatar_url;
$$;

-- Add function to list all users (platform admin only)
CREATE OR REPLACE FUNCTION public.list_all_users()
RETURNS TABLE(
  id uuid,
  email text,
  username text,
  created_at timestamptz,
  companies jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    au.email,
    p.username,
    au.created_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'company_id', cu.company_id,
          'company_name', c.name,
          'role', cu.role,
          'is_primary', cu.is_primary,
          'status', cu.status
        ) ORDER BY cu.is_primary DESC, cu.joined_at
      ) FILTER (WHERE cu.id IS NOT NULL),
      '[]'::jsonb
    ) as companies
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  LEFT JOIN company_users cu ON cu.user_id = p.id AND cu.status = 'active'
  LEFT JOIN companies c ON c.id = cu.company_id
  WHERE is_platform_admin(auth.uid())
  GROUP BY p.id, au.email, p.username, au.created_at
  ORDER BY au.created_at DESC;
$$;

-- Add function to assign user to company
CREATE OR REPLACE FUNCTION public.assign_user_to_company(
  p_user_id uuid,
  p_company_id uuid,
  p_role app_role,
  p_is_primary boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Check permissions
  IF NOT (is_platform_admin(auth.uid()) OR 
    (user_in_company(auth.uid(), p_company_id) AND has_role(auth.uid(), 'admin'))) THEN
    RAISE EXCEPTION 'Insufficient permissions to assign users';
  END IF;

  -- Insert or update company_users
  INSERT INTO company_users (
    company_id,
    user_id,
    role,
    is_primary,
    status,
    invited_by
  ) VALUES (
    p_company_id,
    p_user_id,
    p_role,
    p_is_primary,
    'active',
    auth.uid()
  )
  ON CONFLICT (company_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_primary = EXCLUDED.is_primary,
    status = 'active';

  v_result := jsonb_build_object(
    'success', true,
    'message', 'User assigned to company successfully',
    'user_id', p_user_id,
    'company_id', p_company_id,
    'role', p_role
  );
  
  RETURN v_result;
END;
$$;

-- Add function to remove user from company
CREATE OR REPLACE FUNCTION public.remove_user_from_company(
  p_user_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check permissions
  IF NOT (is_platform_admin(auth.uid()) OR 
    (user_in_company(auth.uid(), p_company_id) AND has_role(auth.uid(), 'admin'))) THEN
    RAISE EXCEPTION 'Insufficient permissions to remove users';
  END IF;

  -- Update status to inactive instead of deleting
  UPDATE company_users
  SET status = 'inactive'
  WHERE user_id = p_user_id AND company_id = p_company_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User removed from company successfully'
  );
END;
$$;