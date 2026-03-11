
-- Fix city map in audit view: add KAR for Karimnagar
DROP VIEW IF EXISTS public.asset_code_audit_view;

CREATE OR REPLACE VIEW public.asset_code_audit_view AS
WITH code_counts AS (
  SELECT media_asset_code, count(*) as code_count
  FROM media_assets
  WHERE media_asset_code IS NOT NULL AND media_asset_code != ''
  GROUP BY media_asset_code
),
city_map(city_name, city_code) AS (VALUES
  ('Hyderabad', 'HYD'),
  ('Karimnagar', 'KAR'),
  ('Warangal', 'WRL'),
  ('Vijayawada', 'VJA'),
  ('Visakhapatnam', 'VSK'),
  ('Bangalore', 'BLR'),
  ('Bengaluru', 'BLR'),
  ('Chennai', 'CHN'),
  ('Mumbai', 'MUM'),
  ('Delhi', 'DEL'),
  ('Pune', 'PUN'),
  ('Kolkata', 'KOL')
),
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
  m.status::text,
  m.created_at,
  (m.media_asset_code IS NULL OR trim(m.media_asset_code) = '') AS is_missing,
  (m.media_asset_code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS is_uuid_like,
  (COALESCE(cc.code_count, 0) > 1) AS is_duplicate,
  (m.media_asset_code IS NOT NULL 
    AND trim(m.media_asset_code) != '' 
    AND m.media_asset_code !~ '^[0-9a-f]{8}-' 
    AND m.media_asset_code !~ '^[A-Z]+-[A-Z]+-[A-Z]+-[0-9]{4}$') AS is_malformed,
  (m.media_asset_code IS NOT NULL
    AND cm.city_code IS NOT NULL
    AND m.media_asset_code !~ ('.*-' || cm.city_code || '-.*')) AS is_city_mismatch,
  (m.media_asset_code IS NOT NULL
    AND tm.type_code IS NOT NULL
    AND m.media_asset_code !~ ('.*-' || tm.type_code || '-.*')) AS is_type_mismatch,
  CASE
    WHEN m.media_asset_code IS NULL OR trim(m.media_asset_code) = '' THEN 'MISSING'
    WHEN m.media_asset_code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-' THEN 'UUID_AS_CODE'
    WHEN COALESCE(cc.code_count, 0) > 1 THEN 'DUPLICATE'
    WHEN m.media_asset_code !~ '^[A-Z]+-[A-Z]+-[A-Z]+-[0-9]{4}$' THEN 'MALFORMED'
    WHEN cm.city_code IS NOT NULL AND m.media_asset_code !~ ('.*-' || cm.city_code || '-.*') THEN 'CITY_MISMATCH'
    WHEN tm.type_code IS NOT NULL AND m.media_asset_code !~ ('.*-' || tm.type_code || '-.*') THEN 'TYPE_MISMATCH'
    ELSE 'OK'
  END AS issue_type,
  (m.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-') AS id_is_uuid,
  COALESCE(cc.code_count, 0) AS duplicate_count
FROM media_assets m
LEFT JOIN code_counts cc ON cc.media_asset_code = m.media_asset_code
LEFT JOIN city_map cm ON lower(trim(m.city)) = lower(cm.city_name)
LEFT JOIN type_map tm ON lower(trim(m.media_type)) = lower(tm.type_name);

-- ============================================================
-- SAFETY CONSTRAINTS (applied after data is verified clean)
-- ============================================================

-- 1. Unique index on media_asset_code (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_unique_code
ON media_assets (media_asset_code)
WHERE media_asset_code IS NOT NULL AND trim(media_asset_code) != '';

-- 2. B-tree index for fast search by code
CREATE INDEX IF NOT EXISTS idx_media_assets_code_search
ON media_assets (media_asset_code);

-- 3. Validation trigger: prevent UUID-like values in media_asset_code
CREATE OR REPLACE FUNCTION public.validate_media_asset_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block UUID-like values in the business code field
  IF NEW.media_asset_code IS NOT NULL 
     AND NEW.media_asset_code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'media_asset_code cannot be a UUID. Use a business code format like MNS-HYD-BQS-0001. Got: %', NEW.media_asset_code;
  END IF;
  
  -- Warn on empty/whitespace-only (allow NULL for draft states)
  IF NEW.media_asset_code IS NOT NULL AND trim(NEW.media_asset_code) = '' THEN
    NEW.media_asset_code := NULL;  -- Normalize empty to NULL
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop if exists to avoid duplicate trigger
DROP TRIGGER IF EXISTS trg_validate_media_asset_code ON media_assets;
CREATE TRIGGER trg_validate_media_asset_code
  BEFORE INSERT OR UPDATE ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_media_asset_code();
