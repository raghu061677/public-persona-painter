-- Create organization_settings table for branding
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text DEFAULT 'Go-Ads 360°',
  logo_url text,
  hero_image_url text,
  primary_color text DEFAULT '#1e40af',
  secondary_color text DEFAULT '#10b981',
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view organization settings"
  ON public.organization_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update organization settings"
  ON public.organization_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert organization settings"
  ON public.organization_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default organization settings (only if table is empty)
INSERT INTO public.organization_settings (organization_name)
SELECT 'Go-Ads 360°'
WHERE NOT EXISTS (SELECT 1 FROM public.organization_settings);

-- Create storage buckets for branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('logos', 'logos', true),
  ('hero-images', 'hero-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for logos bucket
CREATE POLICY "Anyone can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Admins can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Storage RLS policies for hero-images bucket
CREATE POLICY "Anyone can view hero images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hero-images');

CREATE POLICY "Admins can upload hero images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'hero-images' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update hero images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'hero-images' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete hero images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'hero-images' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Update trigger for organization_settings
CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();