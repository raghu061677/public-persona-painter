-- Add printing_rate_per_sqft and mounting_rate_per_sqft to campaign_assets if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaign_assets' 
    AND column_name = 'printing_rate_per_sqft'
  ) THEN
    ALTER TABLE campaign_assets ADD COLUMN printing_rate_per_sqft numeric NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaign_assets' 
    AND column_name = 'mounting_rate_per_sqft'
  ) THEN
    ALTER TABLE campaign_assets ADD COLUMN mounting_rate_per_sqft numeric NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaign_assets' 
    AND column_name = 'printing_cost'
  ) THEN
    ALTER TABLE campaign_assets ADD COLUMN printing_cost numeric NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaign_assets' 
    AND column_name = 'mounting_cost'
  ) THEN
    ALTER TABLE campaign_assets ADD COLUMN mounting_cost numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Also ensure plan_items has mounting_rate and mounting_cost columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plan_items' 
    AND column_name = 'mounting_rate'
  ) THEN
    ALTER TABLE plan_items ADD COLUMN mounting_rate numeric NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plan_items' 
    AND column_name = 'mounting_cost'
  ) THEN
    ALTER TABLE plan_items ADD COLUMN mounting_cost numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Backfill total_sqft from media_assets to campaign_assets where it's null or 0
UPDATE campaign_assets ca
SET total_sqft = ma.total_sqft
FROM media_assets ma
WHERE ca.asset_id = ma.id
AND (ca.total_sqft IS NULL OR ca.total_sqft = 0)
AND ma.total_sqft > 0;