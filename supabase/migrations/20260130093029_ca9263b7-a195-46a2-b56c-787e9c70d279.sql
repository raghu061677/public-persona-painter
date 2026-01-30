-- =====================================================
-- Legacy Asset ID Cleanup Migration
-- Goal: Ensure all assets have a canonical media_asset_code
-- and store any legacy identifiers for historical lookups
-- =====================================================

-- Step 1: Add legacy_codes column if it doesn't exist
ALTER TABLE public.media_assets 
ADD COLUMN IF NOT EXISTS legacy_codes text[] DEFAULT ARRAY[]::text[];

-- Add comment explaining the column
COMMENT ON COLUMN public.media_assets.legacy_codes IS 'Array of historical/legacy asset IDs that previously referred to this asset. Used for resolving old references.';

-- Step 2: Create index for legacy_codes lookups
CREATE INDEX IF NOT EXISTS idx_media_assets_legacy_codes 
ON public.media_assets USING GIN (legacy_codes);

-- Step 3: Create index on media_asset_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_media_assets_media_asset_code 
ON public.media_assets (media_asset_code) 
WHERE media_asset_code IS NOT NULL;

-- Step 4: Create function to generate asset code for assets missing one
CREATE OR REPLACE FUNCTION public.backfill_missing_asset_codes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_asset RECORD;
  v_city_code text;
  v_type_code text;
  v_seq integer;
  v_new_code text;
BEGIN
  -- Find all assets missing media_asset_code
  FOR v_asset IN 
    SELECT id, city, media_type
    FROM media_assets
    WHERE media_asset_code IS NULL
  LOOP
    -- Generate 3-letter city code
    v_city_code := UPPER(SUBSTRING(v_asset.city, 1, 3));
    
    -- Map media type to abbreviation
    v_type_code := CASE 
      WHEN v_asset.media_type ILIKE '%bus%shelter%' THEN 'BQS'
      WHEN v_asset.media_type ILIKE '%unipole%' THEN 'UNI'
      WHEN v_asset.media_type ILIKE '%gantry%' THEN 'GTY'
      WHEN v_asset.media_type ILIKE '%billboard%' THEN 'BLB'
      WHEN v_asset.media_type ILIKE '%hoarding%' THEN 'HRD'
      WHEN v_asset.media_type ILIKE '%led%' OR v_asset.media_type ILIKE '%digital%' THEN 'LED'
      WHEN v_asset.media_type ILIKE '%pole%kiosk%' THEN 'PLK'
      WHEN v_asset.media_type ILIKE '%wall%' THEN 'WAL'
      WHEN v_asset.media_type ILIKE '%cantilever%' THEN 'CNT'
      ELSE UPPER(SUBSTRING(REPLACE(v_asset.media_type, ' ', ''), 1, 3))
    END;
    
    -- Get next sequence number for this city+type combo
    SELECT COALESCE(MAX(
      CASE 
        WHEN media_asset_code ~ (v_city_code || '-' || v_type_code || '-[0-9]+$')
        THEN CAST(SUBSTRING(media_asset_code FROM '[0-9]+$') AS integer)
        ELSE 0
      END
    ), 0) + 1
    INTO v_seq
    FROM media_assets
    WHERE media_asset_code LIKE v_city_code || '-' || v_type_code || '-%';
    
    -- Build the new code
    v_new_code := v_city_code || '-' || v_type_code || '-' || LPAD(v_seq::TEXT, 4, '0');
    
    -- Update the asset, storing old ID in legacy_codes if it looks like a readable code
    UPDATE media_assets
    SET 
      media_asset_code = v_new_code,
      legacy_codes = CASE 
        -- If the id looks like a readable code (not a UUID), store it
        WHEN id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN array_append(COALESCE(legacy_codes, ARRAY[]::text[]), id)
        ELSE legacy_codes
      END,
      updated_at = now()
    WHERE id = v_asset.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Step 5: Create function to resolve asset by any identifier
CREATE OR REPLACE FUNCTION public.resolve_asset_id(p_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM media_assets
  WHERE 
    -- Match by primary key
    id = p_identifier
    -- Or match by media_asset_code
    OR media_asset_code = p_identifier
    -- Or match by legacy codes
    OR p_identifier = ANY(legacy_codes)
  LIMIT 1;
$$;

-- Step 6: Create function to get display code for an asset
CREATE OR REPLACE FUNCTION public.get_asset_display_code(p_asset_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(media_asset_code, 
    CASE 
      WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN 'ASSET-' || UPPER(SUBSTRING(REPLACE(id, '-', '') FROM LENGTH(REPLACE(id, '-', '')) - 5))
      ELSE id
    END
  )
  FROM media_assets
  WHERE id = p_asset_id;
$$;

-- Step 7: Run the backfill for any assets missing codes
-- (This is safe to run - only updates assets without media_asset_code)
SELECT public.backfill_missing_asset_codes();

-- Step 8: Add validation trigger to ensure new assets get codes
CREATE OR REPLACE FUNCTION public.ensure_asset_code_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city_code text;
  v_type_code text;
  v_seq integer;
BEGIN
  -- Only generate if media_asset_code is not provided
  IF NEW.media_asset_code IS NULL THEN
    -- Generate 3-letter city code
    v_city_code := UPPER(SUBSTRING(NEW.city, 1, 3));
    
    -- Map media type to abbreviation
    v_type_code := CASE 
      WHEN NEW.media_type ILIKE '%bus%shelter%' THEN 'BQS'
      WHEN NEW.media_type ILIKE '%unipole%' THEN 'UNI'
      WHEN NEW.media_type ILIKE '%gantry%' THEN 'GTY'
      WHEN NEW.media_type ILIKE '%billboard%' THEN 'BLB'
      WHEN NEW.media_type ILIKE '%hoarding%' THEN 'HRD'
      WHEN NEW.media_type ILIKE '%led%' OR NEW.media_type ILIKE '%digital%' THEN 'LED'
      WHEN NEW.media_type ILIKE '%pole%kiosk%' THEN 'PLK'
      WHEN NEW.media_type ILIKE '%wall%' THEN 'WAL'
      WHEN NEW.media_type ILIKE '%cantilever%' THEN 'CNT'
      ELSE UPPER(SUBSTRING(REPLACE(NEW.media_type, ' ', ''), 1, 3))
    END;
    
    -- Get next sequence number
    SELECT COALESCE(MAX(
      CASE 
        WHEN media_asset_code ~ (v_city_code || '-' || v_type_code || '-[0-9]+$')
        THEN CAST(SUBSTRING(media_asset_code FROM '[0-9]+$') AS integer)
        ELSE 0
      END
    ), 0) + 1
    INTO v_seq
    FROM media_assets
    WHERE media_asset_code LIKE v_city_code || '-' || v_type_code || '-%';
    
    NEW.media_asset_code := v_city_code || '-' || v_type_code || '-' || LPAD(v_seq::TEXT, 4, '0');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger (drop first if exists to avoid duplicates)
DROP TRIGGER IF EXISTS ensure_asset_code_trigger ON public.media_assets;
CREATE TRIGGER ensure_asset_code_trigger
  BEFORE INSERT ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_asset_code_on_insert();