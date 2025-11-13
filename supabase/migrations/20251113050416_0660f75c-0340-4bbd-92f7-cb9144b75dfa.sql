-- Create photo_favorites table
CREATE TABLE IF NOT EXISTS photo_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  photo_id uuid REFERENCES operations_photos(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, photo_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_photo_favorites_user_id ON photo_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_favorites_photo_id ON photo_favorites(photo_id);

-- Enable RLS
ALTER TABLE photo_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own favorites"
  ON photo_favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add their own favorites"
  ON photo_favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own favorites"
  ON photo_favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime for operations_photos
ALTER TABLE operations_photos REPLICA IDENTITY FULL;

-- Add publications for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE operations_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE photo_favorites;