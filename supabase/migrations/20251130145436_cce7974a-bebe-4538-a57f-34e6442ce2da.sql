-- Fix the trigger_qr_regeneration function to remove non-existent location_url field
CREATE OR REPLACE FUNCTION public.trigger_qr_regeneration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If location-related fields changed, clear QR code URL to trigger regeneration
  IF (
    NEW.latitude IS DISTINCT FROM OLD.latitude OR
    NEW.longitude IS DISTINCT FROM OLD.longitude OR
    NEW.google_street_view_url IS DISTINCT FROM OLD.google_street_view_url
  ) THEN
    NEW.qr_code_url = NULL;
  END IF;
  RETURN NEW;
END;
$function$;