-- Update check_subscription_limits function to use valid campaign_status enum values
CREATE OR REPLACE FUNCTION check_subscription_limits()
RETURNS TRIGGER AS $$
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
  
  -- Get active subscription from company_subscriptions
  SELECT * INTO v_subscription
  FROM company_subscriptions
  WHERE company_id = v_company_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no active subscription, allow only free tier limits
  IF NOT FOUND THEN
    v_subscription.asset_limit := 10;
    v_subscription.user_limit := 3;
    v_subscription.campaign_limit := 5;
  END IF;
  
  -- Check limits based on table
  IF TG_TABLE_NAME = 'media_assets' AND v_subscription.asset_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM media_assets
    WHERE company_id = v_company_id;
    
    IF v_current_count >= v_subscription.asset_limit THEN
      RAISE EXCEPTION 'Subscription limit reached: Maximum % assets allowed', v_subscription.asset_limit;
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'company_users' AND v_subscription.user_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM company_users
    WHERE company_id = v_company_id AND status = 'active';
    
    IF v_current_count >= v_subscription.user_limit THEN
      RAISE EXCEPTION 'Subscription limit reached: Maximum % users allowed', v_subscription.user_limit;
    END IF;
  END IF;
  
  -- Fixed: Use valid campaign_status enum values (Planned, InProgress) instead of 'Active'
  IF TG_TABLE_NAME = 'campaigns' AND v_subscription.campaign_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM campaigns
    WHERE company_id = v_company_id 
    AND status IN ('Planned', 'InProgress', 'Assigned');
    
    IF v_current_count >= v_subscription.campaign_limit THEN
      RAISE EXCEPTION 'Subscription limit reached: Maximum % active campaigns allowed', v_subscription.campaign_limit;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable the trigger now that the function is fixed
ALTER TABLE campaigns ENABLE TRIGGER enforce_campaign_limit;