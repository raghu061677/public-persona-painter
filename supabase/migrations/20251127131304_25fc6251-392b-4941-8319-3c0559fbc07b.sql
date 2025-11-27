-- Add qr_code_url column to media_assets table
ALTER TABLE media_assets 
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Create storage bucket for QR codes if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-qr-codes', 'media-qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "QR codes are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload QR codes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update QR codes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete QR codes" ON storage.objects;

-- Set up storage policies for QR codes
CREATE POLICY "QR codes are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-qr-codes');

CREATE POLICY "Authenticated users can upload QR codes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media-qr-codes' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update QR codes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'media-qr-codes' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete QR codes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media-qr-codes' 
  AND auth.role() = 'authenticated'
);