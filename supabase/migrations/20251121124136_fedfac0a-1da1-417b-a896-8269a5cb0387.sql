-- Migrate old media_assets images to media_photos table
-- This will copy all existing images from the JSONB 'images' field to the new media_photos table

DO $$
DECLARE
  asset_record RECORD;
  photo_record JSONB;
  v_photo_url TEXT;
  v_photo_tag TEXT;
  v_photo_uploaded_at TIMESTAMP;
BEGIN
  -- Loop through all assets that have images in the old format
  FOR asset_record IN 
    SELECT 
      id,
      company_id,
      images
    FROM media_assets
    WHERE images IS NOT NULL 
      AND images::text != '{}'
      AND images::text != '[]'
      AND jsonb_typeof(images) = 'object'
      AND images ? 'photos'
  LOOP
    -- Loop through each photo in the photos array
    FOR photo_record IN 
      SELECT * FROM jsonb_array_elements(asset_record.images->'photos')
    LOOP
      -- Extract photo details
      v_photo_url := photo_record->>'url';
      v_photo_tag := COALESCE(photo_record->>'tag', 'Other');
      v_photo_uploaded_at := COALESCE(
        (photo_record->>'uploaded_at')::timestamp,
        now()
      );
      
      -- Skip if this URL already exists in media_photos
      IF NOT EXISTS (
        SELECT 1 FROM media_photos mp
        WHERE mp.photo_url = v_photo_url 
        AND mp.asset_id = asset_record.id
      ) THEN
        -- Insert into media_photos table
        INSERT INTO media_photos (
          company_id,
          asset_id,
          photo_url,
          category,
          uploaded_at,
          metadata,
          approval_status
        ) VALUES (
          asset_record.company_id,
          asset_record.id,
          v_photo_url,
          CASE 
            WHEN v_photo_tag ILIKE '%proof%' OR v_photo_tag ILIKE '%newspaper%' OR v_photo_tag ILIKE '%traffic%' THEN 'Proof'
            WHEN v_photo_tag ILIKE '%mounting%' THEN 'Mounting'
            WHEN v_photo_tag ILIKE '%display%' THEN 'Display'
            ELSE 'General'
          END,
          v_photo_uploaded_at,
          jsonb_build_object(
            'photo_tag', v_photo_tag,
            'migrated_from_old_format', true,
            'original_validation', photo_record->'validation'
          ),
          'approved'
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully';
END $$;

-- Add comment documenting the migration
COMMENT ON TABLE media_photos IS 'Centralized photo management table. Photos from legacy media_assets.images field have been migrated here.';

-- Verify migration results
DO $$
DECLARE
  migrated_count INTEGER;
  old_format_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM media_photos WHERE (metadata->>'migrated_from_old_format')::boolean = true;
  SELECT COUNT(*) INTO old_format_count FROM media_assets WHERE images IS NOT NULL AND images::text != '{}' AND images::text != '[]';
  
  RAISE NOTICE 'Migrated % photos from % assets with old format images', migrated_count, old_format_count;
END $$;