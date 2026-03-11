
-- ============================================================
-- ASSET CODE AUDIT VIEW
-- Single source of truth for all media_asset_code quality issues
-- ============================================================

CREATE OR REPLACE VIEW public.asset_code_audit_view AS
WITH code_counts AS (
  SELECT media_asset_code, count(*) as code_count
  FROM media_assets
  WHERE media_asset_code IS NOT NULL AND media_asset_code != ''
  GROUP BY media_asset_code
),
-- City code mapping for mismatch detection
city_map(city_name, city_code) AS (VALUES
  ('Hyderabad', 'HYD'),
  ('Karimnagar', 'KRM'),
  ('Warangal', 'WRL'),
  ('Vijayawada', 'VJA'),
  ('Visakhapatnam', 'VSK'),
  ('Bangalore', 'BLR'),
  ('Chennai', 'CHN'),
  ('Mumbai', 'MUM'),
  ('Delhi', 'DEL')
),
-- Media type code mapping
type_map(type_name, type_code) AS (VALUES
  ('Bus Shelter', 'BQS'),
  ('Bus Queue Shelter', 'BQS'),
  ('Cantilever', 'CNT'),
  ('Public Utility', 'PUB'),
  ('Unipole', 'UNI'),
  ('Hoarding', 'HMG'),
  ('Digital', 'DIG'),
  ('Billboard', 'BLB')
)
SELECT
  m.id,
  m.media_asset_code AS current_asset_code,
  m.city,
  m.area,
  m.location,
  m.media_type,
  m.status,
  m.created_at,
  -- Issue flags
  (m.media_asset_code IS NULL OR trim(m.media_asset_code) = '') AS is_missing,
  (m.media_asset_code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS is_uuid_like,
  (COALESCE(cc.code_count, 0) > 1) AS is_duplicate,
  (m.media_asset_code IS NOT NULL 
    AND trim(m.media_asset_code) != '' 
    AND m.media_asset_code !~ '^[0-9a-f]{8}-' 
    AND m.media_asset_code !~ '^[A-Z]+-[A-Z]+-[A-Z]+-[0-9]{4}$') AS is_malformed,
  -- City prefix mismatch
  (m.media_asset_code IS NOT NULL
    AND cm.city_code IS NOT NULL
    AND m.media_asset_code !~ ('.*-' || cm.city_code || '-.*')) AS is_city_mismatch,
  -- Media type prefix mismatch
  (m.media_asset_code IS NOT NULL
    AND tm.type_code IS NOT NULL
    AND m.media_asset_code !~ ('.*-' || tm.type_code || '-.*')) AS is_type_mismatch,
  -- Overall issue type label
  CASE
    WHEN m.media_asset_code IS NULL OR trim(m.media_asset_code) = '' THEN 'MISSING'
    WHEN m.media_asset_code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-' THEN 'UUID_AS_CODE'
    WHEN COALESCE(cc.code_count, 0) > 1 THEN 'DUPLICATE'
    WHEN m.media_asset_code !~ '^[A-Z]+-[A-Z]+-[A-Z]+-[0-9]{4}$' THEN 'MALFORMED'
    WHEN cm.city_code IS NOT NULL AND m.media_asset_code !~ ('.*-' || cm.city_code || '-.*') THEN 'CITY_MISMATCH'
    WHEN tm.type_code IS NOT NULL AND m.media_asset_code !~ ('.*-' || tm.type_code || '-.*') THEN 'TYPE_MISMATCH'
    ELSE 'OK'
  END AS issue_type,
  -- ID format detection
  (m.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-') AS id_is_uuid,
  COALESCE(cc.code_count, 0) AS duplicate_count
FROM media_assets m
LEFT JOIN code_counts cc ON cc.media_asset_code = m.media_asset_code
LEFT JOIN city_map cm ON lower(m.city) = lower(cm.city_name)
LEFT JOIN type_map tm ON lower(m.media_type) = lower(tm.type_name);

-- Grant access
COMMENT ON VIEW public.asset_code_audit_view IS 'Audit view for detecting media asset code quality issues: missing, UUID-like, duplicate, malformed, or mismatched codes';
