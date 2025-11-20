-- ========================================
-- Multi-Tenant SaaS Platform Enhancement
-- ========================================

-- 1. Create company_subscriptions table for subscription management
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'professional', 'enterprise')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
  user_limit integer NOT NULL DEFAULT 3,
  asset_limit integer NULL, -- NULL means unlimited
  campaign_limit integer NULL,
  modules jsonb NOT NULL DEFAULT '["dashboard", "media_assets", "clients"]'::jsonb,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
  auto_renew boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(company_id, start_date)
);

-- 2. Create company_code_settings table for customizable code prefixes
CREATE TABLE IF NOT EXISTS public.company_code_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  asset_code_prefix text NULL,
  plan_code_prefix text NULL,
  campaign_code_prefix text NULL,
  client_code_prefix text NULL,
  invoice_code_prefix text NULL,
  estimation_code_prefix text NULL,
  expense_code_prefix text NULL,
  use_custom_asset_codes boolean DEFAULT false,
  use_custom_plan_codes boolean DEFAULT false,
  use_custom_campaign_codes boolean DEFAULT false,
  use_custom_client_codes boolean DEFAULT false,
  use_custom_invoice_codes boolean DEFAULT false,
  use_custom_estimation_codes boolean DEFAULT false,
  use_custom_expense_codes boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create company_counters table for per-company sequence management
CREATE TABLE IF NOT EXISTS public.company_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  counter_type text NOT NULL, -- 'asset', 'plan', 'campaign', 'client', 'invoice', etc.
  period text NOT NULL, -- 'YYYY-MM' or 'YYYY' or 'FY-YYYY-YY'
  current_value integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, counter_type, period)
);

-- 4. Enable RLS on new tables
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_code_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_counters ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for company_subscriptions
CREATE POLICY "Company users can view their subscription"
  ON public.company_subscriptions FOR SELECT
  USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage all subscriptions"
  ON public.company_subscriptions FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- 6. RLS Policies for company_code_settings
CREATE POLICY "Company admins can view their code settings"
  ON public.company_code_settings FOR SELECT
  USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

CREATE POLICY "Company admins can update their code settings"
  ON public.company_code_settings FOR UPDATE
  USING (company_id = get_current_user_company_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (company_id = get_current_user_company_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert code settings"
  ON public.company_code_settings FOR INSERT
  WITH CHECK (true);

-- 7. RLS Policies for company_counters
CREATE POLICY "Company users can view their counters"
  ON public.company_counters FOR SELECT
  USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

CREATE POLICY "System can manage counters"
  ON public.company_counters FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. Create function to check subscription limits
CREATE OR REPLACE FUNCTION public.check_subscription_user_limit(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_active_users integer;
BEGIN
  -- Get active subscription
  SELECT * INTO v_subscription
  FROM company_subscriptions
  WHERE company_id = p_company_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no subscription, use default free tier limit (3 users)
  IF NOT FOUND THEN
    v_subscription.user_limit := 3;
  END IF;
  
  -- Count active users
  SELECT COUNT(*) INTO v_active_users
  FROM company_users
  WHERE company_id = p_company_id
    AND status = 'active';
  
  -- Return true if under limit
  RETURN v_active_users < v_subscription.user_limit;
END;
$$;

-- 9. Create function to get company's active modules
CREATE OR REPLACE FUNCTION public.get_company_active_modules(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_modules jsonb;
BEGIN
  SELECT modules INTO v_modules
  FROM company_subscriptions
  WHERE company_id = p_company_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Return default modules if no subscription
  RETURN COALESCE(v_modules, '["dashboard", "media_assets", "clients"]'::jsonb);
END;
$$;

-- 10. Create function to get next counter value for company
CREATE OR REPLACE FUNCTION public.get_company_counter(
  p_company_id uuid,
  p_counter_type text,
  p_period text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_value integer;
BEGIN
  INSERT INTO public.company_counters (company_id, counter_type, period, current_value)
  VALUES (p_company_id, p_counter_type, p_period, 1)
  ON CONFLICT (company_id, counter_type, period)
  DO UPDATE SET 
    current_value = company_counters.current_value + 1,
    updated_at = now()
  RETURNING current_value INTO v_next_value;
  
  RETURN v_next_value;
END;
$$;

-- 11. Insert default subscriptions for existing companies
INSERT INTO public.company_subscriptions (company_id, tier, status, user_limit, modules)
SELECT 
  id,
  'free',
  'active',
  3,
  '["dashboard", "media_assets", "clients", "plans", "campaigns", "operations", "finance", "reports"]'::jsonb
FROM public.companies
WHERE type != 'platform_admin'
ON CONFLICT (company_id, start_date) DO NOTHING;

-- 12. Insert default code settings for existing companies
INSERT INTO public.company_code_settings (company_id)
SELECT id FROM public.companies
ON CONFLICT (company_id) DO NOTHING;

-- 13. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company_id ON public.company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status ON public.company_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_company_code_settings_company_id ON public.company_code_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_company_counters_lookup ON public.company_counters(company_id, counter_type, period);

-- 14. Add trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_company_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_company_subscriptions_updated_at
  BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_subscriptions_updated_at();

CREATE TRIGGER trigger_company_code_settings_updated_at
  BEFORE UPDATE ON public.company_code_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_subscriptions_updated_at();

CREATE TRIGGER trigger_company_counters_updated_at
  BEFORE UPDATE ON public.company_counters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_subscriptions_updated_at();