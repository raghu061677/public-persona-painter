
-- Fix storage INSERT policy for operations-photos to include all field roles
DROP POLICY IF EXISTS "Operations users can upload their company photos" ON storage.objects;
CREATE POLICY "Operations users can upload their company photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'operations-photos'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT company_users.company_id::text
      FROM company_users
      WHERE company_users.user_id = auth.uid()
        AND company_users.status = 'active'
        AND company_users.role = ANY(ARRAY[
          'admin'::app_role,
          'operations'::app_role,
          'operations_manager'::app_role,
          'sales'::app_role,
          'installation'::app_role,
          'mounting'::app_role,
          'monitor'::app_role,
          'monitoring'::app_role
        ])
    )
    OR is_platform_admin(auth.uid())
  )
);

-- Also fix the media_photos INSERT policy "Users can insert photos for company assets"
-- to include all field roles (currently only admin + operations)
DROP POLICY IF EXISTS "Users can insert photos for company assets" ON public.media_photos;
CREATE POLICY "Users can insert photos for company assets"
ON public.media_photos FOR INSERT
WITH CHECK (
  asset_id IN (
    SELECT media_assets.id FROM media_assets
    WHERE media_assets.company_id = get_current_user_company_id()
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'operations'::app_role)
    OR has_role(auth.uid(), 'operations_manager'::app_role)
    OR has_role(auth.uid(), 'sales'::app_role)
    OR has_role(auth.uid(), 'installation'::app_role)
    OR has_role(auth.uid(), 'mounting'::app_role)
    OR has_role(auth.uid(), 'monitor'::app_role)
    OR has_role(auth.uid(), 'monitoring'::app_role)
  )
);

-- Fix "Authorized roles can upload photos" to include all field roles
DROP POLICY IF EXISTS "Authorized roles can upload photos" ON public.media_photos;
CREATE POLICY "Authorized roles can upload photos"
ON public.media_photos FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'operations'::app_role)
  OR has_role(auth.uid(), 'operations_manager'::app_role)
  OR has_role(auth.uid(), 'sales'::app_role)
  OR has_role(auth.uid(), 'installation'::app_role)
  OR has_role(auth.uid(), 'mounting'::app_role)
  OR has_role(auth.uid(), 'monitor'::app_role)
  OR has_role(auth.uid(), 'monitoring'::app_role)
);
