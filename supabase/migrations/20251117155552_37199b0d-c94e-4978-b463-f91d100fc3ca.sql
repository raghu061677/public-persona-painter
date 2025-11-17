-- Fix Security Definer View: Recreate public_media_assets_safe as regular view
-- This view powers the Go-Ads marketplace showing all media owners' public inventory

DROP VIEW IF EXISTS public.public_media_assets_safe;

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
  
  -- Physical specifications
  ma.dimensions,
  ma.total_sqft,
  ma.is_multi_face,
  ma.faces,
  ma.illumination,
  
  -- Pricing and availability
  ma.card_rate,
  ma.status,
  
  -- Visual assets
  ma.images,
  ma.image_urls,
  ma.google_street_view_url,
  
  -- Owner company info (for contact)
  ma.company_id,
  c.name as company_name,
  c.city as company_city,
  c.phone as company_phone,
  c.email as company_email
FROM media_assets ma
LEFT JOIN companies c ON ma.company_id = c.id
WHERE ma.is_public = true;

-- Grant access to all users (including anonymous) for marketplace
GRANT SELECT ON public.public_media_assets_safe TO anon;
GRANT SELECT ON public.public_media_assets_safe TO authenticated;

-- Add helpful comment
COMMENT ON VIEW public.public_media_assets_safe IS 'Public marketplace view of media assets available for booking. Shows only assets marked as public (is_public=true).';