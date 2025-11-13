-- Create media-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-assets', 'media-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for media-assets bucket
CREATE POLICY "Public can view media assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media-assets');

CREATE POLICY "Authenticated users can upload media assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media-assets');

CREATE POLICY "Authenticated users can update their media assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'media-assets');

CREATE POLICY "Admins can delete media assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media-assets' 
  AND has_role(auth.uid(), 'admin'::app_role)
);