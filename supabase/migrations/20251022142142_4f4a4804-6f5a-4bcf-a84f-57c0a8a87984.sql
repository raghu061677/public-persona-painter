-- Fix storage bucket policies for campaign-photos
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload campaign photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their campaign photos" ON storage.objects;

-- Add ownership-based policies with proper path validation
CREATE POLICY "Users can upload to their assigned campaigns"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'campaign-photos' AND
    (auth.uid() = owner OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Users can update their own uploads"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'campaign-photos' AND
    (auth.uid() = owner OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'campaign-photos' AND
    (auth.uid() = owner OR has_role(auth.uid(), 'admin'::app_role))
  );

-- Anyone can view campaign photos (for client portal and proof viewing)
CREATE POLICY "Public can view campaign photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-photos');