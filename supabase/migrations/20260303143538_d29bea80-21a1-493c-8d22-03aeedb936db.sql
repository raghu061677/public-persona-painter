
-- Phase 2D: Concession Allocation Engine (tables + RLS)

-- 1) concession_contracts
CREATE TABLE IF NOT EXISTS public.concession_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  authority_name text,
  contract_name text NOT NULL,
  contract_ref text,
  start_date date NOT NULL,
  end_date date,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','quarterly','annual')),
  total_fee numeric NOT NULL CHECK (total_fee >= 0),
  allocation_method text NOT NULL CHECK (allocation_method IN ('per_asset','per_asset_day','per_revenue')),
  applies_to text NOT NULL CHECK (applies_to IN ('all_assets','asset_list','media_type','zone')),
  filter_json jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concession_contracts_company ON public.concession_contracts(company_id, active);
ALTER TABLE public.concession_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_select" ON public.concession_contracts FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "cc_insert" ON public.concession_contracts FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.has_company_role(ARRAY['admin','finance']::public.app_role[]));
CREATE POLICY "cc_update" ON public.concession_contracts FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND public.has_company_role(ARRAY['admin','finance']::public.app_role[]));

-- 2) concession_postings
CREATE TABLE IF NOT EXISTS public.concession_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.concession_contracts(id) ON DELETE CASCADE,
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_start date NOT NULL,
  period_end date NOT NULL,
  asset_id text NOT NULL,
  allocation_method text NOT NULL,
  basis_value numeric NOT NULL,
  allocated_amount numeric NOT NULL,
  posting_date date NOT NULL,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','reversed')),
  expense_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cp_idempotent
  ON public.concession_postings(company_id, contract_id, period_year, period_month, asset_id)
  WHERE status = 'posted';
CREATE INDEX IF NOT EXISTS idx_cp_company ON public.concession_postings(company_id, period_year, period_month);
ALTER TABLE public.concession_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp_select" ON public.concession_postings FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "cp_no_insert" ON public.concession_postings FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "cp_no_update" ON public.concession_postings FOR UPDATE TO authenticated USING (false);
CREATE POLICY "cp_no_delete" ON public.concession_postings FOR DELETE TO authenticated USING (false);

-- 3) Add metadata to asset_expenses if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='asset_expenses' AND column_name='metadata') THEN
    ALTER TABLE public.asset_expenses ADD COLUMN metadata jsonb;
  END IF;
END$$;
