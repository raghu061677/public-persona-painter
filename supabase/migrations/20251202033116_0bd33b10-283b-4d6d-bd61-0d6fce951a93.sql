-- Edge function to generate QR code for asset
CREATE OR REPLACE FUNCTION generate_asset_qr_code(asset_id_param text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  asset_url text;
  qr_code_url_result text;
BEGIN
  -- Build public asset URL
  asset_url := 'https://go-ads.app/asset/' || asset_id_param;
  
  -- For now, return a placeholder since we can't call external APIs from PL/pgSQL
  -- The actual QR generation will happen via edge function
  qr_code_url_result := 'https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=' || asset_url;
  
  RETURN qr_code_url_result;
END;
$$;

-- Trigger function to auto-generate QR code on asset creation
CREATE OR REPLACE FUNCTION auto_generate_qr_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only generate if latitude and longitude are present
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL AND NEW.qr_code_url IS NULL THEN
    NEW.qr_code_url := generate_asset_qr_code(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on media_assets INSERT
DROP TRIGGER IF EXISTS trigger_auto_generate_qr ON media_assets;
CREATE TRIGGER trigger_auto_generate_qr
  BEFORE INSERT ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_qr_code();

-- Also create trigger for UPDATE when coordinates are added
DROP TRIGGER IF EXISTS trigger_auto_generate_qr_on_update ON media_assets;
CREATE TRIGGER trigger_auto_generate_qr_on_update
  BEFORE UPDATE ON media_assets
  FOR EACH ROW
  WHEN (OLD.latitude IS NULL AND NEW.latitude IS NOT NULL AND NEW.qr_code_url IS NULL)
  EXECUTE FUNCTION auto_generate_qr_code();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_asset_qr_code TO authenticated;
GRANT EXECUTE ON FUNCTION auto_generate_qr_code TO authenticated;
