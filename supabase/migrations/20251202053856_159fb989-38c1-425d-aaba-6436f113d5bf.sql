-- Drop existing function if it exists
DROP FUNCTION IF EXISTS auto_update_campaign_status();

-- Create SQL functions for campaign status updates with correct enum values
CREATE OR REPLACE FUNCTION update_running_campaigns(p_today date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE campaigns
  SET status = 'Running'::campaign_status
  WHERE start_date::date <= p_today
    AND end_date::date >= p_today
    AND status IN ('Draft'::campaign_status, 'Upcoming'::campaign_status);
$$;

CREATE OR REPLACE FUNCTION update_upcoming_campaigns(p_today date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE campaigns
  SET status = 'Upcoming'::campaign_status
  WHERE start_date::date > p_today
    AND status = 'Draft'::campaign_status;
$$;

CREATE OR REPLACE FUNCTION update_completed_campaigns(p_today date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE campaigns
  SET status = 'Completed'::campaign_status
  WHERE end_date::date < p_today
    AND status IN ('Running'::campaign_status, 'Upcoming'::campaign_status);
$$;

-- Create main auto-update function that calls all three
CREATE OR REPLACE FUNCTION auto_update_campaign_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
BEGIN
  v_today := CURRENT_DATE;
  
  -- Update campaigns to Upcoming status
  PERFORM update_upcoming_campaigns(v_today);
  
  -- Update campaigns to Running status
  PERFORM update_running_campaigns(v_today);
  
  -- Update campaigns to Completed status
  PERFORM update_completed_campaigns(v_today);
  
  -- Update media assets to Available when campaigns end
  UPDATE media_assets ma
  SET status = 'Available'::media_asset_status
  WHERE ma.status = 'Booked'::media_asset_status
  AND NOT EXISTS (
    SELECT 1 FROM campaign_assets ca
    JOIN campaigns c ON ca.campaign_id = c.id
    WHERE ca.asset_id = ma.id
    AND c.end_date >= v_today
    AND c.status IN ('Running'::campaign_status, 'Upcoming'::campaign_status)
  );
END;
$$;