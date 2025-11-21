-- Fix SECURITY DEFINER views by explicitly setting SECURITY INVOKER
-- This ensures views use the permissions of the querying user, not the view creator

-- Fix clients_basic view
DROP VIEW IF EXISTS public.clients_basic CASCADE;

CREATE VIEW public.clients_basic
WITH (security_invoker=true) AS
SELECT 
  id,
  name,
  company,
  city,
  state,
  created_at
FROM public.clients;

GRANT SELECT ON public.clients_basic TO authenticated;

COMMENT ON VIEW public.clients_basic IS 'Masked view of clients showing only basic info for operations/finance roles. Uses SECURITY INVOKER to enforce RLS of the querying user.';

-- Fix user_roles_compat view
DROP VIEW IF EXISTS public.user_roles_compat CASCADE;

CREATE VIEW public.user_roles_compat
WITH (security_invoker=true) AS
SELECT DISTINCT
  cu.user_id,
  cu.role,
  cu.joined_at as created_at
FROM company_users cu
WHERE cu.status = 'active';

COMMENT ON VIEW user_roles_compat IS 'Compatibility view for legacy code using user_roles table - maps to company_users. Uses SECURITY INVOKER to enforce RLS.';

-- Fix public_media_assets_safe view
DROP VIEW IF EXISTS public.public_media_assets_safe CASCADE;

CREATE VIEW public.public_media_assets_safe
WITH (security_invoker=true) AS
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
'Public marketplace view showing media assets with photos from media_photos table. Uses SECURITY INVOKER to ensure querying users permissions are enforced.';