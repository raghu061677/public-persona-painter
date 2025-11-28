-- Set campaigns.status default to 'active'
ALTER TABLE campaigns ALTER COLUMN status DROP DEFAULT;
ALTER TABLE campaigns ALTER COLUMN status SET DEFAULT 'active'::campaign_status;