-- Add address field to asset_power_bills table if not exists
ALTER TABLE asset_power_bills 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS bill_date date;

-- Update index for better query performance
CREATE INDEX IF NOT EXISTS idx_asset_power_bills_bill_month ON asset_power_bills(bill_month);
CREATE INDEX IF NOT EXISTS idx_asset_power_bills_payment_status ON asset_power_bills(payment_status);