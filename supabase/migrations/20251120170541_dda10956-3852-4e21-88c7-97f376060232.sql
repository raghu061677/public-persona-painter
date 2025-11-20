-- Create junction table for marketplace inquiries with multiple assets
CREATE TABLE IF NOT EXISTS marketplace_inquiry_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES marketplace_inquiries(id) ON DELETE CASCADE,
  asset_id text NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(inquiry_id, asset_id)
);

-- Add indexes for performance
CREATE INDEX idx_marketplace_inquiry_assets_inquiry ON marketplace_inquiry_assets(inquiry_id);
CREATE INDEX idx_marketplace_inquiry_assets_asset ON marketplace_inquiry_assets(asset_id);

-- Enable RLS
ALTER TABLE marketplace_inquiry_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow insert for authenticated users and select for company owners
CREATE POLICY "Anyone can create inquiry assets"
  ON marketplace_inquiry_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Company users can view their inquiry assets"
  ON marketplace_inquiry_assets
  FOR SELECT
  TO authenticated
  USING (
    inquiry_id IN (
      SELECT id FROM marketplace_inquiries 
      WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );

-- Add a trigger to update marketplace_inquiries.updated_at when assets are added
CREATE OR REPLACE FUNCTION update_inquiry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_inquiries 
  SET updated_at = now() 
  WHERE id = NEW.inquiry_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inquiry_on_asset_add
  AFTER INSERT ON marketplace_inquiry_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiry_timestamp();