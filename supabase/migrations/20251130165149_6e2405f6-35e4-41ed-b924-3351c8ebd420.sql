-- Step 1: Fix duplicate media_asset_codes by regenerating them
DO $$
DECLARE
  asset_record RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
  attempt INT;
BEGIN
  -- Loop through all assets that have duplicate or null codes
  FOR asset_record IN 
    SELECT id, city, media_type, media_asset_code
    FROM media_assets 
    WHERE media_asset_code IS NULL 
       OR media_asset_code = ''
       OR media_asset_code IN (
         SELECT media_asset_code 
         FROM media_assets 
         WHERE media_asset_code IS NOT NULL
         GROUP BY media_asset_code 
         HAVING COUNT(*) > 1
       )
    ORDER BY created_at ASC
  LOOP
    attempt := 0;
    code_exists := TRUE;
    
    -- Keep generating new codes until we find a unique one
    WHILE code_exists AND attempt < 100 LOOP
      new_code := generate_mns_code(asset_record.city, asset_record.media_type);
      
      -- Check if this code already exists (excluding current record)
      SELECT EXISTS(
        SELECT 1 FROM media_assets 
        WHERE media_asset_code = new_code 
        AND id != asset_record.id
      ) INTO code_exists;
      
      attempt := attempt + 1;
    END LOOP;
    
    -- Update the asset with the new unique code
    IF NOT code_exists THEN
      UPDATE media_assets 
      SET media_asset_code = new_code 
      WHERE id = asset_record.id;
    END IF;
  END LOOP;
END $$;

-- Step 2: Generate codes for any remaining NULL codes
UPDATE media_assets 
SET media_asset_code = generate_mns_code(city, media_type)
WHERE media_asset_code IS NULL OR media_asset_code = '';

-- Step 3: Add unique constraint to media_asset_code
ALTER TABLE media_assets 
DROP CONSTRAINT IF EXISTS media_assets_media_asset_code_unique;

ALTER TABLE media_assets 
ADD CONSTRAINT media_assets_media_asset_code_unique UNIQUE (media_asset_code);

-- Step 4: Create an index on media_asset_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_media_assets_media_asset_code 
ON media_assets(media_asset_code);

-- Step 5: Create a function to get asset by MNS code
CREATE OR REPLACE FUNCTION get_asset_by_code(p_code TEXT)
RETURNS SETOF media_assets
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM media_assets WHERE media_asset_code = p_code LIMIT 1;
$$;