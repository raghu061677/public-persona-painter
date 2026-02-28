
-- Add unmount approval fields to campaign_assets
ALTER TABLE public.campaign_assets
  ADD COLUMN IF NOT EXISTS unmount_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unmount_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unmount_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS unmount_approved_by text,
  ADD COLUMN IF NOT EXISTS unmounted_at timestamptz;
