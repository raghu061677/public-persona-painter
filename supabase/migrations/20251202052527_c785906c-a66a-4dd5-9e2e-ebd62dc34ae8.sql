-- Add missing snapshot pricing columns to campaign_assets
ALTER TABLE campaign_assets 
ADD COLUMN IF NOT EXISTS negotiated_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS dimensions text,
ADD COLUMN IF NOT EXISTS total_sqft numeric,
ADD COLUMN IF NOT EXISTS direction text,
ADD COLUMN IF NOT EXISTS illumination_type text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS municipal_authority text,
ADD COLUMN IF NOT EXISTS municipal_id text,
ADD COLUMN IF NOT EXISTS booking_start_date date,
ADD COLUMN IF NOT EXISTS booking_end_date date;

-- Add missing financial totals to campaigns table
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS printing_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS mounting_total numeric DEFAULT 0;

COMMENT ON COLUMN campaign_assets.negotiated_rate IS 'Snapshot of negotiated/sales price from plan_items';
COMMENT ON COLUMN campaign_assets.total_price IS 'Snapshot of total item price including GST from plan_items';
COMMENT ON COLUMN campaign_assets.booking_start_date IS 'When this asset booking starts for this campaign';
COMMENT ON COLUMN campaign_assets.booking_end_date IS 'When this asset booking ends for this campaign';