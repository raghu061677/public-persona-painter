-- =========================================================
-- FIX CAMPAIGN STATUS AND MEDIA ASSET BOOKING LIFECYCLE
-- =========================================================

-- Drop existing problematic triggers and functions
DROP TRIGGER IF EXISTS auto_book_media_assets ON campaign_assets;
DROP TRIGGER IF EXISTS auto_release_on_campaign_complete ON campaigns;
DROP FUNCTION IF EXISTS auto_book_media_assets() CASCADE;
DROP FUNCTION IF EXISTS auto_release_media_assets() CASCADE;

-- =========================================================
-- PART 1: AUTO BOOK MEDIA ASSETS ON CAMPAIGN_ASSETS INSERT
-- =========================================================

CREATE OR REPLACE FUNCTION public.auto_book_media_assets_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    booked_from = v_campaign.start_date,
    booked_to = v_campaign.end_date,
    current_campaign_id = NEW.campaign_id,
    updated_at = now()
  WHERE id = NEW.asset_id
    AND status = 'Available'::media_asset_status;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-booking
CREATE TRIGGER trg_auto_book_media_assets
BEFORE INSERT ON campaign_assets
FOR EACH ROW
EXECUTE FUNCTION auto_book_media_assets_fn();

-- =========================================================
-- PART 2: AUTO RELEASE MEDIA ASSETS WHEN CAMPAIGN COMPLETES
-- =========================================================

CREATE OR REPLACE FUNCTION public.auto_release_media_assets_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    AND ma.current_campaign_id = NEW.id
    AND NOT EXISTS (
      -- Check no other active campaigns reference this asset
      SELECT 1 
      FROM campaign_assets ca2
      JOIN campaigns c ON c.id = ca2.campaign_id
      WHERE ca2.asset_id = ma.id
        AND c.id != NEW.id
        AND c.status IN ('Draft', 'Upcoming', 'Running')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-release
DROP TRIGGER IF EXISTS trg_auto_release_media_assets ON campaigns;
CREATE TRIGGER trg_auto_release_media_assets
AFTER UPDATE OF status ON campaigns
FOR EACH ROW
EXECUTE FUNCTION auto_release_media_assets_fn();

-- =========================================================
-- PART 3: FIX AUTO UPDATE CAMPAIGN STATUS FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION public.auto_update_campaign_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    
    -- Note: The auto_release trigger will handle releasing assets
  END LOOP;
  
  -- Also release any assets from completed campaigns that may have been missed
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
    );
END;
$$;

-- =========================================================
-- PART 4: ENSURE CAMPAIGN STATUS TRIGGER ON INSERT
-- =========================================================

CREATE OR REPLACE FUNCTION public.auto_set_campaign_status_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Only modify if status is Draft or NULL (let other statuses pass through)
  IF NEW.status IS NULL OR NEW.status = 'Draft'::campaign_status THEN
    IF NEW.start_date <= v_today AND NEW.end_date >= v_today THEN
      NEW.status := 'Running'::campaign_status;
    ELSIF NEW.start_date > v_today THEN
      NEW.status := 'Upcoming'::campaign_status;
    ELSIF NEW.end_date < v_today THEN
      NEW.status := 'Completed'::campaign_status;
    ELSE
      NEW.status := 'Draft'::campaign_status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for campaign insert status auto-set
DROP TRIGGER IF EXISTS trg_auto_set_campaign_status ON campaigns;
CREATE TRIGGER trg_auto_set_campaign_status
BEFORE INSERT ON campaigns
FOR EACH ROW
EXECUTE FUNCTION auto_set_campaign_status_on_insert();

-- =========================================================
-- PART 5: VIEW FOR FINANCE MODULE (Running + Completed)
-- =========================================================

CREATE OR REPLACE VIEW public.finance_eligible_campaigns AS
SELECT 
  c.*,
  cl.name as client_display_name,
  cl.gst_number as client_gst
FROM campaigns c
LEFT JOIN clients cl ON cl.id = c.client_id
WHERE c.status IN ('Running', 'Completed');

-- Grant access to the view
GRANT SELECT ON public.finance_eligible_campaigns TO authenticated;

-- =========================================================
-- PART 6: ADD MISSING COLUMNS IF NOT EXISTS
-- =========================================================

-- Ensure booked_from and booked_to columns exist on media_assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'media_assets' 
    AND column_name = 'booked_from'
  ) THEN
    ALTER TABLE media_assets ADD COLUMN booked_from DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'media_assets' 
    AND column_name = 'booked_to'
  ) THEN
    ALTER TABLE media_assets ADD COLUMN booked_to DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'media_assets' 
    AND column_name = 'current_campaign_id'
  ) THEN
    ALTER TABLE media_assets ADD COLUMN current_campaign_id TEXT;
  END IF;
END $$;