-- Create enum for plan types
CREATE TYPE public.plan_type AS ENUM ('Quotation', 'Proposal', 'Estimate');

-- Create enum for plan status
CREATE TYPE public.plan_status AS ENUM ('Draft', 'Sent', 'Approved', 'Rejected', 'Converted');

-- Create plans table
CREATE TABLE public.plans (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_type plan_type NOT NULL DEFAULT 'Quotation',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  status plan_status NOT NULL DEFAULT 'Draft',
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  gst_percent DECIMAL(5, 2) NOT NULL DEFAULT 18,
  gst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  share_token TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create plan_items table (assets in a plan)
CREATE TABLE public.plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  asset_id TEXT REFERENCES public.media_assets(id) NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  media_type TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  card_rate DECIMAL(12, 2) NOT NULL,
  base_rent DECIMAL(12, 2),
  sales_price DECIMAL(12, 2) NOT NULL,
  printing_charges DECIMAL(12, 2) DEFAULT 0,
  mounting_charges DECIMAL(12, 2) DEFAULT 0,
  subtotal DECIMAL(12, 2) NOT NULL,
  gst_amount DECIMAL(12, 2) NOT NULL,
  total_with_gst DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_plans_client_id ON public.plans(client_id);
CREATE INDEX idx_plans_status ON public.plans(status);
CREATE INDEX idx_plans_created_at ON public.plans(created_at DESC);
CREATE INDEX idx_plans_share_token ON public.plans(share_token);
CREATE INDEX idx_plan_items_plan_id ON public.plan_items(plan_id);
CREATE INDEX idx_plan_items_asset_id ON public.plan_items(asset_id);

-- RLS Policies for plans
CREATE POLICY "Authenticated users can view plans"
  ON public.plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert plans"
  ON public.plans
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plans"
  ON public.plans
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plans"
  ON public.plans
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for plan_items
CREATE POLICY "Authenticated users can view plan items"
  ON public.plan_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert plan items"
  ON public.plan_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plan items"
  ON public.plan_items
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plan items"
  ON public.plan_items
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at on plans
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate share token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$;