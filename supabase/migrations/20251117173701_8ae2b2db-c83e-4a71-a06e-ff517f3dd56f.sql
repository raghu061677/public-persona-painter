-- ============================================
-- CRITICAL SECURITY FIX: Multi-Tenant Isolation
-- ============================================

-- 1. Add company_id to media_assets table
ALTER TABLE media_assets 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Set default company_id for existing records (use first company or create migration data)
UPDATE media_assets 
SET company_id = (SELECT id FROM companies WHERE type = 'media_owner' LIMIT 1)
WHERE company_id IS NULL;

-- Make company_id NOT NULL after backfill
ALTER TABLE media_assets 
ALTER COLUMN company_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_media_assets_company_id ON media_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_company_status ON media_assets(company_id, status);

-- ============================================
-- 2. Add company_id to plans table
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Backfill from campaigns or clients
UPDATE plans 
SET company_id = (
  SELECT c.company_id 
  FROM campaigns c 
  WHERE c.plan_id = plans.id 
  LIMIT 1
)
WHERE company_id IS NULL;

-- If still NULL, use first company
UPDATE plans 
SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE company_id IS NULL;

-- Make company_id NOT NULL
ALTER TABLE plans 
ALTER COLUMN company_id SET NOT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_plans_company_id ON plans(company_id);
CREATE INDEX IF NOT EXISTS idx_plans_company_status ON plans(company_id, status);

-- ============================================
-- 3. Update media_assets RLS Policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Media owners can manage their assets" ON media_assets;
DROP POLICY IF EXISTS "Admins can manage all media assets" ON media_assets;
DROP POLICY IF EXISTS "Users can view available media assets" ON media_assets;
DROP POLICY IF EXISTS "Company users can view their company assets" ON media_assets;
DROP POLICY IF EXISTS "Admins can insert company assets" ON media_assets;
DROP POLICY IF EXISTS "Admins can update company assets" ON media_assets;
DROP POLICY IF EXISTS "Admins can delete company assets" ON media_assets;

-- Enable RLS
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Company users can view their own company's assets
CREATE POLICY "Company users can view their company assets" 
ON media_assets FOR SELECT
USING (
  company_id = get_current_user_company_id() 
  OR is_platform_admin(auth.uid())
  OR (is_public = true) -- Agencies can view public assets
);

-- Admins and operations can insert assets for their company
CREATE POLICY "Admins can insert company assets" 
ON media_assets FOR INSERT
WITH CHECK (
  company_id = get_current_user_company_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
);

-- Admins and operations can update their company assets
CREATE POLICY "Admins can update company assets" 
ON media_assets FOR UPDATE
USING (
  company_id = get_current_user_company_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
);

-- Only admins can delete
CREATE POLICY "Admins can delete company assets" 
ON media_assets FOR DELETE
USING (
  company_id = get_current_user_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- 4. Add RLS to media_photos table
-- ============================================

-- Enable RLS
ALTER TABLE media_photos ENABLE ROW LEVEL SECURITY;

-- Company users can view photos of their company's assets
CREATE POLICY "Company users can view their asset photos" 
ON media_photos FOR SELECT
USING (
  asset_id IN (
    SELECT id FROM media_assets 
    WHERE company_id = get_current_user_company_id()
  )
  OR is_platform_admin(auth.uid())
  OR asset_id IN (
    SELECT id FROM media_assets WHERE is_public = true
  )
);

-- Users can insert photos for their company's assets
CREATE POLICY "Users can insert photos for company assets" 
ON media_photos FOR INSERT
WITH CHECK (
  asset_id IN (
    SELECT id FROM media_assets 
    WHERE company_id = get_current_user_company_id()
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'operations'::app_role)
  )
);

-- Users can update photos for their company's assets
CREATE POLICY "Users can update photos for company assets" 
ON media_photos FOR UPDATE
USING (
  asset_id IN (
    SELECT id FROM media_assets 
    WHERE company_id = get_current_user_company_id()
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'operations'::app_role)
  )
);

