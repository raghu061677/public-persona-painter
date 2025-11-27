-- Add QR code URL field to media_assets table
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Create media-qr-codes storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-qr-codes',
  'media-qr-codes',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media-qr-codes bucket
CREATE POLICY "Public can view QR codes"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-qr-codes');

CREATE POLICY "Authenticated users can upload QR codes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-qr-codes' AND
  (
    is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM company_users
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('admin', 'operations', 'sales')
    )
  )
);

CREATE POLICY "Authenticated users can update QR codes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media-qr-codes' AND
  (
    is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM company_users
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('admin', 'operations')
    )
  )
);

CREATE POLICY "Admins can delete QR codes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media-qr-codes' AND
  (
    is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM company_users
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role = 'admin'
    )
  )
);

-- Add index for faster QR code lookups
CREATE INDEX IF NOT EXISTS idx_media_assets_qr_code_url ON media_assets(qr_code_url) WHERE qr_code_url IS NOT NULL;

-- Create function to auto-regenerate QR on location changes
CREATE OR REPLACE FUNCTION trigger_qr_regeneration()
RETURNS TRIGGER AS $$
BEGIN
  -- If location-related fields changed, clear QR code URL to trigger regeneration
  IF (
    NEW.latitude IS DISTINCT FROM OLD.latitude OR
    NEW.longitude IS DISTINCT FROM OLD.longitude OR
    NEW.google_street_view_url IS DISTINCT FROM OLD.google_street_view_url OR
    NEW.location_url IS DISTINCT FROM OLD.location_url
  ) THEN
    NEW.qr_code_url = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on media_assets
DROP TRIGGER IF EXISTS auto_clear_qr_on_location_change ON media_assets;
CREATE TRIGGER auto_clear_qr_on_location_change
  BEFORE UPDATE ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_qr_regeneration();