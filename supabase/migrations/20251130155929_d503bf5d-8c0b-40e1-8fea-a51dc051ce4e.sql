-- Update the generate_new_media_asset_code function to use abbreviations

CREATE OR REPLACE FUNCTION public.generate_new_media_asset_code(
  p_city TEXT,
  p_media_type TEXT,
  p_area TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_seq INTEGER;
  v_city_code TEXT;
  v_type_code TEXT;
  v_normalized_area TEXT;
  v_code TEXT;
BEGIN
  -- Generate 3-letter city code (first 3 letters uppercase)
  v_city_code := UPPER(SUBSTRING(p_city, 1, 3));
  
  -- Map media type to abbreviation
  v_type_code := CASE 
    WHEN p_media_type ILIKE '%bus%shelter%' THEN 'BQS'
    WHEN p_media_type ILIKE '%unipole%' THEN 'UNI'
    WHEN p_media_type ILIKE '%gantry%' THEN 'GTY'
    WHEN p_media_type ILIKE '%billboard%' THEN 'BLB'
    WHEN p_media_type ILIKE '%hoarding%' THEN 'HRD'
    WHEN p_media_type ILIKE '%led%' OR p_media_type ILIKE '%digital%' THEN 'LED'
    WHEN p_media_type ILIKE '%pole%kiosk%' THEN 'PLK'
    WHEN p_media_type ILIKE '%wall%' THEN 'WAL'
    ELSE UPPER(SUBSTRING(REPLACE(p_media_type, ' ', ''), 1, 3))
  END;
  
  -- Normalize area: title case, remove extra spaces
  v_normalized_area := INITCAP(TRIM(REGEXP_REPLACE(p_area, '\s+', '', 'g')));
  
  -- Get and increment sequence
  INSERT INTO public.media_asset_sequences (city, media_type, area, next_value)
  VALUES (p_city, p_media_type, p_area, 2)
  ON CONFLICT (city, media_type, area)
  DO UPDATE SET 
    next_value = media_asset_sequences.next_value + 1,
    updated_at = now()
  RETURNING next_value - 1 INTO v_seq;
  
  -- Build code: CITY-TYPE-AREA-XXXX
  v_code := 
    v_city_code || '-' ||
    v_type_code || '-' ||
    v_normalized_area || '-' ||
    LPAD(v_seq::TEXT, 4, '0');
  
  RETURN v_code;
END;
$function$;

-- Reset sequences to start fresh with new format
TRUNCATE TABLE media_asset_sequences;

-- Re-initialize sequences
INSERT INTO media_asset_sequences (city, media_type, area, next_value)
SELECT DISTINCT city, media_type, area, 1
FROM media_assets
WHERE city IS NOT NULL AND media_type IS NOT NULL AND area IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill all existing assets with new abbreviated format
UPDATE media_assets
SET media_asset_code = generate_new_media_asset_code(city, media_type, area)
WHERE city IS NOT NULL AND media_type IS NOT NULL AND area IS NOT NULL;