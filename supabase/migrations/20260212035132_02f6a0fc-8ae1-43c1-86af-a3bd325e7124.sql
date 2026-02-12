
-- PHASE-2 SECTION 7: SANITIZE public_media_assets_safe VIEW (remove pricing)
-- Must DROP and recreate since we're removing columns
DROP VIEW IF EXISTS public.public_media_assets_safe;

CREATE VIEW public.public_media_assets_safe AS
SELECT 
  id, media_asset_code, company_id, state, district, city, area, location,
  media_type, category, direction, dimensions, total_sqft, illumination_type,
  latitude, longitude,
  -- REMOVED: base_rate, card_rate, printing_rate_default, mounting_rate_default
  status, is_public, is_featured, is_active,
  primary_photo_url, google_street_view_url, qr_code_url,
  municipal_authority, municipal_id, display_title, tags,
  created_at, updated_at
FROM media_assets
WHERE is_public = true AND is_active = true;
