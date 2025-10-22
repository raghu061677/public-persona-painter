-- Create enums for finance module
CREATE TYPE public.estimation_status AS ENUM ('Draft', 'Sent', 'Approved', 'Rejected');
CREATE TYPE public.invoice_status AS ENUM ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled');
CREATE TYPE public.payment_status AS ENUM ('Pending', 'Paid');
CREATE TYPE public.expense_category AS ENUM ('Printing', 'Mounting', 'Transport', 'Electricity', 'Other');

-- Create estimations table
CREATE TABLE public.estimations (
  id TEXT PRIMARY KEY,
  plan_id TEXT REFERENCES public.plans(id),
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  estimation_date DATE NOT NULL,
  status estimation_status NOT NULL DEFAULT 'Draft',
  items JSONB DEFAULT '[]',
  sub_total DECIMAL(12, 2) NOT NULL,
  gst_percent DECIMAL(5, 2) NOT NULL DEFAULT 18,
  gst_amount DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id TEXT PRIMARY KEY,
  estimation_id TEXT REFERENCES public.estimations(id),
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status invoice_status NOT NULL DEFAULT 'Draft',
  items JSONB DEFAULT '[]',
  sub_total DECIMAL(12, 2) NOT NULL,
  gst_percent DECIMAL(5, 2) NOT NULL DEFAULT 18,
  gst_amount DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  payments JSONB DEFAULT '[]',
  balance_due DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES public.campaigns(id),
  category expense_category NOT NULL,
  vendor_name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  gst_percent DECIMAL(5, 2) NOT NULL DEFAULT 18,
  gst_amount DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  invoice_url TEXT,
  payment_status payment_status NOT NULL DEFAULT 'Pending',
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create analytics_daily table for aggregated reports
CREATE TABLE public.analytics_daily (
  date DATE PRIMARY KEY,
  fy TEXT NOT NULL,
  totals JSONB DEFAULT '{}',
  occupancy JSONB DEFAULT '{}',
  vacant_by_city JSONB DEFAULT '[]',
  revenue_by_client JSONB DEFAULT '[]',
  revenue_by_city JSONB DEFAULT '[]',
  expenses_by_category JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_estimations_client_id ON public.estimations(client_id);
CREATE INDEX idx_estimations_status ON public.estimations(status);
CREATE INDEX idx_estimations_date ON public.estimations(estimation_date DESC);

CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_date ON public.invoices(invoice_date DESC);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

CREATE INDEX idx_expenses_campaign_id ON public.expenses(campaign_id);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_status ON public.expenses(payment_status);
CREATE INDEX idx_expenses_created_at ON public.expenses(created_at DESC);

CREATE INDEX idx_analytics_fy ON public.analytics_daily(fy);

-- RLS Policies for estimations
CREATE POLICY "Authenticated users can view estimations"
  ON public.estimations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage estimations"
  ON public.estimations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for invoices
CREATE POLICY "Authenticated users can view invoices"
  ON public.invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for expenses
CREATE POLICY "Authenticated users can view expenses"
  ON public.expenses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for analytics_daily
CREATE POLICY "Authenticated users can view analytics"
  ON public.analytics_daily FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage analytics"
  ON public.analytics_daily FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_estimations_updated_at
  BEFORE UPDATE ON public.estimations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_daily_updated_at
  BEFORE UPDATE ON public.analytics_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get current financial year
CREATE OR REPLACE FUNCTION public.get_financial_year()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  fy_start_year INTEGER;
  fy_end_year INTEGER;
BEGIN
  -- FY starts April 1st
  IF EXTRACT(MONTH FROM current_date) >= 4 THEN
    fy_start_year := EXTRACT(YEAR FROM current_date);
  ELSE
    fy_start_year := EXTRACT(YEAR FROM current_date) - 1;
  END IF;
  
  fy_end_year := fy_start_year + 1;
  
  RETURN fy_start_year || '-' || SUBSTRING(fy_end_year::TEXT FROM 3 FOR 2);
END;
$$;

-- Function to generate estimation ID
CREATE OR REPLACE FUNCTION public.generate_estimation_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fy TEXT;
  next_seq INTEGER;
  new_id TEXT;
BEGIN
  fy := get_financial_year();
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(id FROM 'EST-[0-9]{4}-[0-9]{2}-([0-9]+)$') 
      AS INTEGER
    )
  ), 0) + 1
  INTO next_seq
  FROM estimations
  WHERE id LIKE 'EST-' || fy || '-%';
  
  new_id := 'EST-' || fy || '-' || LPAD(next_seq::TEXT, 3, '0');
  
  RETURN new_id;
END;
$$;

-- Function to generate invoice ID
CREATE OR REPLACE FUNCTION public.generate_invoice_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fy TEXT;
  next_seq INTEGER;
  new_id TEXT;
BEGIN
  fy := get_financial_year();
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(id FROM 'INV-[0-9]{4}-[0-9]{2}-([0-9]+)$') 
      AS INTEGER
    )
  ), 0) + 1
  INTO next_seq
  FROM invoices
  WHERE id LIKE 'INV-' || fy || '-%';
  
  new_id := 'INV-' || fy || '-' || LPAD(next_seq::TEXT, 4, '0');
  
  RETURN new_id;
END;
$$;

-- Function to generate expense ID
CREATE OR REPLACE FUNCTION public.generate_expense_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fy TEXT;
  next_seq INTEGER;
  new_id TEXT;
BEGIN
  fy := get_financial_year();
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(id FROM 'EXP-[0-9]{4}-[0-9]{2}-([0-9]+)$') 
      AS INTEGER
    )
  ), 0) + 1
  INTO next_seq
  FROM expenses
  WHERE id LIKE 'EXP-' || fy || '-%';
  
  new_id := 'EXP-' || fy || '-' || LPAD(next_seq::TEXT, 3, '0');
  
  RETURN new_id;
END;
$$;