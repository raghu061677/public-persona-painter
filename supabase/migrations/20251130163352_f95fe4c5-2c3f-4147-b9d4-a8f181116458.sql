-- Drop and recreate the trigger for QR code generation without location_url dependency
-- First, let's see what triggers exist on media_assets
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tgname, proname 
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE tgrelid = 'media_assets'::regclass
  LOOP
    RAISE NOTICE 'Trigger: %, Function: %', r.tgname, r.proname;
  END LOOP;
END $$;

-- Check if there's a QR code generation trigger
DROP TRIGGER IF EXISTS generate_qr_code_trigger ON media_assets;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS generate_asset_qr_code_on_insert() CASCADE;

-- The QR code generation should be handled by the application, not by a database trigger
-- So we're just removing any problematic triggers that reference location_url