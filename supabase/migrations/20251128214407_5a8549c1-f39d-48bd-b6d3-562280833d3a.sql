-- Fix campaigns.status default to use correct enum value
-- The campaign_status enum uses PascalCase: 'Planned', 'Assigned', 'InProgress', etc.
-- NOT lowercase 'active'

ALTER TABLE campaigns 
ALTER COLUMN status DROP DEFAULT;

ALTER TABLE campaigns 
ALTER COLUMN status SET DEFAULT 'Planned'::campaign_status;
