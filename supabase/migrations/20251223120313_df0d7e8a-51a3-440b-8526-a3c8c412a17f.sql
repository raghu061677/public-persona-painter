-- Add columns for duplicate tracking and audit trail
ALTER TABLE media_assets
ADD COLUMN IF NOT EXISTS duplicate_group_id uuid,
ADD COLUMN IF NOT EXISTS remarks text;

-- Create index for faster duplicate lookups
CREATE INDEX IF NOT EXISTS idx_media_assets_duplicate_group 
ON media_assets(duplicate_group_id) 
WHERE duplicate_group_id IS NOT NULL;

-- Function to detect and tag duplicates
CREATE OR REPLACE FUNCTION detect_media_asset_duplicates()
RETURNS TABLE (
  group_id uuid,
  asset_ids text[],
  duplicate_count bigint,
  city text,
  area text,
  location text,
  media_type text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gen_random_uuid() as group_id,
    array_agg(ma.id ORDER BY ma.created_at) as asset_ids,
    count(*) as duplicate_count,
    ma.city,
    ma.area,
    ma.location,
    ma.media_type
  FROM media_assets ma
  WHERE ma.is_active = true
  GROUP BY
    ma.company_id,
    ma.media_type,
    ma.city,
    ma.area,
    ma.location,
    ma.direction,
    ma.dimensions,
    ma.latitude,
    ma.longitude
  HAVING count(*) > 1
  ORDER BY count(*) DESC;
END;
$$;

-- Function to check for potential duplicate before insert/update
CREATE OR REPLACE FUNCTION check_media_asset_duplicate(
  p_company_id uuid,
  p_media_type text,
  p_city text,
  p_area text,
  p_location text,
  p_direction text,
  p_dimensions text,
  p_latitude numeric,
  p_longitude numeric,
  p_exclude_id text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  media_asset_code text,
  location text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ma.id,
    ma.media_asset_code,
    ma.location,
    ma.created_at
  FROM media_assets ma
  WHERE ma.company_id = p_company_id
    AND ma.media_type = p_media_type
    AND ma.city = p_city
    AND ma.area = p_area
    AND ma.location = p_location
    AND COALESCE(ma.direction, '') = COALESCE(p_direction, '')
    AND COALESCE(ma.dimensions, '') = COALESCE(p_dimensions, '')
    AND COALESCE(ma.latitude, 0) = COALESCE(p_latitude, 0)
    AND COALESCE(ma.longitude, 0) = COALESCE(p_longitude, 0)
    AND ma.is_active = true
    AND (p_exclude_id IS NULL OR ma.id != p_exclude_id);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION detect_media_asset_duplicates() TO authenticated;
GRANT EXECUTE ON FUNCTION check_media_asset_duplicate(uuid, text, text, text, text, text, text, numeric, numeric, text) TO authenticated;