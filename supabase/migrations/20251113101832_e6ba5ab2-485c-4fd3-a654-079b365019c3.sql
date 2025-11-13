-- Enhance asset_power_bills table with complete consumer details
ALTER TABLE IF EXISTS asset_power_bills
  ADD COLUMN IF NOT EXISTS consumer_name TEXT,
  ADD COLUMN IF NOT EXISTS service_number TEXT,
  ADD COLUMN IF NOT EXISTS ero_name TEXT,
  ADD COLUMN IF NOT EXISTS section_name TEXT,
  ADD COLUMN IF NOT EXISTS consumer_address TEXT,
  ADD COLUMN IF NOT EXISTS bill_date DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS energy_charges NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_charges NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arrears NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_asset_power_bills_asset_id ON asset_power_bills(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_power_bills_bill_date ON asset_power_bills(bill_date DESC);