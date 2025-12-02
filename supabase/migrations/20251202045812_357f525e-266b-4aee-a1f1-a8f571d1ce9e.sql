-- =====================================================
-- PHASE 2: Migrate existing data to new enum values
-- =====================================================

-- Migrate campaigns to new status values
UPDATE campaigns SET status = 'Draft'::campaign_status WHERE status = 'Planned'::campaign_status;
UPDATE campaigns SET status = 'Running'::campaign_status WHERE status IN ('InProgress'::campaign_status, 'Assigned'::campaign_status);
UPDATE campaigns SET status = 'Completed'::campaign_status WHERE status IN ('Verified'::campaign_status, 'PhotoUploaded'::campaign_status);

-- Migrate campaign_assets to new status values  
UPDATE campaign_assets SET status = 'In Progress'::asset_installation_status WHERE status = 'Mounted'::asset_installation_status;
UPDATE campaign_assets SET status = 'Completed'::asset_installation_status WHERE status = 'Verified'::asset_installation_status;
UPDATE campaign_assets SET status = 'QA Pending'::asset_installation_status WHERE status = 'PhotoUploaded'::asset_installation_status;

-- Migrate media_assets to new status values
UPDATE media_assets SET status = 'Under Maintenance'::media_asset_status WHERE status = 'Maintenance'::media_asset_status;

-- =====================================================
-- PHASE 3: Update defaults
-- =====================================================

ALTER TABLE campaigns ALTER COLUMN status SET DEFAULT 'Draft'::campaign_status;
ALTER TABLE campaign_assets ALTER COLUMN status SET DEFAULT 'Pending'::asset_installation_status;

-- =====================================================
-- PHASE 4: Add booking period tracking
-- =====================================================

ALTER TABLE campaign_assets
ADD COLUMN IF NOT EXISTS booking_start_date DATE,
ADD COLUMN IF NOT EXISTS booking_end_date DATE;

-- Populate booking dates from campaign dates
UPDATE campaign_assets ca
SET 
  booking_start_date = c.start_date,
  booking_end_date = c.end_date
FROM campaigns c
WHERE ca.campaign_id = c.id
AND ca.booking_start_date IS NULL;

-- =====================================================
-- PHASE 5: Auto-status update function
-- =====================================================

CREATE OR REPLACE FUNCTION auto_update_campaign_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Move Draft -> Upcoming (if start_date is in future, within 7 days)
  UPDATE campaigns
  SET status = 'Upcoming'::campaign_status
  WHERE status = 'Draft'::campaign_status
  AND start_date > CURRENT_DATE
  AND start_date <= CURRENT_DATE + INTERVAL '7 days';

  -- Move Upcoming/Draft -> Running (if start_date is today or past and end_date is future)
  UPDATE campaigns
  SET status = 'Running'::campaign_status
  WHERE status IN ('Upcoming'::campaign_status, 'Draft'::campaign_status)
  AND start_date <= CURRENT_DATE
  AND end_date >= CURRENT_DATE;

  -- Move Running -> Completed (if end_date is past and all assets completed)
  UPDATE campaigns c
  SET status = 'Completed'::campaign_status
  WHERE c.status = 'Running'::campaign_status
  AND c.end_date < CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM campaign_assets ca
    WHERE ca.campaign_id = c.id
    AND ca.status NOT IN ('Completed'::asset_installation_status, 'Failed'::asset_installation_status)
  );

  -- Update media assets to Available when campaign ends
  UPDATE media_assets ma
  SET status = 'Available'::media_asset_status
  WHERE ma.status = 'Booked'::media_asset_status
  AND NOT EXISTS (
    SELECT 1 FROM campaign_assets ca
    JOIN campaigns c ON ca.campaign_id = c.id
    WHERE ca.asset_id = ma.id
    AND c.end_date >= CURRENT_DATE
    AND c.status IN ('Running'::campaign_status, 'Upcoming'::campaign_status)
  );
END;
$$;

COMMENT ON FUNCTION auto_update_campaign_status IS 'Automatically updates campaign and media asset statuses based on dates and completion';

-- =====================================================
-- PHASE 6: Trigger for campaign status on insert/update
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_campaign_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Auto-update status based on dates
  IF NEW.start_date > CURRENT_DATE AND NEW.status = 'Draft'::campaign_status THEN
    NEW.status := 'Upcoming'::campaign_status;
  ELSIF NEW.start_date <= CURRENT_DATE AND NEW.end_date >= CURRENT_DATE 
    AND NEW.status IN ('Draft'::campaign_status, 'Upcoming'::campaign_status) THEN
    NEW.status := 'Running'::campaign_status;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_campaign_status_on_insert ON campaigns;
CREATE TRIGGER auto_campaign_status_on_insert
BEFORE INSERT ON campaigns
FOR EACH ROW
EXECUTE FUNCTION trigger_campaign_status_update();

DROP TRIGGER IF EXISTS auto_campaign_status_on_update ON campaigns;
CREATE TRIGGER auto_campaign_status_on_update
BEFORE UPDATE ON campaigns
FOR EACH ROW
WHEN (OLD.start_date IS DISTINCT FROM NEW.start_date OR OLD.end_date IS DISTINCT FROM NEW.end_date)
EXECUTE FUNCTION trigger_campaign_status_update();

-- =====================================================
-- PHASE 7: Asset booking automation
-- =====================================================

CREATE OR REPLACE FUNCTION auto_book_media_assets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Book media assets when campaign assets are added
  UPDATE media_assets
  SET status = 'Booked'::media_asset_status
  WHERE id = NEW.asset_id
  AND status = 'Available'::media_asset_status;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_book_on_campaign_asset_insert ON campaign_assets;
CREATE TRIGGER auto_book_on_campaign_asset_insert
AFTER INSERT ON campaign_assets
FOR EACH ROW
EXECUTE FUNCTION auto_book_media_assets();

-- =====================================================
-- PHASE 8: Status history tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  old_status campaign_status,
  new_status campaign_status NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_campaign_status_history_campaign ON campaign_status_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_status_history_changed_at ON campaign_status_history(changed_at);

-- Track status changes
CREATE OR REPLACE FUNCTION track_campaign_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO campaign_status_history (campaign_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_campaign_status ON campaigns;
CREATE TRIGGER track_campaign_status
AFTER UPDATE ON campaigns
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION track_campaign_status_change();

-- Enable RLS on status history
ALTER TABLE campaign_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view campaign status history"
ON campaign_status_history FOR SELECT
USING (
  campaign_id IN (
    SELECT id FROM campaigns WHERE company_id = get_current_user_company_id()
  )
  OR is_platform_admin(auth.uid())
);