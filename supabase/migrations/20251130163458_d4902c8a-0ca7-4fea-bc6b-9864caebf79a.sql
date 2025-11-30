-- Fix the generate_single_asset_qr function to remove location_url reference
CREATE OR REPLACE FUNCTION public.generate_single_asset_qr()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger if qr_code_url is NULL and we have location data
  IF NEW.qr_code_url IS NULL AND (
    NEW.latitude IS NOT NULL OR 
    NEW.longitude IS NOT NULL OR 
    NEW.google_street_view_url IS NOT NULL
  ) THEN
    -- The actual QR generation will be handled by the Edge Function
    -- This trigger just marks the asset as needing QR generation
    NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;