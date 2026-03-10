
-- Backfill effective_start_date and effective_end_date for campaign_assets where they are NULL
-- This ensures the conflict check RPC uses correct dates for existing records
UPDATE campaign_assets
SET effective_start_date = COALESCE(booking_start_date, start_date),
    effective_end_date = COALESCE(booking_end_date, end_date)
WHERE effective_start_date IS NULL OR effective_end_date IS NULL;
