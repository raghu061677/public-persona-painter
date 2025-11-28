-- Add new status values to existing plan_status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = 'plan_status'::regtype) THEN
    ALTER TYPE plan_status ADD VALUE 'pending';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'approved' AND enumtypid = 'plan_status'::regtype) THEN
    ALTER TYPE plan_status ADD VALUE 'approved';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'converted' AND enumtypid = 'plan_status'::regtype) THEN
    ALTER TYPE plan_status ADD VALUE 'converted';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = 'plan_status'::regtype) THEN
    ALTER TYPE plan_status ADD VALUE 'rejected';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new workflow tracking columns
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS converted_to_campaign_id TEXT,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Add foreign key for converted_to_campaign_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_converted_campaign'
  ) THEN
    ALTER TABLE plans 
    ADD CONSTRAINT fk_converted_campaign 
    FOREIGN KEY (converted_to_campaign_id) 
    REFERENCES campaigns(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster status filtering
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);