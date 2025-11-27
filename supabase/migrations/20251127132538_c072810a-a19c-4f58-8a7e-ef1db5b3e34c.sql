-- Add location_url column to media_assets table
-- This field is checked by the trigger_qr_regeneration trigger
ALTER TABLE public.media_assets 
ADD COLUMN IF NOT EXISTS location_url TEXT;