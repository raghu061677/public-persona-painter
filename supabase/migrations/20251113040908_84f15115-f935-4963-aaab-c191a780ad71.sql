-- Create operations_photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'operations-photos',
  'operations-photos', 
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for operations_photos bucket
CREATE POLICY "Authenticated users can upload operations photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'operations-photos');

CREATE POLICY "Anyone can view operations photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'operations-photos');

CREATE POLICY "Admins can delete operations photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'operations-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create operations_photos table
CREATE TABLE IF NOT EXISTS operations_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL,
  asset_id text NOT NULL,
  tag text NOT NULL CHECK (tag IN ('Traffic', 'Newspaper', 'Geo-Tagged', 'Other')),
  photo_url text NOT NULL,
  latitude numeric,
  longitude numeric,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id),
  validation_score numeric,
  validation_issues jsonb DEFAULT '[]'::jsonb,
  validation_suggestions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_operations_photos_campaign ON operations_photos(campaign_id);
CREATE INDEX IF NOT EXISTS idx_operations_photos_asset ON operations_photos(asset_id);
CREATE INDEX IF NOT EXISTS idx_operations_photos_tag ON operations_photos(tag);
CREATE INDEX IF NOT EXISTS idx_operations_photos_uploaded ON operations_photos(uploaded_at DESC);

-- Enable RLS
ALTER TABLE operations_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for operations_photos table
CREATE POLICY "Authenticated users can view operations photos"
ON operations_photos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can upload operations photos"
ON operations_photos
FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admins can delete operations photos"
ON operations_photos
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update operations photos"
ON operations_photos
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_operations_photos_updated_at
  BEFORE UPDATE ON operations_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();