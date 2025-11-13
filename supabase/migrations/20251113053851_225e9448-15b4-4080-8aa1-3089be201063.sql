-- Create photo_tags table for custom tag management
CREATE TABLE IF NOT EXISTS photo_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT '#6b7280',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  usage_count integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;

-- Policies for photo_tags
CREATE POLICY "Authenticated users can view tags"
  ON photo_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON photo_tags FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own tags"
  ON photo_tags FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all tags"
  ON photo_tags FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Add tags array to operations_photos for multiple tags
ALTER TABLE operations_photos 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Update existing tags to array format
UPDATE operations_photos 
SET tags = ARRAY[tag]
WHERE tag IS NOT NULL AND tags = '{}';

-- Create index for tag searches
CREATE INDEX IF NOT EXISTS idx_operations_photos_tags ON operations_photos USING GIN(tags);

-- Add custom_tags to media_assets images jsonb
COMMENT ON COLUMN media_assets.images IS 'Photo data with tags: {photos: [{url, tag, tags[], uploaded_at, latitude, longitude}]}';