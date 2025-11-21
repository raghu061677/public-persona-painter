-- Fix marketplace visibility: Set all Matrix Network Solutions assets as public
-- This will make all 110 assets visible in the marketplace

-- Update existing assets to be public
UPDATE media_assets
SET is_public = true
WHERE company_id IN (
  SELECT id FROM companies WHERE name = 'Matrix Network Solutions'
)
AND (is_public IS NULL OR is_public = false);

-- Add a comment documenting the fix
COMMENT ON COLUMN media_assets.is_public IS 
'Controls marketplace visibility. Default should be true for most media owners who want to list their inventory publicly.';

-- Update the public_media_assets_safe view to include images from media_photos
DROP VIEW IF EXISTS public.public_media_assets_safe CASCADE;

CREATE VIEW public.public_media_assets_safe AS
SELECT 
  -- Asset identification
  ma.id,
  ma.media_type,
  ma.category,
  
  -- Location details for marketplace
  ma.city,
  ma.area,
  ma.location,
  ma.direction,
  ma.latitude,
  ma.longitude,
  
  -- Display details
  ma.dimensions,
  ma.total_sqft,
  ma.illumination,
  ma.status,
  ma.is_multi_face,
  ma.faces,
  ma.google_street_view_url,
  
  -- Images from media_photos table (get latest photos per asset)
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'url', photo_url,
          'tag', COALESCE((metadata->>'photo_tag')::text, 'Other'),
          'uploaded_at', uploaded_at
        ) ORDER BY uploaded_at DESC
      )
      FROM media_photos mp
      WHERE mp.asset_id = ma.id
      LIMIT 4
    ),
    '[]'::jsonb
  ) as images,
  
  -- Legacy image_urls field for backward compatibility
  COALESCE(
    (
      SELECT array_agg(photo_url ORDER BY uploaded_at DESC)
      FROM media_photos mp
      WHERE mp.asset_id = ma.id
      LIMIT 4
    ),
    ARRAY[]::text[]
  ) as image_urls,
  
  -- Company details (non-sensitive)
  ma.company_id,
  c.name as company_name,
  c.city as company_city,
  c.phone as company_phone,
  c.email as company_email
FROM media_assets ma
LEFT JOIN companies c ON ma.company_id = c.id
WHERE ma.is_public = true
  AND c.status = 'active';

GRANT SELECT ON public.public_media_assets_safe TO anon;
GRANT SELECT ON public.public_media_assets_safe TO authenticated;

COMMENT ON VIEW public.public_media_assets_safe IS 
'Public marketplace view showing all media assets marked as public with their photos from media_photos table. Used for the Go-Ads marketplace.';
