
-- Fix check_asset_conflict to use per-asset booking dates instead of campaign-level dates
-- This is the core fix for future/advance booking support
CREATE OR REPLACE FUNCTION public.check_asset_conflict(
  p_asset_id text,
  p_start_date date,
  p_end_date date,
  p_exclude_campaign_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict jsonb;
BEGIN
  SELECT jsonb_build_object(
    'has_conflict', EXISTS (
      SELECT 1 
      FROM campaign_assets ca 
      JOIN campaigns c ON ca.campaign_id = c.id
      WHERE ca.asset_id = p_asset_id
      AND COALESCE(c.is_deleted, false) = false
      AND c.status NOT IN ('Completed', 'Cancelled', 'Archived')
      AND (p_exclude_campaign_id IS NULL OR c.id != p_exclude_campaign_id)
      -- Use per-asset booking dates with fallback to campaign dates
      AND daterange(
            COALESCE(ca.booking_start_date, ca.start_date, c.start_date),
            COALESCE(ca.booking_end_date, ca.end_date, c.end_date),
            '[]'
          ) && daterange(p_start_date, p_end_date, '[]')
    ),
    'conflicting_campaigns', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'campaign_id', c.id,
        'campaign_name', c.campaign_name,
        'client_name', c.client_name,
        'start_date', COALESCE(ca.booking_start_date, ca.start_date, c.start_date),
        'end_date', COALESCE(ca.booking_end_date, ca.end_date, c.end_date),
        'status', c.status
      ))
      FROM campaign_assets ca 
      JOIN campaigns c ON ca.campaign_id = c.id
      WHERE ca.asset_id = p_asset_id
      AND COALESCE(c.is_deleted, false) = false
      AND c.status NOT IN ('Completed', 'Cancelled', 'Archived')
      AND (p_exclude_campaign_id IS NULL OR c.id != p_exclude_campaign_id)
      AND daterange(
            COALESCE(ca.booking_start_date, ca.start_date, c.start_date),
            COALESCE(ca.booking_end_date, ca.end_date, c.end_date),
            '[]'
          ) && daterange(p_start_date, p_end_date, '[]')
    ), '[]'::jsonb)
  ) INTO v_conflict;
  
  RETURN v_conflict;
END;
$$;
