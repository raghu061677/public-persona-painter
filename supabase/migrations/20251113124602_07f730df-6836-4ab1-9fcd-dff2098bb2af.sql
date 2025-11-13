-- Add acd_amount column to asset_power_bills table
ALTER TABLE asset_power_bills 
ADD COLUMN IF NOT EXISTS acd_amount NUMERIC DEFAULT 0;