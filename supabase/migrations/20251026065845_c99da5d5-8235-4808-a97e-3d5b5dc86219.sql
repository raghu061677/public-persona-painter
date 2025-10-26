-- Add discount fields to plan_items table
ALTER TABLE plan_items
ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'Percent',
ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN plan_items.discount_type IS 'Type of discount: Percent or Flat';
COMMENT ON COLUMN plan_items.discount_value IS 'Discount value (percentage or flat amount)';
COMMENT ON COLUMN plan_items.discount_amount IS 'Calculated discount amount in currency';
