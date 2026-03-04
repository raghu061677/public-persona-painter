ALTER TABLE public.concession_contracts 
ADD COLUMN IF NOT EXISTS asset_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_inclusive boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS gst_percent numeric DEFAULT 18,
ADD COLUMN IF NOT EXISTS rcm_applicable boolean DEFAULT true;