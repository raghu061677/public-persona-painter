-- Add printing and installation fields to plan_items table
ALTER TABLE plan_items 
ADD COLUMN IF NOT EXISTS printing_mode text CHECK (printing_mode IN ('sqft', 'unit')) DEFAULT 'unit',
ADD COLUMN IF NOT EXISTS printing_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS printing_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS installation_mode text CHECK (installation_mode IN ('sqft', 'unit')) DEFAULT 'unit',
ADD COLUMN IF NOT EXISTS installation_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS installation_cost numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN plan_items.printing_mode IS 'Pricing mode for printing: sqft (per square foot) or unit (flat rate)';
COMMENT ON COLUMN plan_items.printing_rate IS 'Rate per sqft or flat rate depending on printing_mode';
COMMENT ON COLUMN plan_items.printing_cost IS 'Calculated printing cost based on mode and rate';
COMMENT ON COLUMN plan_items.installation_mode IS 'Pricing mode for installation: sqft (per square foot) or unit (flat rate)';
COMMENT ON COLUMN plan_items.installation_rate IS 'Rate per sqft or flat rate depending on installation_mode';
COMMENT ON COLUMN plan_items.installation_cost IS 'Calculated installation cost based on mode and rate';