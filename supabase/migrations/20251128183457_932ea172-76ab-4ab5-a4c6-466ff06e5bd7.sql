-- Function to unbook media assets when campaign items are deleted
CREATE OR REPLACE FUNCTION unbook_media_asset_on_item_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the media asset to Available status when campaign item is deleted
  UPDATE media_assets
  SET 
    status = 'Available',
    booked_from = NULL,
    booked_to = NULL,
    current_campaign_id = NULL,
    updated_at = now()
  WHERE id = OLD.asset_id
    AND current_campaign_id = OLD.campaign_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on campaign_items DELETE
CREATE TRIGGER trigger_unbook_asset_on_campaign_item_delete
AFTER DELETE ON campaign_items
FOR EACH ROW
EXECUTE FUNCTION unbook_media_asset_on_item_delete();

-- Trigger on campaign_assets DELETE
CREATE TRIGGER trigger_unbook_asset_on_campaign_asset_delete
AFTER DELETE ON campaign_assets
FOR EACH ROW
EXECUTE FUNCTION unbook_media_asset_on_item_delete();

-- Function to manually unbook an asset from a campaign (for frontend use)
CREATE OR REPLACE FUNCTION manually_unbook_asset(
  p_asset_id TEXT,
  p_campaign_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update the asset
  UPDATE media_assets
  SET 
    status = 'Available',
    booked_from = NULL,
    booked_to = NULL,
    current_campaign_id = NULL,
    updated_at = now()
  WHERE id = p_asset_id
    AND current_campaign_id = p_campaign_id;
  
  IF FOUND THEN
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Asset unbooked successfully',
      'asset_id', p_asset_id
    );
  ELSE
    v_result := jsonb_build_object(
      'success', false,
      'message', 'Asset not found or not booked to this campaign',
      'asset_id', p_asset_id
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;