
-- Payable batches log table to prevent duplicate generation
CREATE TABLE public.payable_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  month_key TEXT NOT NULL, -- e.g. '2026-02'
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_entries INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE(company_id, month_key)
);

-- RLS
ALTER TABLE public.payable_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company payable batches"
  ON public.payable_batches FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own company payable batches"
  ON public.payable_batches FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ));

-- Add 'Unmounting' to expense_category enum if not exists
ALTER TYPE public.expense_category ADD VALUE IF NOT EXISTS 'Unmounting';
