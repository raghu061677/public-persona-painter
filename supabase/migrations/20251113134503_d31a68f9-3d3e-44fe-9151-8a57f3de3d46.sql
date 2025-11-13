-- Add bill sharing fields to asset_power_bills table
ALTER TABLE asset_power_bills
ADD COLUMN IF NOT EXISTS is_primary_bill boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS shared_with_assets jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS share_percentage numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS primary_bill_id uuid REFERENCES asset_power_bills(id) ON DELETE CASCADE;

-- Add index for faster queries on shared bills
CREATE INDEX IF NOT EXISTS idx_asset_power_bills_usn ON asset_power_bills(unique_service_number);
CREATE INDEX IF NOT EXISTS idx_asset_power_bills_primary ON asset_power_bills(primary_bill_id);

COMMENT ON COLUMN asset_power_bills.is_primary_bill IS 'True if this is the master bill entry, false if it is a reference to a shared bill';
COMMENT ON COLUMN asset_power_bills.shared_with_assets IS 'JSON array of {asset_id, share_percentage} objects for assets sharing this power connection';
COMMENT ON COLUMN asset_power_bills.share_percentage IS 'Percentage of the bill allocated to this asset (0-100)';
COMMENT ON COLUMN asset_power_bills.primary_bill_id IS 'Reference to the primary bill if this is a shared bill entry';