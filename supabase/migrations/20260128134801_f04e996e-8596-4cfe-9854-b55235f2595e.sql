-- Add missing per-asset duration columns to campaign_assets
ALTER TABLE campaign_assets
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_assets_dates 
ON campaign_assets(campaign_id, start_date, end_date);

-- Backfill existing records: use booking_start_date/booking_end_date if available
UPDATE campaign_assets
SET 
  start_date = COALESCE(start_date, booking_start_date),
  end_date = COALESCE(end_date, booking_end_date)
WHERE start_date IS NULL OR end_date IS NULL;

-- For any still NULL, get dates from parent campaign
UPDATE campaign_assets ca
SET 
  start_date = COALESCE(ca.start_date, c.start_date),
  end_date = COALESCE(ca.end_date, c.end_date)
FROM campaigns c
WHERE ca.campaign_id = c.id
AND (ca.start_date IS NULL OR ca.end_date IS NULL);

-- Calculate booked_days for records that have dates but no booked_days
UPDATE campaign_assets
SET booked_days = GREATEST(1, (end_date - start_date + 1))
WHERE start_date IS NOT NULL 
AND end_date IS NOT NULL 
AND (booked_days IS NULL OR booked_days = 0);

-- Calculate daily_rate for records that have negotiated_rate but no daily_rate
UPDATE campaign_assets
SET daily_rate = ROUND((COALESCE(negotiated_rate, card_rate, 0) / 30.0)::numeric, 2)
WHERE daily_rate IS NULL OR daily_rate = 0;

-- Calculate rent_amount for records that have daily_rate and booked_days
UPDATE campaign_assets
SET rent_amount = ROUND((daily_rate * booked_days)::numeric, 2)
WHERE (rent_amount IS NULL OR rent_amount = 0)
AND daily_rate IS NOT NULL 
AND booked_days IS NOT NULL;