-- =====================================================
-- FIX 1: Sync installation_status when status changes
-- =====================================================

CREATE OR REPLACE FUNCTION sync_campaign_asset_installation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Map status to installation_status
  IF NEW.status = 'Pending' THEN
    NEW.installation_status := 'Pending';
  ELSIF NEW.status = 'Assigned' THEN
    NEW.installation_status := 'Assigned';
  ELSIF NEW.status = 'In Progress' THEN
    NEW.installation_status := 'In Progress';
  ELSIF NEW.status = 'Installed' THEN
    NEW.installation_status := 'Installed';
  ELSIF NEW.status = 'QA Pending' THEN
    NEW.installation_status := 'QA Pending';
  ELSIF NEW.status = 'Verified' OR NEW.status = 'Completed' THEN
    NEW.installation_status := 'Completed';
    -- Set completed_at if not already set
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
  ELSIF NEW.status = 'Failed' THEN
    NEW.installation_status := 'Failed';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_installation_status ON campaign_assets;
CREATE TRIGGER sync_installation_status
BEFORE INSERT OR UPDATE OF status ON campaign_assets
FOR EACH ROW
EXECUTE FUNCTION sync_campaign_asset_installation_status();

-- =====================================================
-- FIX 2: Update existing campaign_assets to sync status
-- =====================================================

UPDATE campaign_assets
SET installation_status = 'Completed',
    completed_at = COALESCE(completed_at, NOW())
WHERE status IN ('Verified', 'Completed') AND installation_status != 'Completed';

UPDATE campaign_assets
SET installation_status = 'Installed'
WHERE status = 'Installed' AND installation_status != 'Installed';

UPDATE campaign_assets
SET installation_status = 'Assigned'
WHERE status = 'Assigned' AND installation_status NOT IN ('Assigned', 'In Progress', 'Installed', 'Completed');

-- =====================================================
-- FIX 3: Auto-release media assets when campaign ends
-- =====================================================

CREATE OR REPLACE FUNCTION auto_release_media_assets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When campaign status changes to Completed, Cancelled, or Archived
  IF NEW.status IN ('Completed', 'Cancelled', 'Archived') 
     AND OLD.status NOT IN ('Completed', 'Cancelled', 'Archived') THEN
    
    -- Release assets that are not booked by other active campaigns
    UPDATE media_assets ma
    SET status = 'Available'::media_asset_status
    WHERE ma.id IN (
      SELECT ca.asset_id FROM campaign_assets ca WHERE ca.campaign_id = NEW.id
    )
    AND ma.status = 'Booked'::media_asset_status
    AND NOT EXISTS (
      SELECT 1 FROM campaign_assets ca2
      JOIN campaigns c ON c.id = ca2.campaign_id
      WHERE ca2.asset_id = ma.id
      AND c.id != NEW.id
      AND c.status IN ('Draft', 'Upcoming', 'Running')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_release_assets_on_campaign_end ON campaigns;
CREATE TRIGGER auto_release_assets_on_campaign_end
AFTER UPDATE OF status ON campaigns
FOR EACH ROW
EXECUTE FUNCTION auto_release_media_assets();

-- =====================================================
-- FIX 4: Improved auto_update_campaign_status function
-- =====================================================

CREATE OR REPLACE FUNCTION auto_update_campaign_status()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campaign_record RECORD;
  today DATE := CURRENT_DATE;
BEGIN
  FOR campaign_record IN 
    SELECT id, status, start_date, end_date 
    FROM campaigns 
    WHERE status NOT IN ('Completed', 'Cancelled', 'Archived')
  LOOP
    -- Draft campaigns that should be Upcoming (start date in future)
    IF campaign_record.status = 'Draft' AND campaign_record.start_date > today THEN
      UPDATE campaigns SET status = 'Upcoming' WHERE id = campaign_record.id;
    
    -- Upcoming or Draft campaigns that should be Running
    ELSIF campaign_record.status IN ('Draft', 'Upcoming') 
          AND campaign_record.start_date <= today 
          AND campaign_record.end_date >= today THEN
      UPDATE campaigns SET status = 'Running' WHERE id = campaign_record.id;
    
    -- Running campaigns that should be Completed
    ELSIF campaign_record.status = 'Running' AND campaign_record.end_date < today THEN
      UPDATE campaigns SET status = 'Completed' WHERE id = campaign_record.id;
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- FIX 5: RLS policy for public marketplace
-- =====================================================

DROP POLICY IF EXISTS "public_marketplace_view" ON media_assets;
CREATE POLICY "public_marketplace_view" ON media_assets
FOR SELECT
USING (is_public = true AND status = 'Available'::media_asset_status);

-- =====================================================
-- FIX 6: Grant execute on auto_update_campaign_status
-- =====================================================

GRANT EXECUTE ON FUNCTION auto_update_campaign_status() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_update_campaign_status() TO anon;