
-- Add removal classification fields to campaign_assets
ALTER TABLE public.campaign_assets
  ADD COLUMN IF NOT EXISTS removal_type text NULL,
  ADD COLUMN IF NOT EXISTS removal_notes text NULL,
  ADD COLUMN IF NOT EXISTS replacement_asset_id uuid NULL;

-- Add check constraint for allowed removal_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaign_assets_removal_type_check'
  ) THEN
    ALTER TABLE public.campaign_assets
      ADD CONSTRAINT campaign_assets_removal_type_check
      CHECK (removal_type IS NULL OR removal_type IN (
        'client_drop', 'admin_removed', 'damaged', 'maintenance',
        'authority_issue', 'site_removed', 'replacement', 'other'
      ));
  END IF;
END $$;

-- Add check constraint for billing_mode_override to include 'waived'
-- First drop the old constraint if it exists, then add the updated one
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaign_assets_billing_mode_override_check'
  ) THEN
    ALTER TABLE public.campaign_assets DROP CONSTRAINT campaign_assets_billing_mode_override_check;
  END IF;
  
  ALTER TABLE public.campaign_assets
    ADD CONSTRAINT campaign_assets_billing_mode_override_check
    CHECK (billing_mode_override IS NULL OR billing_mode_override IN (
      'prorated', 'full_term', 'manual_override', 'waived'
    ));
END $$;
