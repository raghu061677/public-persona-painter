-- Fix security warnings: Set search_path for functions
CREATE OR REPLACE FUNCTION generate_asset_qr_code(asset_id_param text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Trigger function with search_path set
CREATE OR REPLACE FUNCTION auto_generate_qr_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if latitude and longitude are present
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL AND NEW.qr_code_url IS NULL THEN
    NEW.qr_code_url := generate_asset_qr_code(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;
