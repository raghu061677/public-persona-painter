
-- Add non-destructive drop fields to campaign_assets
ALTER TABLE public.campaign_assets 
  ADD COLUMN IF NOT EXISTS is_removed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dropped_on date,
  ADD COLUMN IF NOT EXISTS drop_reason text,
  ADD COLUMN IF NOT EXISTS effective_start_date date,
  ADD COLUMN IF NOT EXISTS effective_end_date date,
  ADD COLUMN IF NOT EXISTS billing_override_amount numeric,
  ADD COLUMN IF NOT EXISTS billing_mode_override text;

-- Backfill effective dates from existing booking dates
UPDATE public.campaign_assets 
SET 
  effective_start_date = COALESCE(booking_start_date::date, start_date::date),
  effective_end_date = COALESCE(booking_end_date::date, end_date::date)
WHERE effective_start_date IS NULL;

-- Add index for availability queries filtering out removed assets
CREATE INDEX IF NOT EXISTS idx_campaign_assets_active 
  ON public.campaign_assets (asset_id, effective_start_date, effective_end_date) 
  WHERE is_removed = false;
