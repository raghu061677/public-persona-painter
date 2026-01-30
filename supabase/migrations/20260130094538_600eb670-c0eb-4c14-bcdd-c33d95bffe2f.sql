-- =============================================
-- GO-ADS Enterprise Expenses Module Migration
-- =============================================

-- 1) Create expense_categories table
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_gst_type TEXT DEFAULT 'CGST_SGST' CHECK (default_gst_type IN ('None', 'IGST', 'CGST_SGST')),
  default_gst_percent NUMERIC(5,2) DEFAULT 18,
  default_tds_percent NUMERIC(5,2) DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Create cost_centers table
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  type TEXT CHECK (type IN ('Branch', 'City', 'Region', 'Department', 'Project')),
  parent_id UUID REFERENCES public.cost_centers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Create approval_status enum
DO $$ BEGIN
  CREATE TYPE expense_approval_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected', 'Paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4) Create gst_type enum
DO $$ BEGIN
  CREATE TYPE gst_type AS ENUM ('None', 'IGST', 'CGST_SGST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5) Create allocation_type enum
DO $$ BEGIN
  CREATE TYPE expense_allocation_type AS ENUM ('General', 'Campaign', 'Plan', 'Asset');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6) Create payment_mode enum
DO $$ BEGIN
  CREATE TYPE payment_mode AS ENUM ('Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7) Add new columns to expenses table (safely)
ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS expense_no TEXT,
  ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS vendor_id UUID,
  ADD COLUMN IF NOT EXISTS vendor_gstin TEXT,
  ADD COLUMN IF NOT EXISTS invoice_no TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'Bank Transfer',
  ADD COLUMN IF NOT EXISTS amount_before_tax NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_type_enum TEXT DEFAULT 'CGST_SGST',
  ADD COLUMN IF NOT EXISTS cgst NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tax NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tds_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_payable NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS cost_center_id UUID,
  ADD COLUMN IF NOT EXISTS allocation_type TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS asset_id TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS attachments_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add FK constraints safely
DO $$ BEGIN
  ALTER TABLE public.expenses ADD CONSTRAINT fk_expenses_category 
    FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.expenses ADD CONSTRAINT fk_expenses_cost_center 
    FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8) Create expense_attachments table
CREATE TABLE IF NOT EXISTS public.expense_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id TEXT REFERENCES public.expenses(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 9) Create expense_approvals_log table (audit trail)
CREATE TABLE IF NOT EXISTS public.expense_approvals_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id TEXT REFERENCES public.expenses(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  user_id UUID,
  user_name TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10) Create budgets table
CREATE TABLE IF NOT EXISTS public.expense_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id),
  category_id UUID REFERENCES public.expense_categories(id),
  budget_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11) Create expense_no generation function
CREATE OR REPLACE FUNCTION public.generate_expense_no(p_company_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fy TEXT;
  v_seq INTEGER;
  v_expense_no TEXT;
  v_year INTEGER;
  v_month INTEGER;
BEGIN
  -- Get current date parts
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  -- Calculate financial year (April to March)
  IF v_month >= 4 THEN
    v_fy := v_year::TEXT || '-' || SUBSTRING((v_year + 1)::TEXT, 3, 2);
  ELSE
    v_fy := (v_year - 1)::TEXT || '-' || SUBSTRING(v_year::TEXT, 3, 2);
  END IF;
  
  -- Get next sequence number
  SELECT COALESCE(MAX(
    CASE 
      WHEN expense_no ~ '^EXP-[0-9]{4}-[0-9]{2}-[0-9]+$'
      THEN CAST(SUBSTRING(expense_no FROM '[0-9]+$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO v_seq
  FROM expenses
  WHERE expense_no LIKE 'EXP-' || v_fy || '-%'
    AND (p_company_id IS NULL OR company_id = p_company_id);
  
  v_expense_no := 'EXP-' || v_fy || '-' || LPAD(v_seq::TEXT, 6, '0');
  
  RETURN v_expense_no;
END;
$$;

-- 12) Seed default expense categories
INSERT INTO public.expense_categories (id, name, description, default_gst_percent, color, sort_order)
VALUES 
  (gen_random_uuid(), 'Printing', 'Printing and creative costs', 18, '#3b82f6', 1),
  (gen_random_uuid(), 'Mounting', 'Installation and mounting costs', 18, '#8b5cf6', 2),
  (gen_random_uuid(), 'Power/Electricity', 'Electricity and power bills', 18, '#eab308', 3),
  (gen_random_uuid(), 'Rent', 'Location and space rental', 18, '#ec4899', 4),
  (gen_random_uuid(), 'Maintenance', 'Repair and maintenance', 18, '#f97316', 5),
  (gen_random_uuid(), 'Travel', 'Travel and conveyance', 18, '#06b6d4', 6),
  (gen_random_uuid(), 'Salary', 'Staff salary and wages', 0, '#10b981', 7),
  (gen_random_uuid(), 'Tax/Compliance', 'Government taxes and fees', 0, '#ef4444', 8),
  (gen_random_uuid(), 'Miscellaneous', 'Other expenses', 18, '#6b7280', 9)
ON CONFLICT DO NOTHING;

-- 13) Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approvals_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_budgets ENABLE ROW LEVEL SECURITY;

-- 14) Create RLS policies
CREATE POLICY "Users can view expense categories in their company"
  ON public.expense_categories FOR SELECT
  USING (company_id IS NULL OR company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

CREATE POLICY "Admins can manage expense categories"
  ON public.expense_categories FOR ALL
  USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can view cost centers in their company"
  ON public.cost_centers FOR SELECT
  USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

CREATE POLICY "Admins can manage cost centers"
  ON public.cost_centers FOR ALL
  USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can view expense attachments"
  ON public.expense_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM expenses e 
    WHERE e.id = expense_id 
    AND e.company_id = get_current_user_company_id()
  ));

CREATE POLICY "Users can manage expense attachments"
  ON public.expense_attachments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM expenses e 
    WHERE e.id = expense_id 
    AND e.company_id = get_current_user_company_id()
  ));

CREATE POLICY "Users can view expense approvals log"
  ON public.expense_approvals_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM expenses e 
    WHERE e.id = expense_id 
    AND e.company_id = get_current_user_company_id()
  ));

CREATE POLICY "System can insert expense approvals log"
  ON public.expense_approvals_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view budgets in their company"
  ON public.expense_budgets FOR SELECT
  USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

CREATE POLICY "Admins can manage budgets"
  ON public.expense_budgets FOR ALL
  USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

-- 15) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_expense_no ON public.expenses(expense_no);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_approval_status ON public.expenses(approval_status);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cost_center_id ON public.expenses(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_expense_attachments_expense_id ON public.expense_attachments(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_log_expense_id ON public.expense_approvals_log(expense_id);