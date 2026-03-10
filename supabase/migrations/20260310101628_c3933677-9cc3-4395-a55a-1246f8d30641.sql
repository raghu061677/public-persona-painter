
-- Remove old overly-permissive policies that bypass ownership checks
-- These use OR semantics with the new policies, creating loopholes

-- Campaigns: old policy allows any sales/ops user to update any campaign
DROP POLICY IF EXISTS "Admins can update company campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can delete company campaigns" ON campaigns;

-- Campaign_assets: old policies that don't enforce campaign ownership
DROP POLICY IF EXISTS "Admins can update campaign assets" ON campaign_assets;
DROP POLICY IF EXISTS "Admins can delete campaign assets" ON campaign_assets;
DROP POLICY IF EXISTS "Admins can insert campaign assets" ON campaign_assets;

-- Plan_items: old policies that don't enforce plan ownership for sales
DROP POLICY IF EXISTS "Authorized users can update plan items" ON plan_items;
DROP POLICY IF EXISTS "Authorized users can delete plan items" ON plan_items;
DROP POLICY IF EXISTS "Authorized users can insert plan items" ON plan_items;
