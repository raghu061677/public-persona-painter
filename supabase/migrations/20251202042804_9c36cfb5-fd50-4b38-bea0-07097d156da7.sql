-- Ensure media_qr_codes storage bucket exists with public access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media_qr_codes',
  'media_qr_codes',
  true,
  1048576,
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to media_qr_codes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to media_qr_codes" ON storage.objects;

-- Allow authenticated users to upload QR codes
CREATE POLICY "Allow authenticated uploads to media_qr_codes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media_qr_codes');

-- Allow public read access to QR codes
CREATE POLICY "Allow public read access to media_qr_codes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media_qr_codes');