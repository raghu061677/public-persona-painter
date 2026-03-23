
-- Expand notifications category constraint to include 'data_quality'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS valid_category;
ALTER TABLE public.notifications ADD CONSTRAINT valid_category 
  CHECK (category IN ('general', 'campaign', 'client', 'asset', 'invoice', 'system', 'approval', 'data_quality'));
