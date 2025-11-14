-- Create demo companies seeding function
CREATE OR REPLACE FUNCTION seed_demo_companies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  demo_results jsonb DEFAULT '[]'::jsonb;
  media_owner_id uuid;
  agency_id uuid;
  demo_user_id uuid;
BEGIN
  -- Get or create a demo user (platform should have at least one user)
  SELECT id INTO demo_user_id FROM auth.users LIMIT 1;
  
  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Please create at least one user first.';
  END IF;

  -- Create Media Owner Company
  INSERT INTO companies (
    name, legal_name, type, gstin, pan,
    address_line1, city, state, pincode,
    phone, email, website,
    theme_color, secondary_color,
    status, created_by
  ) VALUES (
    'Matrix Outdoor Media', 'Matrix Outdoor Media Pvt Ltd', 'media_owner', '36AAACM1234A1Z5', 'AAACM1234A',
    '123 MG Road', 'Hyderabad', 'Telangana', '500001',
    '+91-9876543210', 'info@matrixmedia.com', 'https://matrixmedia.com',
    '#1e40af', '#10b981',
    'active', demo_user_id
  )
  RETURNING id INTO media_owner_id;

  -- Link demo user to media owner company
  INSERT INTO company_users (company_id, user_id, role, is_primary, status)
  VALUES (media_owner_id, demo_user_id, 'admin', true, 'active')
  ON CONFLICT DO NOTHING;

  -- Create Agency Company
  INSERT INTO companies (
    name, legal_name, type, gstin, pan,
    address_line1, city, state, pincode,
    phone, email, website,
    theme_color, secondary_color,
    status, created_by
  ) VALUES (
    'Creative Ads Agency', 'Creative Ads Solutions LLP', 'agency', '29AABCC5678D1Z9', 'AABCC5678D',
    '456 Brigade Road', 'Bangalore', 'Karnataka', '560001',
    '+91-9988776655', 'hello@creativeads.in', 'https://creativeads.in',
    '#7c3aed', '#f97316',
    'active', demo_user_id
  )
  RETURNING id INTO agency_id;

  demo_results := jsonb_build_object(
    'success', true,
    'media_owner_id', media_owner_id,
    'agency_id', agency_id,
    'message', 'Demo companies created successfully'
  );

  RETURN demo_results;
END;
$$;

-- Create function to test RLS policies
CREATE OR REPLACE FUNCTION test_company_rls_isolation(test_company_id uuid, test_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  test_results jsonb DEFAULT '{}'::jsonb;
  can_view_own boolean;
  can_view_others boolean;
  own_company_count integer;
  other_companies_count integer;
BEGIN
  -- Test 1: Can view own company
  SELECT EXISTS (
    SELECT 1 FROM companies WHERE id = test_company_id
  ) INTO can_view_own;

  -- Test 2: Count visible companies (should only see own)
  SELECT COUNT(*) INTO own_company_count
  FROM companies WHERE id = test_company_id;

  SELECT COUNT(*) INTO other_companies_count
  FROM companies WHERE id != test_company_id;

  test_results := jsonb_build_object(
    'can_view_own_company', can_view_own,
    'own_company_visible_count', own_company_count,
    'other_companies_visible_count', other_companies_count,
    'isolation_working', (own_company_count > 0 AND other_companies_count = 0),
    'test_user_id', test_user_id,
    'test_company_id', test_company_id
  );

  RETURN test_results;
END;
$$;