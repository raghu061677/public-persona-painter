-- First, check if columns exist, then add the function
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='campaigns' AND column_name='public_tracking_token') THEN
    ALTER TABLE campaigns ADD COLUMN public_tracking_token uuid DEFAULT gen_random_uuid();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='campaigns' AND column_name='public_share_enabled') THEN
    ALTER TABLE campaigns ADD COLUMN public_share_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Now create the function
CREATE OR REPLACE FUNCTION match_campaign_token(p_token uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id
  FROM campaigns
  WHERE public_tracking_token = p_token
    AND public_share_enabled = true;
$$;

-- Add RLS policies for public access (read-only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'public_campaign_view' AND tablename = 'campaigns'
  ) THEN
    CREATE POLICY "public_campaign_view"
    ON campaigns
    FOR SELECT
    USING (public_share_enabled = true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'public_campaign_assets' AND tablename = 'campaign_assets'
  ) THEN
    CREATE POLICY "public_campaign_assets"
    ON campaign_assets
    FOR SELECT
    USING (
      campaign_id IN (
        SELECT id FROM campaigns 
        WHERE public_share_enabled = true
      )
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'public_operations' AND tablename = 'operations'
  ) THEN
    CREATE POLICY "public_operations"
    ON operations
    FOR SELECT
    USING (
      campaign_id IN (
        SELECT id FROM campaigns 
        WHERE public_share_enabled = true
      )
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'public_operation_photos' AND tablename = 'operation_photos'
  ) THEN
    CREATE POLICY "public_operation_photos"
    ON operation_photos
    FOR SELECT
    USING (
      operation_id IN (
        SELECT id FROM operations 
        WHERE campaign_id IN (
          SELECT id FROM campaigns 
          WHERE public_share_enabled = true
        )
      )
    );
  END IF;
END $$;