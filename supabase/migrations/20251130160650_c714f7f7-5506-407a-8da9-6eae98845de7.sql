-- Drop and recreate the table with correct structure
DROP TABLE IF EXISTS public.media_asset_sequences CASCADE;

-- Create media asset sequences table
CREATE TABLE public.media_asset_sequences (
  prefix TEXT NOT NULL DEFAULT 'MNS',
  city TEXT NOT NULL,
  media_type TEXT NOT NULL,
  next_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (prefix, city, media_type)
);

-- Enable RLS
ALTER TABLE public.media_asset_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read sequences"
  ON public.media_asset_sequences
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update sequences"
  ON public.media_asset_sequences
  FOR ALL
  TO authenticated
  USING (true);

-- Seed existing combinations from media_assets
INSERT INTO public.media_asset_sequences (prefix, city, media_type, next_value)
SELECT DISTINCT 
  'MNS',
  UPPER(SUBSTRING(city, 1, 3)),
  CASE 
    WHEN media_type ILIKE '%bus%shelter%' THEN 'BQS'
    WHEN media_type ILIKE '%billboard%' THEN 'BB'
    WHEN media_type ILIKE '%unipole%' THEN 'UNP'
    WHEN media_type ILIKE '%cantilever%' THEN 'CNT'
    ELSE UPPER(SUBSTRING(REPLACE(media_type, ' ', ''), 1, 3))
  END,
  1
FROM public.media_assets
WHERE city IS NOT NULL AND media_type IS NOT NULL
ON CONFLICT (prefix, city, media_type) DO NOTHING;

-- Create function to generate MNS codes
CREATE OR REPLACE FUNCTION public.generate_mns_code(
  p_city TEXT,
  p_media_type TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city_code TEXT;
  v_type_code TEXT;
  v_seq INTEGER;
  v_code TEXT;
BEGIN
  -- Generate 3-letter city code
  v_city_code := UPPER(SUBSTRING(p_city, 1, 3));
  
  -- Map media type to abbreviation
  v_type_code := CASE 
    WHEN p_media_type ILIKE '%bus%shelter%' THEN 'BQS'
    WHEN p_media_type ILIKE '%billboard%' THEN 'BB'
    WHEN p_media_type ILIKE '%unipole%' THEN 'UNP'
    WHEN p_media_type ILIKE '%cantilever%' THEN 'CNT'
    ELSE UPPER(SUBSTRING(REPLACE(p_media_type, ' ', ''), 1, 3))
  END;
  
  -- Get and increment sequence
  INSERT INTO public.media_asset_sequences (prefix, city, media_type, next_value)
  VALUES ('MNS', v_city_code, v_type_code, 2)
  ON CONFLICT (prefix, city, media_type)
  DO UPDATE SET 
    next_value = media_asset_sequences.next_value + 1,
    updated_at = now()
  RETURNING next_value - 1 INTO v_seq;
  
  -- Build code: MNS-CITY-TYPE-XXXX
  v_code := 'MNS-' || v_city_code || '-' || v_type_code || '-' || LPAD(v_seq::TEXT, 4, '0');
  
  RETURN v_code;
END;
$$;

-- Add media_asset_code column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'media_assets' 
    AND column_name = 'media_asset_code'
  ) THEN
    ALTER TABLE public.media_assets 
    ADD COLUMN media_asset_code TEXT;
    
    CREATE INDEX idx_media_assets_code ON public.media_assets(media_asset_code);
  END IF;
END $$;