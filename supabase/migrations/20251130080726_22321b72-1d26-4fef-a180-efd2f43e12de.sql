-- Migration: Cleanup status enums with default handling
-- This migration normalizes existing bad enum values and rebuilds enums without deprecated values

-- 1. Normalize existing bad values for campaign_status
UPDATE campaigns
SET status = 'InProgress'
WHERE status::text = 'active';

-- 2. Normalize existing bad values for plan_status
UPDATE plans
SET status = 'Draft'
WHERE status::text = 'pending';

UPDATE plans
SET status = 'Approved'
WHERE status::text = 'approved';

UPDATE plans
SET status = 'Converted'
WHERE status::text = 'converted';

UPDATE plans
SET status = 'Rejected'
WHERE status::text = 'rejected';

-- 3. Rebuild campaign_status enum WITHOUT 'active'
-- First drop the default to allow type change
ALTER TABLE campaigns ALTER COLUMN status DROP DEFAULT;

ALTER TYPE campaign_status RENAME TO campaign_status_old;

CREATE TYPE campaign_status AS ENUM (
  'Planned',
  'Assigned',
  'InProgress',
  'PhotoUploaded',
  'Verified',
  'Completed',
  'Cancelled'
);

ALTER TABLE campaigns
  ALTER COLUMN status TYPE campaign_status
  USING status::text::campaign_status;

-- Restore default with new enum value
ALTER TABLE campaigns ALTER COLUMN status SET DEFAULT 'Planned'::campaign_status;

DROP TYPE campaign_status_old;

-- 4. Rebuild plan_status enum WITHOUT lowercase duplicates
-- First drop the default to allow type change
ALTER TABLE plans ALTER COLUMN status DROP DEFAULT;

ALTER TYPE plan_status RENAME TO plan_status_old;

CREATE TYPE plan_status AS ENUM (
  'Draft',
  'Sent',
  'Approved',
  'Rejected',
  'Converted'
);

ALTER TABLE plans
  ALTER COLUMN status TYPE plan_status
  USING status::text::plan_status;

-- Restore default with new enum value
ALTER TABLE plans ALTER COLUMN status SET DEFAULT 'Draft'::plan_status;

DROP TYPE plan_status_old;