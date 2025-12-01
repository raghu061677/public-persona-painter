-- Migration to convert all existing asset codes to MNS format
-- This will update media_asset_code to use MNS-CITY-TYPE-XXXX format

DO $$
DECLARE
  asset_record RECORD;
  new_mns_code TEXT;
BEGIN
  -- Loop through all assets that need code conversion
  FOR asset_record IN 
    SELECT id, city, media_type, media_asset_code
    FROM media_assets
    WHERE media_asset_code IS NOT NULL 
      AND media_asset_code NOT LIKE 'MNS-%'
    ORDER BY created_at ASC
  LOOP
    -- Generate new MNS code using existing function
    new_mns_code := generate_mns_code(asset_record.city, asset_record.media_type);
    
    -- Update the asset with new MNS code
    UPDATE media_assets
    SET media_asset_code = new_mns_code,
        updated_at = now()
    WHERE id = asset_record.id;
    
    RAISE NOTICE 'Updated asset % from % to %', 
      asset_record.id, 
      asset_record.media_asset_code, 
      new_mns_code;
  END LOOP;
  
  RAISE NOTICE 'Asset code migration completed';
END $$;