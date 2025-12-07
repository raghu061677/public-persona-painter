-- Complete fix for Media Asset Booking & Release System
-- This ensures proper availability tracking and date-based overlap detection

-- 1) Ensure media_assets has the booking tracking columns
ALTER TABLE media_assets 
  ADD COLUMN IF NOT EXISTS booked_from DATE,
  ADD COLUMN IF NOT EXISTS booked_to DATE,
  ADD COLUMN IF NOT EXISTS current_campaign_id TEXT;

-- 2) Drop existing triggers to recreate them properly
DROP TRIGGER IF EXISTS trg_auto_book_media_assets ON campaign_assets;
DROP TRIGGER IF EXISTS trg_auto_release_media_assets ON campaigns;
DROP TRIGGER IF EXISTS trg_auto_set_campaign_status ON campaigns;

-- 3) Create/replace the auto booking function
CREATE OR REPLACE FUNCTION auto_book_media_assets_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign RECORD;
BEGIN
  -- Get campaign dates
  SELECT start_date, end_date INTO v_campaign
  FROM campaigns
  WHERE id = NEW.campaign_id;
  
  -- Set booking dates on the campaign_asset if not already set
  IF NEW.booking_start_date IS NULL THEN
    NEW.booking_start_date := v_campaign.start_date;
  END IF;
  
  IF NEW.booking_end_date IS NULL THEN
    NEW.booking_end_date := v_campaign.end_date;
  END IF;
  
  -- Update media asset to Booked status if Available
  UPDATE media_assets
  SET 
    status = 'Booked'::media_asset_status,
    booked_from = COALESCE(v_campaign.start_date, NEW.booking_start_date),
    booked_to = COALESCE(v_campaign.end_date, NEW.booking_end_date),
    current_campaign_id = NEW.campaign_id,
    updated_at = now()
  WHERE id = NEW.asset_id
    AND status = 'Available'::media_asset_status;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4) Create the auto release function
CREATE OR REPLACE FUNCTION auto_release_media_assets_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- When campaign transitions to Completed, Cancelled, or Archived
  IF NEW.status IN ('Completed', 'Cancelled', 'Archived') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('Completed', 'Cancelled', 'Archived')) THEN
    
    -- Release assets that are not referenced by other Running/Upcoming campaigns
    UPDATE media_assets ma
    SET 
      status = 'Available'::media_asset_status,
      booked_from = NULL,
      booked_to = NULL,
      current_campaign_id = NULL,
      updated_at = now()
    WHERE ma.id IN (
      SELECT ca.asset_id 
      FROM campaign_assets ca 
      WHERE ca.campaign_id = NEW.id
    )
    AND ma.status = 'Booked'::media_asset_status
    AND (ma.current_campaign_id = NEW.id OR ma.current_campaign_id IS NULL)
    AND NOT EXISTS (
      -- Check no other active campaigns reference this asset with overlapping dates
      SELECT 1 
      FROM campaign_assets ca2
      JOIN campaigns c ON c.id = ca2.campaign_id
      WHERE ca2.asset_id = ma.id
        AND c.id != NEW.id
        AND c.status IN ('Draft', 'Upcoming', 'Running')
        AND c.end_date >= CURRENT_DATE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5) Create auto-set campaign status on insert
CREATE OR REPLACE FUNCTION auto_set_campaign_status_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Automatically set status based on dates on INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.end_date < v_today THEN
      NEW.status := 'Completed'::campaign_status;
    ELSIF NEW.start_date <= v_today AND NEW.end_date >= v_today THEN
      NEW.status := 'Running'::campaign_status;
    ELSIF NEW.start_date > v_today THEN
      NEW.status := 'Upcoming'::campaign_status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6) Recreate triggers
CREATE TRIGGER trg_auto_book_media_assets
  BEFORE INSERT ON campaign_assets
  FOR EACH ROW
  EXECUTE FUNCTION auto_book_media_assets_fn();

CREATE TRIGGER trg_auto_release_media_assets
  AFTER UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION auto_release_media_assets_fn();

CREATE TRIGGER trg_auto_set_campaign_status
  BEFORE INSERT ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_campaign_status_fn();

