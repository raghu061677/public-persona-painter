-- Update or insert subscription for Matrix Network Solutions
-- First, deactivate any existing subscriptions
UPDATE public.company_subscriptions
SET status = 'expired', updated_at = now()
WHERE company_id IN (
  SELECT id FROM companies 
  WHERE name = 'Matrix Network Solutions'
    OR legal_name ILIKE '%Matrix%Network%'
    OR legal_name ILIKE '%Matrix%Outdoor%'
    OR id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Insert new enterprise subscription with high limits
INSERT INTO public.company_subscriptions (
  company_id,
  tier,
  status,
  start_date,
  end_date,
  billing_cycle,
  amount,
  currency,
  user_limit,
  asset_limit,
  campaign_limit,
  modules,
  auto_renew
)
SELECT 
  id as company_id,
  'enterprise' as tier,
  'active' as status,
  CURRENT_DATE as start_date,
  CURRENT_DATE + INTERVAL '10 years' as end_date,
  'annual' as billing_cycle,
  0 as amount,
  'INR' as currency,
  1000 as user_limit,
  10000 as asset_limit,
  5000 as campaign_limit,
  '["dashboard", "media_assets", "clients", "campaigns", "reports", "finance", "marketplace", "analytics"]'::jsonb as modules,
  true as auto_renew
FROM companies
WHERE name = 'Matrix Network Solutions'
  OR legal_name ILIKE '%Matrix%Network%'
  OR legal_name ILIKE '%Matrix%Outdoor%'
  OR id = '00000000-0000-0000-0000-000000000001'::uuid;