-- Admins can delete photos
CREATE POLICY "Admins can delete photos for company assets" 
ON media_photos FOR DELETE
USING (
  asset_id IN (
    SELECT id FROM media_assets 
    WHERE company_id = get_current_user_company_id()
  )
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- 5. Update plans RLS Policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage plans" ON plans;
DROP POLICY IF EXISTS "Authenticated users can view plans" ON plans;
DROP POLICY IF EXISTS "Company users can view their company plans" ON plans;
DROP POLICY IF EXISTS "Admins can insert company plans" ON plans;
DROP POLICY IF EXISTS "Admins can update company plans" ON plans;
DROP POLICY IF EXISTS "Admins can delete company plans" ON plans;

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Company users can view their company plans
CREATE POLICY "Company users can view their company plans" 
ON plans FOR SELECT
USING (
  company_id = get_current_user_company_id() 
  OR is_platform_admin(auth.uid())
);

-- Admins and sales can insert plans for their company
CREATE POLICY "Admins can insert company plans" 
ON plans FOR INSERT
WITH CHECK (
  company_id = get_current_user_company_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role))
);

-- Admins and sales can update their company plans
CREATE POLICY "Admins can update company plans" 
ON plans FOR UPDATE
USING (
  company_id = get_current_user_company_id()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sales'::app_role))
);

-- Only admins can delete
CREATE POLICY "Admins can delete company plans" 
ON plans FOR DELETE
USING (
  company_id = get_current_user_company_id()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- 6. Add performance indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_campaigns_company_status ON campaigns(company_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);

-- ============================================
-- 7. Subscription Limit Enforcement Function
-- ============================================

CREATE OR REPLACE FUNCTION check_subscription_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_subscription RECORD;
  v_current_count integer;
BEGIN
  -- Get company_id from the new record
  v_company_id := NEW.company_id;
  
  -- Skip for platform admins
  IF is_platform_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  
  -- Get active subscription
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE company_id = v_company_id
    AND status = 'active'
    AND end_date >= CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no active subscription, allow only free tier limits
  IF NOT FOUND THEN
    v_subscription.max_assets := 10;
    v_subscription.max_users := 3;
    v_subscription.max_campaigns := 5;
  END IF;
  
  -- Check limits based on table
  IF TG_TABLE_NAME = 'media_assets' AND v_subscription.max_assets IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM media_assets
    WHERE company_id = v_company_id;
    
    IF v_current_count >= v_subscription.max_assets THEN
      RAISE EXCEPTION 'Subscription limit reached: Maximum % assets allowed', v_subscription.max_assets;
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'company_users' AND v_subscription.max_users IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM company_users
    WHERE company_id = v_company_id AND status = 'active';
    
    IF v_current_count >= v_subscription.max_users THEN
      RAISE EXCEPTION 'Subscription limit reached: Maximum % users allowed', v_subscription.max_users;
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'campaigns' AND v_subscription.max_campaigns IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM campaigns
    WHERE company_id = v_company_id AND status IN ('Planned', 'Active');
    
    IF v_current_count >= v_subscription.max_campaigns THEN
      RAISE EXCEPTION 'Subscription limit reached: Maximum % active campaigns allowed', v_subscription.max_campaigns;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- 8. Create triggers for subscription limits
-- ============================================

DROP TRIGGER IF EXISTS enforce_asset_limit ON media_assets;
CREATE TRIGGER enforce_asset_limit
  BEFORE INSERT ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION check_subscription_limits();

DROP TRIGGER IF EXISTS enforce_user_limit ON company_users;
CREATE TRIGGER enforce_user_limit
  BEFORE INSERT ON company_users
  FOR EACH ROW
  EXECUTE FUNCTION check_subscription_limits();

DROP TRIGGER IF EXISTS enforce_campaign_limit ON campaigns;
CREATE TRIGGER enforce_campaign_limit
  BEFORE INSERT ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION check_subscription_limits();

-- ============================================
-- 9. Add audit logging for security events
-- ============================================

CREATE OR REPLACE FUNCTION log_security_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    jsonb_build_object(
      'company_id', COALESCE(NEW.company_id, OLD.company_id),
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add security audit triggers
DROP TRIGGER IF EXISTS audit_company_changes ON companies;
CREATE TRIGGER audit_company_changes
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION log_security_event();

DROP TRIGGER IF EXISTS audit_company_user_changes ON company_users;
CREATE TRIGGER audit_company_user_changes
  AFTER INSERT OR UPDATE OR DELETE ON company_users
  FOR EACH ROW
  EXECUTE FUNCTION log_security_event();