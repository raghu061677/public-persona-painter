-- Check and fix the campaigns table status column default value
-- First, let's see what the actual default is
DO $$ 
BEGIN
  -- Drop the default if it exists and is invalid
  BEGIN
    ALTER TABLE campaigns ALTER COLUMN status DROP DEFAULT;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'No default to drop or error: %', SQLERRM;
  END;
  
  -- Set the correct default to 'Planned' which is a valid enum value
  ALTER TABLE campaigns ALTER COLUMN status SET DEFAULT 'Planned'::campaign_status;
  
  RAISE NOTICE 'Campaign status default set to Planned';
END $$;

-- Create a helper function to get enum values (for debugging)
CREATE OR REPLACE FUNCTION get_enum_values(enum_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(enumlabel ORDER BY enumsortorder)
  INTO result
  FROM pg_enum
  WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = enum_name
  );
  
  RETURN result;
END;
$$;

-- Verify the enum values for campaign_status
DO $$
DECLARE
  enum_vals jsonb;
BEGIN
  SELECT get_enum_values('campaign_status') INTO enum_vals;
  RAISE NOTICE 'Valid campaign_status enum values: %', enum_vals;
END $$;