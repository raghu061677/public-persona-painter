-- ============================================
-- Media Asset Maintenance, Power Bills, and Expenses Tracking
-- ============================================

-- Create asset_maintenance table for tracking maintenance activities
CREATE TABLE IF NOT EXISTS public.asset_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  maintenance_date date NOT NULL,
  maintenance_type text NOT NULL, -- 'Repair', 'Cleaning', 'Painting', 'Electrical', 'Structural', 'Other'
  description text,
  vendor_name text,
  cost numeric DEFAULT 0,
  status text DEFAULT 'Completed', -- 'Scheduled', 'In Progress', 'Completed'
  notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create asset_power_bills table for TGSPDCL power bill tracking
CREATE TABLE IF NOT EXISTS public.asset_power_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  bill_month date NOT NULL, -- First day of the billing month
  consumer_name text,
  service_number text,
  unique_service_number text,
  ero text,
  section_name text,
  bill_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  payment_date date,
  payment_status text DEFAULT 'Pending', -- 'Pending', 'Paid', 'Overdue'
  bill_url text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(asset_id, bill_month)
);

-- Create asset_expenses table for asset-specific expenses
CREATE TABLE IF NOT EXISTS public.asset_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  expense_date date NOT NULL,
  category text NOT NULL, -- 'Power Bill', 'Maintenance', 'Rent', 'Tax', 'Other'
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  vendor_name text,
  payment_status text DEFAULT 'Pending', -- 'Pending', 'Paid'
  payment_date date,
  receipt_url text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset_id ON public.asset_maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_date ON public.asset_maintenance(maintenance_date);
CREATE INDEX IF NOT EXISTS idx_asset_power_bills_asset_id ON public.asset_power_bills(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_power_bills_month ON public.asset_power_bills(bill_month);
CREATE INDEX IF NOT EXISTS idx_asset_expenses_asset_id ON public.asset_expenses(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_expenses_date ON public.asset_expenses(expense_date);

-- Create index on campaign_assets for booking history queries
CREATE INDEX IF NOT EXISTS idx_campaign_assets_asset_id ON public.campaign_assets(asset_id);

-- Enable RLS
ALTER TABLE public.asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_power_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_maintenance
CREATE POLICY "Authenticated users can view maintenance records"
ON public.asset_maintenance FOR SELECT
USING (true);

CREATE POLICY "Admins can manage maintenance records"
ON public.asset_maintenance FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for asset_power_bills
CREATE POLICY "Authenticated users can view power bills"
ON public.asset_power_bills FOR SELECT
USING (true);

CREATE POLICY "Admins can manage power bills"
ON public.asset_power_bills FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for asset_expenses
CREATE POLICY "Authenticated users can view asset expenses"
ON public.asset_expenses FOR SELECT
USING (true);

CREATE POLICY "Admins can manage asset expenses"
ON public.asset_expenses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_asset_maintenance_updated_at
  BEFORE UPDATE ON public.asset_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_power_bills_updated_at
  BEFORE UPDATE ON public.asset_power_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_expenses_updated_at
  BEFORE UPDATE ON public.asset_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();