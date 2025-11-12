-- Add GPS tolerance and approval settings to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS gps_tolerance_meters INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS require_proof_approval BOOLEAN DEFAULT true;

COMMENT ON COLUMN organization_settings.gps_tolerance_meters IS 'Maximum distance in meters for GPS validation of geo-tagged photos';
COMMENT ON COLUMN organization_settings.require_proof_approval IS 'Whether proof photos require manager approval before marking as verified';