-- 7) Improve auto_update_campaign_status to also handle asset release
CREATE OR REPLACE FUNCTION auto_update_campaign_status()
RETURNS void AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_campaign RECORD;
BEGIN
  -- Update Draft/Upcoming campaigns to Running if start_date <= today <= end_date
  FOR v_campaign IN 
    SELECT id, status, start_date, end_date 
    FROM campaigns 
    WHERE status IN ('Draft'::campaign_status, 'Upcoming'::campaign_status)
      AND start_date <= v_today
      AND end_date >= v_today
  LOOP
    UPDATE campaigns 
    SET status = 'Running'::campaign_status, updated_at = now()
    WHERE id = v_campaign.id;
    
    -- Log status history
    INSERT INTO campaign_status_history (campaign_id, old_status, new_status, notes)
    VALUES (v_campaign.id, v_campaign.status, 'Running'::campaign_status, 'Auto-updated: campaign is now running');
  END LOOP;
  
  -- Update Draft campaigns to Upcoming if start_date > today
  FOR v_campaign IN 
    SELECT id, status, start_date 
    FROM campaigns 
    WHERE status = 'Draft'::campaign_status
      AND start_date > v_today
  LOOP
    UPDATE campaigns 
    SET status = 'Upcoming'::campaign_status, updated_at = now()
    WHERE id = v_campaign.id;
    
    -- Log status history
    INSERT INTO campaign_status_history (campaign_id, old_status, new_status, notes)
    VALUES (v_campaign.id, v_campaign.status, 'Upcoming'::campaign_status, 'Auto-updated: campaign scheduled for future');
  END LOOP;
  
  -- Update Running/Upcoming campaigns to Completed if end_date < today
  FOR v_campaign IN 
    SELECT id, status, end_date 
    FROM campaigns 
    WHERE status IN ('Running'::campaign_status, 'Upcoming'::campaign_status)
      AND end_date < v_today
  LOOP
    UPDATE campaigns 
    SET status = 'Completed'::campaign_status, updated_at = now()
    WHERE id = v_campaign.id;
    
    -- Log status history
    INSERT INTO campaign_status_history (campaign_id, old_status, new_status, notes)
    VALUES (v_campaign.id, v_campaign.status, 'Completed'::campaign_status, 'Auto-updated: campaign end date passed');
    
    -- The auto_release trigger will handle releasing assets
  END LOOP;
  
  -- Release any assets from completed/cancelled/archived campaigns that may have been missed
  UPDATE media_assets ma
  SET 
    status = 'Available'::media_asset_status,
    booked_from = NULL,
    booked_to = NULL,
    current_campaign_id = NULL,
    updated_at = now()
  WHERE ma.status = 'Booked'::media_asset_status
    AND ma.current_campaign_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM campaigns c
      WHERE c.id = ma.current_campaign_id
        AND c.status IN ('Draft', 'Upcoming', 'Running')
        AND c.end_date >= v_today
    );
    
  -- Also release assets where booked_to date has passed and no active campaign
  UPDATE media_assets ma
  SET 
    status = 'Available'::media_asset_status,
    booked_from = NULL,
    booked_to = NULL,
    current_campaign_id = NULL,
    updated_at = now()
  WHERE ma.status = 'Booked'::media_asset_status
    AND ma.booked_to IS NOT NULL
    AND ma.booked_to < v_today
    AND NOT EXISTS (
      SELECT 1 
      FROM campaign_assets ca
      JOIN campaigns c ON c.id = ca.campaign_id
      WHERE ca.asset_id = ma.id
        AND c.status IN ('Draft', 'Upcoming', 'Running')
        AND c.end_date >= v_today
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8) Create or replace the finance eligible campaigns view
DROP VIEW IF EXISTS finance_eligible_campaigns;
CREATE VIEW finance_eligible_campaigns AS
SELECT 
  c.id,
  c.campaign_name,
  c.client_id,
  c.client_name,
  c.status,
  c.start_date,
  c.end_date,
  c.total_amount,
  c.gst_amount,
  c.grand_total,
  c.company_id,
  c.created_at,
  c.plan_id,
  cl.email as client_email,
  cl.phone as client_phone,
  cl.gst_number as client_gst
FROM campaigns c
LEFT JOIN clients cl ON cl.id = c.client_id
WHERE c.status IN ('Running', 'Completed');

-- 9) Run the status update now to sync current state
SELECT auto_update_campaign_status();