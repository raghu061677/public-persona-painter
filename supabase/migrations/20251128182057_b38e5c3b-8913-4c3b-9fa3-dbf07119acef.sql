-- Add 'Booked' status to media_asset_status enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'Booked' 
    AND enumtypid = 'media_asset_status'::regtype
  ) THEN
    ALTER TYPE media_asset_status ADD VALUE 'Booked';
  END IF;
END $$;

-- Add booking fields to media_assets for asset booking logic
ALTER TABLE media_assets 
ADD COLUMN IF NOT EXISTS booked_from DATE,
ADD COLUMN IF NOT EXISTS booked_to DATE,
ADD COLUMN IF NOT EXISTS current_campaign_id TEXT REFERENCES campaigns(id);

-- Create index for efficient overlap checking
CREATE INDEX IF NOT EXISTS idx_media_assets_booking 
ON media_assets(booked_from, booked_to) 
WHERE status = 'Booked'::media_asset_status;

-- Add campaign_items table for tracking campaign line items with proper pricing
CREATE TABLE IF NOT EXISTS campaign_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  plan_item_id UUID REFERENCES plan_items(id),
  asset_id TEXT NOT NULL REFERENCES media_assets(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  card_rate NUMERIC NOT NULL DEFAULT 0,
  negotiated_rate NUMERIC NOT NULL DEFAULT 0,
  printing_charge NUMERIC NOT NULL DEFAULT 0,
  mounting_charge NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for campaign_items
ALTER TABLE campaign_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaign items" ON campaign_items
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE company_id = get_current_user_company_id()
    ) OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can insert campaign items" ON campaign_items
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE company_id = get_current_user_company_id()
    ) OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can update campaign items" ON campaign_items
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE company_id = get_current_user_company_id()
    ) OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can delete campaign items" ON campaign_items
  FOR DELETE USING (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE company_id = get_current_user_company_id()
    ) OR is_platform_admin(auth.uid())
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_campaign_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_items_updated_at ON campaign_items;
CREATE TRIGGER campaign_items_updated_at
  BEFORE UPDATE ON campaign_items
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_items_updated_at();