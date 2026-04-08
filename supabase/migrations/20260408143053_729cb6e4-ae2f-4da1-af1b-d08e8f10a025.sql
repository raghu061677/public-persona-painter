-- Create enum for operational status
CREATE TYPE public.asset_operational_status AS ENUM ('active', 'inactive', 'removed', 'maintenance');

-- Add columns
ALTER TABLE public.media_assets 
  ADD COLUMN operational_status public.asset_operational_status NOT NULL DEFAULT 'active',
  ADD COLUMN deactivation_reason TEXT NULL;

-- Backfill: if is_active was false, mark as inactive
UPDATE public.media_assets SET operational_status = 'inactive' WHERE is_active = false;

-- Index for filtering
CREATE INDEX idx_media_assets_operational_status ON public.media_assets (operational_status);