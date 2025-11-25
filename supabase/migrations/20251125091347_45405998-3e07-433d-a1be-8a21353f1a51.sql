-- Ensure storage buckets exist and are configured correctly
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('media-assets', 'media-assets', true),
  ('hero-images', 'hero-images', true)
ON CONFLICT (id) 
DO UPDATE SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access to media-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to hero-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to media-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to hero-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update media-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update hero-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete media-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete hero-images" ON storage.objects;

-- Create policies for public read access to media-assets bucket
CREATE POLICY "Public Access to media-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-assets');

-- Create policies for public read access to hero-images bucket
CREATE POLICY "Public Access to hero-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'hero-images');

-- Create policies for authenticated users to upload
CREATE POLICY "Authenticated users can upload to media-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media-assets');

CREATE POLICY "Authenticated users can upload to hero-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'hero-images');

-- Create policies for authenticated users to update
CREATE POLICY "Authenticated users can update media-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media-assets');

CREATE POLICY "Authenticated users can update hero-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'hero-images');

-- Create policies for authenticated users to delete
CREATE POLICY "Authenticated users can delete media-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media-assets');

CREATE POLICY "Authenticated users can delete hero-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'hero-images');