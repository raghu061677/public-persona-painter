-- Function to create platform admin company and assign user
CREATE OR REPLACE FUNCTION public.setup_platform_admin(
  p_user_email text,
  p_company_name text DEFAULT 'Go-Ads Platform'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_result jsonb;
BEGIN
  -- Get user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User with email ' || p_user_email || ' not found'
    );
  END IF;
  
  -- Check if platform admin company already exists
  SELECT id INTO v_company_id
  FROM companies
  WHERE type = 'platform_admin'
  LIMIT 1;
  
  -- Create platform admin company if it doesn't exist
  IF v_company_id IS NULL THEN
    INSERT INTO companies (
      name,
      legal_name,
      type,
      status,
      created_by,
      theme_color,
      secondary_color
    ) VALUES (
      p_company_name,
      p_company_name || ' Administration',
      'platform_admin',
      'active',
      v_user_id,
      '#1e40af',
      '#10b981'
    )
    RETURNING id INTO v_company_id;
  END IF;
  
  -- Link user to platform admin company
  INSERT INTO company_users (
    company_id,
    user_id,
    role,
    is_primary,
    status
  ) VALUES (
    v_company_id,
    v_user_id,
    'admin',
    true,
    'active'
  )
  ON CONFLICT (company_id, user_id) 
  DO UPDATE SET 
    role = 'admin',
    is_primary = true,
    status = 'active';
  
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Platform admin access granted',
    'user_id', v_user_id,
    'company_id', v_company_id,
    'user_email', p_user_email
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.setup_platform_admin(text, text) TO authenticated;

COMMENT ON FUNCTION public.setup_platform_admin IS 'Creates platform admin company and assigns user as admin. Only needs to be run once per user.';
