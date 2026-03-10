
-- Normalize legacy campaign_assets.status values to canonical statuses
-- Canonical: Pending, Assigned, Installed, Completed, Verified

UPDATE campaign_assets
SET status = 'Installed'
WHERE trim(coalesce(status::text, '')) IN ('Mounted', 'mounted', 'In Progress');

UPDATE campaign_assets
SET status = 'Completed'
WHERE trim(coalesce(status::text, '')) IN ('PhotoUploaded', 'photo_uploaded', 'photo uploaded', 'QA Pending');

UPDATE campaign_assets
SET status = 'Pending'
WHERE trim(coalesce(status::text, '')) IN ('pending');

UPDATE campaign_assets
SET status = 'Assigned'
WHERE trim(coalesce(status::text, '')) IN ('assigned');

UPDATE campaign_assets
SET status = 'Installed'
WHERE trim(coalesce(status::text, '')) IN ('installed');

UPDATE campaign_assets
SET status = 'Completed'
WHERE trim(coalesce(status::text, '')) IN ('completed');

UPDATE campaign_assets
SET status = 'Verified'
WHERE trim(coalesce(status::text, '')) IN ('verified');

UPDATE campaign_assets
SET status = 'Pending'
WHERE status IS NULL OR trim(status::text) = '';

-- Set default
ALTER TABLE campaign_assets
ALTER COLUMN status SET DEFAULT 'Pending';
