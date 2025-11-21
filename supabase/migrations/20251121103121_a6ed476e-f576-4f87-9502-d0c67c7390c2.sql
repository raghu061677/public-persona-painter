
-- Enhanced storage policies for multi-tenant isolation
-- These policies ensure that storage paths include company_id for proper isolation

-- Drop existing overly permissive policies for media-assets bucket
DROP POLICY IF EXISTS "Anyone can view media assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete media assets" ON storage.objects;

-- Create company-isolated policies for media-assets bucket
CREATE POLICY "Users can view their company media assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'media-assets' AND
  (
    -- Check if path starts with user's company_id
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR is_platform_admin(auth.uid())
  )
);

CREATE POLICY "Users can upload media assets for their company"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media-assets' AND
  (
    -- Ensure path starts with user's company_id
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR is_platform_admin(auth.uid())
  )
);

CREATE POLICY "Admins can delete their company media assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media-assets' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    )
    OR is_platform_admin(auth.uid())
  )
);

-- Drop existing overly permissive policies for operations-photos bucket
DROP POLICY IF EXISTS "Anyone can view operations photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload operations photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete operations photos" ON storage.objects;

-- Create company-isolated policies for operations-photos bucket
CREATE POLICY "Users can view their company operations photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'operations-photos' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR is_platform_admin(auth.uid())
  )
);

CREATE POLICY "Operations users can upload their company photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'operations-photos' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users 
      WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'operations')
    )
    OR is_platform_admin(auth.uid())
  )
);

CREATE POLICY "Admins can delete their company operations photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'operations-photos' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    )
    OR is_platform_admin(auth.uid())
  )
);

-- Update company-assets bucket policies for multi-tenant isolation
DROP POLICY IF EXISTS "Anyone can view company assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage company assets" ON storage.objects;

CREATE POLICY "Users can view their company assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'company-assets' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR is_platform_admin(auth.uid())
  )
);

CREATE POLICY "Admins can manage their company assets"
ON storage.objects FOR ALL
USING (
  bucket_id = 'company-assets' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    )
    OR is_platform_admin(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'company-assets' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'
    )
    OR is_platform_admin(auth.uid())
  )
);
