-- Ensure raghu@go-ads.in is set up as platform admin
DO $$
DECLARE
  v_user_id uuid;
  v_platform_company_id uuid;
BEGIN
  -- Get raghu's user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'raghu@go-ads.in';
  
  IF v_user_id IS NOT NULL THEN
    -- Get or create platform admin company
    SELECT id INTO v_platform_company_id FROM companies WHERE type = 'platform_admin' LIMIT 1;
    
    IF v_platform_company_id IS NULL THEN
      INSERT INTO companies (name, legal_name, type, status, created_by)
      VALUES ('Go-Ads Platform', 'Go-Ads Platform Administration', 'platform_admin', 'active', v_user_id)
      RETURNING id INTO v_platform_company_id;
    END IF;
    
    -- Ensure raghu is associated with platform admin company
    INSERT INTO company_users (company_id, user_id, role, is_primary, status)
    VALUES (v_platform_company_id, v_user_id, 'admin', true, 'active')
    ON CONFLICT (company_id, user_id) DO UPDATE SET role = 'admin', status = 'active';
  END IF;
END $$;

-- Update RLS policies to allow platform admins global access

-- Plans table
DROP POLICY IF EXISTS "Users can view plans from their company" ON plans;
DROP POLICY IF EXISTS "Users can create plans for their company" ON plans;
DROP POLICY IF EXISTS "Users can update plans from their company" ON plans;
DROP POLICY IF EXISTS "Users can delete plans from their company" ON plans;

CREATE POLICY "Users can view plans" ON plans FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can create plans" ON plans FOR INSERT
  WITH CHECK (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can update plans" ON plans FOR UPDATE
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can delete plans" ON plans FOR DELETE
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

-- Campaigns table
DROP POLICY IF EXISTS "Users can view campaigns from their company" ON campaigns;
DROP POLICY IF EXISTS "Users can create campaigns for their company" ON campaigns;
DROP POLICY IF EXISTS "Users can update campaigns from their company" ON campaigns;
DROP POLICY IF EXISTS "Users can delete campaigns from their company" ON campaigns;

CREATE POLICY "Users can view campaigns" ON campaigns FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can create campaigns" ON campaigns FOR INSERT
  WITH CHECK (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can update campaigns" ON campaigns FOR UPDATE
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can delete campaigns" ON campaigns FOR DELETE
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

-- Clients table
DROP POLICY IF EXISTS "Users can view clients from their company" ON clients;
DROP POLICY IF EXISTS "Users can create clients for their company" ON clients;
DROP POLICY IF EXISTS "Users can update clients from their company" ON clients;
DROP POLICY IF EXISTS "Users can delete clients from their company" ON clients;

CREATE POLICY "Users can view clients" ON clients FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can create clients" ON clients FOR INSERT
  WITH CHECK (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can update clients" ON clients FOR UPDATE
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can delete clients" ON clients FOR DELETE
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

-- Media assets table
DROP POLICY IF EXISTS "Users can view media assets from their company" ON media_assets;
DROP POLICY IF EXISTS "Users can create media assets for their company" ON media_assets;
DROP POLICY IF EXISTS "Users can update media assets from their company" ON media_assets;
DROP POLICY IF EXISTS "Users can delete media assets from their company" ON media_assets;

CREATE POLICY "Users can view media assets" ON media_assets FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can create media assets" ON media_assets FOR INSERT
  WITH CHECK (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can update media assets" ON media_assets FOR UPDATE
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can delete media assets" ON media_assets FOR DELETE
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

-- Invoices table
DROP POLICY IF EXISTS "Users can view invoices from their company" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices for their company" ON invoices;
DROP POLICY IF EXISTS "Users can update invoices from their company" ON invoices;
DROP POLICY IF EXISTS "Users can delete invoices from their company" ON invoices;

CREATE POLICY "Users can view invoices" ON invoices FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can create invoices" ON invoices FOR INSERT
  WITH CHECK (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can update invoices" ON invoices FOR UPDATE
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can delete invoices" ON invoices FOR DELETE
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

-- Expenses table
DROP POLICY IF EXISTS "Users can view expenses from their company" ON expenses;
DROP POLICY IF EXISTS "Users can create expenses for their company" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses from their company" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses from their company" ON expenses;

CREATE POLICY "Users can view expenses" ON expenses FOR SELECT
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can create expenses" ON expenses FOR INSERT
  WITH CHECK (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can update expenses" ON expenses FOR UPDATE
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can delete expenses" ON expenses FOR DELETE
  USING (
    is_platform_admin(auth.uid()) OR
    company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active')
  );