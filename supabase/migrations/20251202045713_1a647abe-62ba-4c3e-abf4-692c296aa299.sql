-- Add new enum values to existing types (must be in separate transaction)

-- 1. Add new campaign_status values
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'Draft';
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'Upcoming';
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'Running';
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'Archived';

-- 2. Add new asset_installation_status values  
ALTER TYPE asset_installation_status ADD VALUE IF NOT EXISTS 'In Progress';
ALTER TYPE asset_installation_status ADD VALUE IF NOT EXISTS 'Installed';
ALTER TYPE asset_installation_status ADD VALUE IF NOT EXISTS 'QA Pending';
ALTER TYPE asset_installation_status ADD VALUE IF NOT EXISTS 'Completed';
ALTER TYPE asset_installation_status ADD VALUE IF NOT EXISTS 'Failed';

-- 3. Add new media_asset_status values
ALTER TYPE media_asset_status ADD VALUE IF NOT EXISTS 'Under Maintenance';
ALTER TYPE media_asset_status ADD VALUE IF NOT EXISTS 'Expired';