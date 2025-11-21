-- Fix get_user_auth_data function to handle GROUP BY properly for companies query
-- The issue occurs when multiple company_users reference the same company
CREATE OR REPLACE FUNCTION get_user_auth_data(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_is_platform_admin boolean;
  v_company_users json;
  v_companies json;
  v_primary_company_id uuid;
BEGIN
  -- Check if user is platform admin
  SELECT EXISTS (
    SELECT 1 FROM company_users cu
    INNER JOIN companies c ON cu.company_id = c.id
    WHERE cu.user_id = p_user_id 
    AND cu.status = 'active'
    AND c.type = 'platform_admin'
  ) INTO v_is_platform_admin;

  -- Get user's company associations with role info
  SELECT json_agg(
    json_build_object(
      'company_id', cu.company_id,
      'role', cu.role,
      'is_primary', cu.is_primary,
      'status', cu.status
    )
  )
  INTO v_company_users
  FROM company_users cu
  WHERE cu.user_id = p_user_id AND cu.status = 'active';

  -- Get primary company ID
  SELECT cu.company_id INTO v_primary_company_id
  FROM company_users cu
  WHERE cu.user_id = p_user_id 
  AND cu.status = 'active'
  AND cu.is_primary = true
  LIMIT 1;

  -- If no primary, get first active company
  IF v_primary_company_id IS NULL THEN
    SELECT cu.company_id INTO v_primary_company_id
    FROM company_users cu
    WHERE cu.user_id = p_user_id 
    AND cu.status = 'active'
    ORDER BY cu.joined_at ASC
    LIMIT 1;
  END IF;

  -- Get companies based on admin status
  IF v_is_platform_admin THEN
    SELECT json_agg(
      json_build_object(
        'id', c.id,
        'name', c.name,
        'type', c.type,
        'legal_name', c.legal_name,
        'gstin', c.gstin,
        'logo_url', c.logo_url,
        'theme_color', c.theme_color,
        'secondary_color', c.secondary_color,
        'status', c.status
      ) ORDER BY c.name
    )
    INTO v_companies
    FROM companies c
    WHERE c.status = 'active';
  ELSE
    -- Fix: Use DISTINCT ON to ensure one company per id when joining with company_users
    SELECT json_agg(
      json_build_object(
        'id', c.id,
        'name', c.name,
        'type', c.type,
        'legal_name', c.legal_name,
        'gstin', c.gstin,
        'logo_url', c.logo_url,
        'theme_color', c.theme_color,
        'secondary_color', c.secondary_color,
        'status', c.status
      )
    )
    INTO v_companies
    FROM (
      SELECT DISTINCT ON (c.id)
        c.id,
        c.name,
        c.type,
        c.legal_name,
        c.gstin,
        c.logo_url,
        c.theme_color,
        c.secondary_color,
        c.status
      FROM companies c
      INNER JOIN company_users cu ON c.id = cu.company_id
      WHERE cu.user_id = p_user_id 
      AND cu.status = 'active'
      AND c.status = 'active'
      ORDER BY c.id, c.name
    ) c;
  END IF;

  -- Build final result
  v_result := json_build_object(
    'is_platform_admin', v_is_platform_admin,
    'primary_company_id', v_primary_company_id,
    'company_users', COALESCE(v_company_users, '[]'::json),
    'companies', COALESCE(v_companies, '[]'::json)
  );

  RETURN v_result;
END;
$$;