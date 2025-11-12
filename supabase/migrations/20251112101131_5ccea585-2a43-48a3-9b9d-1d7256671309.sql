-- Drop foreign key constraints temporarily
ALTER TABLE plan_items DROP CONSTRAINT IF EXISTS plan_items_asset_id_fkey;
ALTER TABLE campaign_assets DROP CONSTRAINT IF EXISTS campaign_assets_asset_id_fkey;
ALTER TABLE asset_maintenance DROP CONSTRAINT IF EXISTS asset_maintenance_asset_id_fkey;
ALTER TABLE asset_power_bills DROP CONSTRAINT IF EXISTS asset_power_bills_asset_id_fkey;
ALTER TABLE asset_expenses DROP CONSTRAINT IF EXISTS asset_expenses_asset_id_fkey;

-- Convert all BSQ to BQS in media_assets
UPDATE media_assets 
SET id = REPLACE(id, '-BSQ-', '-BQS-')
WHERE id LIKE '%-BSQ-%';

-- Convert all BSQ to BQS in related tables
UPDATE plan_items 
SET asset_id = REPLACE(asset_id, '-BSQ-', '-BQS-')
WHERE asset_id LIKE '%-BSQ-%';

UPDATE campaign_assets 
SET asset_id = REPLACE(asset_id, '-BSQ-', '-BQS-')
WHERE asset_id LIKE '%-BSQ-%';

UPDATE asset_power_bills 
SET asset_id = REPLACE(asset_id, '-BSQ-', '-BQS-')
WHERE asset_id LIKE '%-BSQ-%';

UPDATE asset_maintenance 
SET asset_id = REPLACE(asset_id, '-BSQ-', '-BQS-')
WHERE asset_id LIKE '%-BSQ-%';

UPDATE asset_expenses 
SET asset_id = REPLACE(asset_id, '-BSQ-', '-BQS-')
WHERE asset_id LIKE '%-BSQ-%';

-- Recreate foreign key constraints with ON UPDATE CASCADE
ALTER TABLE plan_items 
ADD CONSTRAINT plan_items_asset_id_fkey 
FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON UPDATE CASCADE;

ALTER TABLE campaign_assets 
ADD CONSTRAINT campaign_assets_asset_id_fkey 
FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON UPDATE CASCADE;

ALTER TABLE asset_maintenance 
ADD CONSTRAINT asset_maintenance_asset_id_fkey 
FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON UPDATE CASCADE;

ALTER TABLE asset_power_bills 
ADD CONSTRAINT asset_power_bills_asset_id_fkey 
FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON UPDATE CASCADE;

ALTER TABLE asset_expenses 
ADD CONSTRAINT asset_expenses_asset_id_fkey 
FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON UPDATE CASCADE;