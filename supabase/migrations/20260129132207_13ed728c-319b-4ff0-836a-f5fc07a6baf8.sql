
-- Fix the soft_delete_campaign function to properly release assets
-- The issue was that the NOT EXISTS check was too restrictive
CREATE OR REPLACE FUNCTION public.soft_delete_campaign(
  p_campaign_id text,
  p_deletion_reason text,
  p_deleted_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign RECORD;
  v_has_invoices BOOLEAN;
  v_has_payments BOOLEAN;
  v_assets_count INTEGER;
  v_released_assets INTEGER;
BEGIN
  -- Get campaign
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
  END IF;
  
  IF v_campaign.is_deleted THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign already deleted');
  END IF;
  
  -- Check for invoices
  SELECT EXISTS(
    SELECT 1 FROM invoices 
    WHERE campaign_id = p_campaign_id 
    AND status NOT IN ('Cancelled', 'Draft')
  ) INTO v_has_invoices;
  
  IF v_has_invoices THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete campaign with issued invoices');
  END IF;
  
  -- Check for payments
  SELECT EXISTS(
    SELECT 1 FROM invoices 
    WHERE campaign_id = p_campaign_id 
    AND balance_due < total_amount
  ) INTO v_has_payments;
  
  IF v_has_payments THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete campaign with recorded payments');
  END IF;
  
  -- Get assets count
  SELECT COUNT(*) INTO v_assets_count FROM campaign_assets WHERE campaign_id = p_campaign_id;
  
  -- Log deletion
  INSERT INTO campaign_deletions (
    campaign_id, campaign_name, client_name, deleted_by, deletion_reason, 
    campaign_data, assets_released
  ) VALUES (
    p_campaign_id, v_campaign.campaign_name, v_campaign.client_name, 
    p_deleted_by, p_deletion_reason,
    to_jsonb(v_campaign), v_assets_count
  );
  
  -- Soft delete the campaign
  UPDATE campaigns SET 
    is_deleted = true,
    deleted_at = now(),
    deleted_by = p_deleted_by,
    deletion_reason = p_deletion_reason
  WHERE id = p_campaign_id;
  
  -- Release asset bookings
  DELETE FROM asset_bookings WHERE campaign_id = p_campaign_id;
  
  -- Release media assets that were booked for THIS campaign
  -- Only check for OTHER active (non-deleted, non-completed) future campaigns
  WITH released AS (
    UPDATE media_assets
    SET 
      status = 'Available'::media_asset_status,
      booked_from = NULL,
      booked_to = NULL,
      current_campaign_id = NULL,
      updated_at = now()
    WHERE current_campaign_id = p_campaign_id
    AND NOT EXISTS (
      -- Check no other ACTIVE future campaigns reference this asset
      SELECT 1 
      FROM campaign_assets ca
      JOIN campaigns c ON c.id = ca.campaign_id
      WHERE ca.asset_id = media_assets.id
        AND c.id != p_campaign_id
        AND c.is_deleted = false
        AND c.status NOT IN ('Completed', 'Cancelled', 'Archived')
        AND c.end_date >= CURRENT_DATE
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_released_assets FROM released;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Campaign deleted successfully',
    'assets_released', v_released_assets,
    'campaign_id', p_campaign_id
  );
END;
$function$;
