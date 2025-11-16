-- Ensure the current user (raghu@go-ads.in) has admin role
-- This is safe to run multiple times due to ON CONFLICT
DO $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
BEGIN
  -- Get raghu's user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'raghu@go-ads.in' OR email = 'raghu.g@go-ads.in'
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Ensure admin role exists in user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Get or create platform admin company
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE type = 'platform_admin'
    LIMIT 1;
    
    IF v_company_id IS NULL THEN
      INSERT INTO public.companies (
        name, 
        legal_name, 
        type, 
        status,
        created_by
      )
      VALUES (
        'Go-Ads Platform',
        'Go-Ads Platform Administration',
        'platform_admin',
        'active',
        v_user_id
      )
      RETURNING id INTO v_company_id;
    END IF;
    
    -- Link user to platform admin company
    INSERT INTO public.company_users (
      company_id,
      user_id,
      role,
      is_primary,
      status
    )
    VALUES (
      v_company_id,
      v_user_id,
      'admin'::app_role,
      true,
      'active'
    )
    ON CONFLICT (company_id, user_id) 
    DO UPDATE SET 
      role = 'admin',
      is_primary = true,
      status = 'active';
  END IF;
END $$;