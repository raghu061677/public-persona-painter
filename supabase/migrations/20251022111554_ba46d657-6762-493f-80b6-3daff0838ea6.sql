-- Create enum for campaign status
CREATE TYPE public.campaign_status AS ENUM ('Planned', 'Assigned', 'InProgress', 'PhotoUploaded', 'Verified', 'Completed');

-- Create enum for asset installation status
CREATE TYPE public.asset_installation_status AS ENUM ('Pending', 'Assigned', 'Mounted', 'PhotoUploaded', 'Verified');

-- Create campaigns table
CREATE TABLE public.campaigns (
  id TEXT PRIMARY KEY,
  plan_id TEXT REFERENCES public.plans(id),
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status campaign_status NOT NULL DEFAULT 'Planned',
  total_assets INTEGER DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  gst_percent DECIMAL(5, 2) NOT NULL,
  gst_amount DECIMAL(12, 2) NOT NULL,
  grand_total DECIMAL(12, 2) NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create campaign_assets table
CREATE TABLE public.campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  asset_id TEXT REFERENCES public.media_assets(id) NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  media_type TEXT NOT NULL,
  card_rate DECIMAL(12, 2) NOT NULL,
  mounting_charges DECIMAL(12, 2) DEFAULT 0,
  printing_charges DECIMAL(12, 2) DEFAULT 0,
  status asset_installation_status NOT NULL DEFAULT 'Pending',
  mounter_name TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  photos JSONB DEFAULT '{}',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_campaigns_plan_id ON public.campaigns(plan_id);
CREATE INDEX idx_campaigns_client_id ON public.campaigns(client_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_start_date ON public.campaigns(start_date DESC);
CREATE INDEX idx_campaign_assets_campaign_id ON public.campaign_assets(campaign_id);
CREATE INDEX idx_campaign_assets_asset_id ON public.campaign_assets(asset_id);
CREATE INDEX idx_campaign_assets_status ON public.campaign_assets(status);

-- RLS Policies for campaigns
CREATE POLICY "Authenticated users can view campaigns"
  ON public.campaigns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert campaigns"
  ON public.campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update campaigns"
  ON public.campaigns
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete campaigns"
  ON public.campaigns
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for campaign_assets
CREATE POLICY "Authenticated users can view campaign assets"
  ON public.campaign_assets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert campaign assets"
  ON public.campaign_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update campaign assets"
  ON public.campaign_assets
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete campaign assets"
  ON public.campaign_assets
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate campaign ID
CREATE OR REPLACE FUNCTION public.generate_campaign_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  current_month TEXT;
  next_seq INTEGER;
  new_id TEXT;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  current_month := to_char(CURRENT_DATE, 'Month');
  current_month := trim(current_month);
  
  -- Get next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(id FROM 'CAM-[0-9]{4}-[A-Za-z]+-([0-9]+)$') 
      AS INTEGER
    )
  ), 0) + 1
  INTO next_seq
  FROM campaigns
  WHERE id LIKE 'CAM-' || current_year || '-' || current_month || '-%';
  
  new_id := 'CAM-' || current_year || '-' || current_month || '-' || LPAD(next_seq::TEXT, 3, '0');
  
  RETURN new_id;
END;
$$;

-- Function to update plan ID format
CREATE OR REPLACE FUNCTION public.generate_plan_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  current_month TEXT;
  next_seq INTEGER;
  new_id TEXT;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  current_month := to_char(CURRENT_DATE, 'Month');
  current_month := trim(current_month);
  
  -- Get next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(id FROM 'PLAN-[0-9]{4}-[A-Za-z]+-([0-9]+)$') 
      AS INTEGER
    )
  ), 0) + 1
  INTO next_seq
  FROM plans
  WHERE id LIKE 'PLAN-' || current_year || '-' || current_month || '-%';
  
  new_id := 'PLAN-' || current_year || '-' || current_month || '-' || LPAD(next_seq::TEXT, 3, '0');
  
  RETURN new_id;
END;
$$;