-- Fix function search path for update_inquiry_timestamp
DROP FUNCTION IF EXISTS update_inquiry_timestamp CASCADE;

CREATE OR REPLACE FUNCTION update_inquiry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_inquiries 
  SET updated_at = now() 
  WHERE id = NEW.inquiry_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER update_inquiry_on_asset_add
  AFTER INSERT ON marketplace_inquiry_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiry_timestamp();