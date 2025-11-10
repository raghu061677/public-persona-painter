-- Add payment tracking fields to asset_power_bills
ALTER TABLE asset_power_bills 
ADD COLUMN IF NOT EXISTS paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS paid_receipt_url text;

-- Add bill reference fields to expenses
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS bill_id uuid REFERENCES asset_power_bills(id),
ADD COLUMN IF NOT EXISTS bill_month text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expenses_bill_id ON expenses(bill_id);
CREATE INDEX IF NOT EXISTS idx_asset_power_bills_paid ON asset_power_bills(paid);
