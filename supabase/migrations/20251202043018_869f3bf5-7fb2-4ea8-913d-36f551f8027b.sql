-- Add direct campaign creation support columns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS created_from text DEFAULT 'plan',
ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS printing_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS mounting_total numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN campaigns.created_from IS 'Source of campaign creation: plan (from approved plan) or direct (created directly without plan)';

-- Create index for filtering by creation source
CREATE INDEX IF NOT EXISTS idx_campaigns_created_from ON campaigns(created_from);