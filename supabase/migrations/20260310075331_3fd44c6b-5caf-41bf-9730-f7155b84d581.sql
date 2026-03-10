-- Fix: Sync effective_end_date with booking_end_date where booking_end_date was edited
-- but effective_end_date was not updated (pre-fix records)
UPDATE campaign_assets
SET effective_end_date = booking_end_date
WHERE booking_end_date IS NOT NULL
  AND effective_end_date IS NOT NULL
  AND booking_end_date < effective_end_date;

-- Also sync effective_start_date from booking_start_date where out of sync
UPDATE campaign_assets
SET effective_start_date = booking_start_date
WHERE booking_start_date IS NOT NULL
  AND effective_start_date IS NOT NULL
  AND booking_start_date > effective_start_date;