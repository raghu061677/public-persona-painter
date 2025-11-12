-- Add missing columns to asset_power_bills table for detailed bill tracking
ALTER TABLE asset_power_bills 
ADD COLUMN IF NOT EXISTS units numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_month_bill numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS acd_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS arrears numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_due numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS due_date date,
ADD COLUMN IF NOT EXISTS area text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS direction text,
ADD COLUMN IF NOT EXISTS payment_link text;

-- Create index for faster queries on bill_month for analytics
CREATE INDEX IF NOT EXISTS idx_asset_power_bills_bill_month ON asset_power_bills(bill_month DESC);
CREATE INDEX IF NOT EXISTS idx_asset_power_bills_asset_bill_month ON asset_power_bills(asset_id, bill_month DESC);