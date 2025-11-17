-- Phase 1: Foundation Layer - Multi-Tenant SaaS Infrastructure
-- Zero impact on existing tables and data

-- ============================================================================
-- 1. ENUMS FOR SUBSCRIPTIONS & TRANSACTIONS
-- ============================================================================

CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'trialing');
CREATE TYPE transaction_type AS ENUM ('subscription', 'portal_fee', 'commission', 'refund', 'adjustment');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- ============================================================================
-- 2. SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Subscription details
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'trialing',
  
  -- Billing cycle
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  
  -- Pricing
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  
  -- Payment gateway
  razorpay_subscription_id TEXT,
  razorpay_plan_id TEXT,
  
  -- Limits (NULL = unlimited)
  max_assets INTEGER,
  max_users INTEGER,
  max_campaigns INTEGER,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Indexes
CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view their subscription"
  ON subscriptions FOR SELECT
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Platform admins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- ============================================================================
-- 3. TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Transaction details
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  
  -- Amounts
  amount NUMERIC(10,2) NOT NULL,
  gst_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  
  -- Related entities (for commissions)
  booking_id UUID, -- References booking_requests
  plan_id TEXT, -- References plans
  
  -- Payment details
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  payment_method TEXT,
  
  -- Dates
  transaction_date TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Additional info
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_subscription ON transactions(subscription_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- RLS Policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their transactions"
  ON transactions FOR SELECT
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Platform admins can view all transactions"
  ON transactions FOR SELECT
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage transactions"
  ON transactions FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "System can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 4. SUBSCRIPTION USAGE TABLE
-- ============================================================================

CREATE TABLE public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  
  -- Usage metrics
  assets_count INTEGER DEFAULT 0,
  users_count INTEGER DEFAULT 0,
  campaigns_count INTEGER DEFAULT 0,
  storage_used_mb NUMERIC(10,2) DEFAULT 0,
  
  -- Calculated at
  calculated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_subscription_usage_company ON subscription_usage(company_id);
CREATE INDEX idx_subscription_usage_subscription ON subscription_usage(subscription_id);
CREATE INDEX idx_subscription_usage_date ON subscription_usage(calculated_at);

-- RLS Policies
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their usage"
  ON subscription_usage FOR SELECT
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Platform admins can view all usage"
  ON subscription_usage FOR SELECT
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "System can insert usage records"
  ON subscription_usage FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 5. COMMISSION RULES TABLE
-- ============================================================================

CREATE TABLE public.commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule details
  rule_name TEXT NOT NULL,
  description TEXT,
  
  -- Commission calculation
  commission_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed
  commission_value NUMERIC(10,4) NOT NULL, -- e.g., 2.0 for 2%, or 500 for ₹500
  
  -- Applicability
  min_booking_amount NUMERIC(10,2),
  max_booking_amount NUMERIC(10,2),
  applies_to_company_type TEXT, -- 'media_owner', 'agency', or NULL for all
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_commission_rules_active ON commission_rules(is_active);
CREATE INDEX idx_commission_rules_dates ON commission_rules(effective_from, effective_until);

-- RLS Policies
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active commission rules"
  ON commission_rules FOR SELECT
  USING (is_active = true);

CREATE POLICY "Platform admins can manage commission rules"
  ON commission_rules FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate current subscription usage
CREATE OR REPLACE FUNCTION calculate_subscription_usage(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage JSONB;
  v_assets_count INTEGER;
  v_users_count INTEGER;
  v_campaigns_count INTEGER;
BEGIN
  -- Count active assets
  SELECT COUNT(*) INTO v_assets_count
  FROM media_assets
  WHERE company_id = p_company_id;
  
  -- Count active users
  SELECT COUNT(*) INTO v_users_count
  FROM company_users
  WHERE company_id = p_company_id AND status = 'active';
  
  -- Count active campaigns
  SELECT COUNT(*) INTO v_campaigns_count
  FROM campaigns
  WHERE company_id = p_company_id 
    AND status IN ('Planned', 'Active');
  
  -- Build result
  v_usage := jsonb_build_object(
    'assets_count', v_assets_count,
    'users_count', v_users_count,
    'campaigns_count', v_campaigns_count,
    'calculated_at', now()
  );
  
  RETURN v_usage;
END;
$$;

-- Function to get active subscription for a company
CREATE OR REPLACE FUNCTION get_active_subscription(p_company_id UUID)
RETURNS TABLE(
  id UUID,
  tier subscription_tier,
  status subscription_status,
  end_date DATE,
  max_assets INTEGER,
  max_users INTEGER,
  max_campaigns INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.tier,
    s.status,
    s.end_date,
    s.max_assets,
    s.max_users,
    s.max_campaigns
  FROM subscriptions s
  WHERE s.company_id = p_company_id
    AND s.status = 'active'
    AND s.end_date >= CURRENT_DATE
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

-- ============================================================================
-- 7. DEFAULT DATA
-- ============================================================================

-- Insert default commission rule (2% marketplace fee)
INSERT INTO commission_rules (
  rule_name,
  description,
  commission_type,
  commission_value,
  is_active,
  effective_from
) VALUES (
  'Default Marketplace Commission',
  'Standard 2% commission on all bookings through Go-Ads marketplace',
  'percentage',
  2.0,
  true,
  CURRENT_DATE
);

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_rules_updated_at
  BEFORE UPDATE ON commission_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE subscriptions IS 'Tracks SaaS subscription plans for each company';
COMMENT ON TABLE transactions IS 'Records all financial transactions including subscriptions, commissions, and fees';
COMMENT ON TABLE subscription_usage IS 'Historical snapshot of subscription usage metrics';
COMMENT ON TABLE commission_rules IS 'Defines commission structure for marketplace bookings';

COMMENT ON FUNCTION calculate_subscription_usage IS 'Calculates current usage metrics for a company subscription';
COMMENT ON FUNCTION get_active_subscription IS 'Returns the active subscription details for a company';