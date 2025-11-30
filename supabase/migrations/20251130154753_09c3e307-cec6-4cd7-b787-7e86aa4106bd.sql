-- Add media_asset_code column to media_assets if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'media_assets' 
    AND column_name = 'media_asset_code'
  ) THEN
    ALTER TABLE public.media_assets 
    ADD COLUMN media_asset_code TEXT;
  END IF;
END $$;

-- Create media asset sequences table
CREATE TABLE IF NOT EXISTS public.media_asset_sequences (
  city TEXT NOT NULL,
  media_type TEXT NOT NULL,
  area TEXT NOT NULL,
  next_value INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (city, media_type, area)
);

-- Enable RLS
ALTER TABLE public.media_asset_sequences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read sequences"
  ON public.media_asset_sequences
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update sequences"
  ON public.media_asset_sequences
  FOR UPDATE
  TO authenticated
  USING (true);

-- Initialize sequences from existing assets
INSERT INTO public.media_asset_sequences (city, media_type, area, next_value)
SELECT DISTINCT 
  city, 
  media_type, 
  area,
  1 as next_value
FROM public.media_assets
WHERE city IS NOT NULL 
  AND media_type IS NOT NULL 
  AND area IS NOT NULL
ON CONFLICT (city, media_type, area) DO NOTHING;

-- Create function to generate new asset code
CREATE OR REPLACE FUNCTION public.generate_new_media_asset_code(
  p_city TEXT,
  p_media_type TEXT,
  p_area TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq INTEGER;
  v_normalized_area TEXT;
  v_code TEXT;
BEGIN
  -- Normalize area: uppercase and remove spaces
  v_normalized_area := UPPER(REPLACE(TRIM(p_area), ' ', ''));
  
  -- Insert or update sequence
  INSERT INTO public.media_asset_sequences (city, media_type, area, next_value)
  VALUES (p_city, p_media_type, p_area, 2)
  ON CONFLICT (city, media_type, area)
  DO UPDATE SET 
    next_value = media_asset_sequences.next_value + 1,
    updated_at = now()
  RETURNING next_value - 1 INTO v_seq;
  
  -- Build code: CITY-MEDIA_TYPE-AREA-XXXX
  v_code := 
    UPPER(p_city) || '-' ||
    UPPER(p_media_type) || '-' ||
    v_normalized_area || '-' ||
    LPAD(v_seq::TEXT, 4, '0');
  
  RETURN v_code;
END;
$$;

-- Backfill all existing media assets with new format
DO $$
DECLARE
  asset_record RECORD;
  new_code TEXT;
BEGIN
  FOR asset_record IN 
    SELECT id, city, media_type, area 
    FROM public.media_assets
    WHERE city IS NOT NULL 
      AND media_type IS NOT NULL 
      AND area IS NOT NULL
    ORDER BY created_at ASC
  LOOP
    new_code := public.generate_new_media_asset_code(
      asset_record.city,
      asset_record.media_type,
      asset_record.area
    );
    
    UPDATE public.media_assets
    SET media_asset_code = new_code
    WHERE id = asset_record.id;
  END LOOP;
END;
$$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_media_asset_code 
  ON public.media_assets(media_asset_code);

-- Add comments
COMMENT ON COLUMN public.media_assets.media_asset_code IS 'Standardized asset code in format CITY-MEDIA_TYPE-AREA-XXXX (e.g., HYD-BQS-KPHB-0024)';
COMMENT ON TABLE public.media_asset_sequences IS 'Manages sequential numbering for media asset codes';
COMMENT ON FUNCTION public.generate_new_media_asset_code IS 'Generates unique media asset code with auto-incrementing sequence';