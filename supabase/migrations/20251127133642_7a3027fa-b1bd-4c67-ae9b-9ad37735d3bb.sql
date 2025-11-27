-- Create storage bucket for asset QR codes if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-qrcodes', 'asset-qrcodes', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read asset QR codes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload asset QR codes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update asset QR codes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete asset QR codes" ON storage.objects;

-- Create storage policies for asset-qrcodes bucket
CREATE POLICY "Public read asset QR codes"
ON storage.objects FOR SELECT
USING (bucket_id = 'asset-qrcodes');

CREATE POLICY "Authenticated upload asset QR codes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'asset-qrcodes');

CREATE POLICY "Authenticated update asset QR codes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'asset-qrcodes');

CREATE POLICY "Authenticated delete asset QR codes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'asset-qrcodes');

-- Function to generate QR for a single asset (called by trigger)
CREATE OR REPLACE FUNCTION generate_single_asset_qr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger if qr_code_url is NULL and we have location data
  IF NEW.qr_code_url IS NULL AND (
    NEW.latitude IS NOT NULL OR 
    NEW.longitude IS NOT NULL OR 
    NEW.google_street_view_url IS NOT NULL OR
    NEW.location_url IS NOT NULL
  ) THEN
    -- The actual QR generation will be handled by the Edge Function
    -- This trigger just marks the asset as needing QR generation
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate QR on INSERT
DROP TRIGGER IF EXISTS auto_generate_qr_on_insert ON media_assets;
CREATE TRIGGER auto_generate_qr_on_insert
  AFTER INSERT ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION generate_single_asset_qr();