-- Create media_photos table for centralized photo management
CREATE TABLE IF NOT EXISTS public.media_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL,
  campaign_id text,
  client_id text,
  photo_url text NOT NULL,
  category text NOT NULL CHECK (category IN ('Mounting', 'Display', 'Proof', 'Monitoring', 'General')),
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_photos ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_photos_asset_id ON public.media_photos(asset_id);
CREATE INDEX IF NOT EXISTS idx_media_photos_campaign_id ON public.media_photos(campaign_id);
CREATE INDEX IF NOT EXISTS idx_media_photos_client_id ON public.media_photos(client_id);
CREATE INDEX IF NOT EXISTS idx_media_photos_category ON public.media_photos(category);
CREATE INDEX IF NOT EXISTS idx_media_photos_uploaded_at ON public.media_photos(uploaded_at DESC);

-- RLS Policies
CREATE POLICY "Anyone logged in can view photos"
  ON public.media_photos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized roles can upload photos"
  ON public.media_photos FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'operations'::app_role) OR
    has_role(auth.uid(), 'sales'::app_role)
  );

CREATE POLICY "Authorized roles can update photos"
  ON public.media_photos FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    uploaded_by = auth.uid()
  );

CREATE POLICY "Admins can delete photos"
  ON public.media_photos FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_media_photos_updated_at
  BEFORE UPDATE ON public.media_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();