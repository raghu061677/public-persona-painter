-- Create enum for media asset status
CREATE TYPE public.media_asset_status AS ENUM ('Available', 'Booked', 'Blocked', 'Maintenance');

-- Create enum for media category
CREATE TYPE public.media_category AS ENUM ('OOH', 'DOOH', 'Transit');

-- Create enum for ownership type
CREATE TYPE public.ownership_type AS ENUM ('own', 'rented');

-- Create media_assets table
CREATE TABLE public.media_assets (
  id TEXT PRIMARY KEY,
  media_type TEXT NOT NULL,
  media_id TEXT,
  status media_asset_status NOT NULL DEFAULT 'Available',
  category media_category NOT NULL DEFAULT 'OOH',
  location TEXT NOT NULL,
  area TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  state TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  direction TEXT,
  google_street_view_url TEXT,
  dimensions TEXT NOT NULL,
  total_sqft INTEGER,
  illumination TEXT,
  is_multi_face BOOLEAN DEFAULT false,
  faces JSONB DEFAULT '[]',
  card_rate DECIMAL(12, 2) NOT NULL,
  base_rent DECIMAL(12, 2),
  base_margin DECIMAL(5, 2),
  gst_percent DECIMAL(5, 2) DEFAULT 18,
  printing_charges DECIMAL(12, 2),
  mounting_charges DECIMAL(12, 2),
  concession_fee DECIMAL(12, 2),
  ad_tax DECIMAL(12, 2),
  electricity DECIMAL(12, 2),
  maintenance DECIMAL(12, 2),
  ownership ownership_type DEFAULT 'own',
  municipal_authority TEXT,
  vendor_details JSONB DEFAULT '{}',
  images JSONB DEFAULT '{}',
  image_urls TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  search_tokens TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_media_assets_city_status ON public.media_assets(city, status);
CREATE INDEX idx_media_assets_area_status ON public.media_assets(area, status);
CREATE INDEX idx_media_assets_media_type_status ON public.media_assets(media_type, status);
CREATE INDEX idx_media_assets_search_tokens ON public.media_assets USING GIN(search_tokens);
CREATE INDEX idx_media_assets_location ON public.media_assets(latitude, longitude);

-- RLS Policies
-- Authenticated users can read all media assets
CREATE POLICY "Authenticated users can view media assets"
  ON public.media_assets
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert media assets
CREATE POLICY "Admins can insert media assets"
  ON public.media_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update media assets
CREATE POLICY "Admins can update media assets"
  ON public.media_assets
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete media assets
CREATE POLICY "Admins can delete media assets"
  ON public.media_assets
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();