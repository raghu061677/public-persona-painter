-- Add power detail fields to media_assets table
ALTER TABLE media_assets
ADD COLUMN IF NOT EXISTS consumer_name TEXT,
ADD COLUMN IF NOT EXISTS service_number TEXT,
ADD COLUMN IF NOT EXISTS unique_service_number TEXT,
ADD COLUMN IF NOT EXISTS ero TEXT,
ADD COLUMN IF NOT EXISTS section_name TEXT;