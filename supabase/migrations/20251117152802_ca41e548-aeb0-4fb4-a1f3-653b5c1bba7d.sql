-- Create a safe public view for marketplace that excludes sensitive pricing and vendor details
CREATE OR REPLACE VIEW public.public_media_assets_safe AS
SELECT 
  ma.id,
  ma.media_type,
  ma.category,
  ma.city,
  ma.area,
  ma.location,
  ma.latitude,
  ma.longitude,
  ma.dimensions,
  ma.total_sqft,
  ma.direction,
  ma.illumination,
  ma.status,
  ma.image_urls,
  ma.images,
  ma.google_street_view_url,
  ma.is_multi_face,
  ma.faces,
  -- Include company info for contact but not full details
  c.id as company_id,
  c.name as company_name,
  c.city as company_city,
  c.phone as company_phone,
  c.email as company_email
FROM public.media_assets ma
LEFT JOIN public.companies c ON ma.company_id = c.id
WHERE ma.is_public = true 
  AND ma.status = 'Available'
  AND c.status = 'active';

-- Grant access to authenticated users and anonymous (for public marketplace)
GRANT SELECT ON public.public_media_assets_safe TO authenticated;
GRANT SELECT ON public.public_media_assets_safe TO anon;

-- Add comment explaining the view
COMMENT ON VIEW public.public_media_assets_safe IS 
'Safe public view of media assets that excludes sensitive pricing (card_rate, base_rent, printing_charges, mounting_charges), vendor details, and internal cost information. Used for public marketplace to prevent competitive intelligence theft.';