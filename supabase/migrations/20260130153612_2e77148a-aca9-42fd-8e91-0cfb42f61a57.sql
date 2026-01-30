-- Add one-time billing tracking fields to campaign_assets
ALTER TABLE public.campaign_assets 
ADD COLUMN IF NOT EXISTS printing_billed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mounting_billed BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.campaign_assets.printing_billed IS 'True if printing charges have been invoiced for this asset';
COMMENT ON COLUMN public.campaign_assets.mounting_billed IS 'True if mounting charges have been invoiced for this asset';