
-- Add archive fields to plans table
ALTER TABLE public.plans 
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS archived_reason text NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_plans_company_archived_created 
  ON public.plans(company_id, is_archived, created_at);

CREATE INDEX IF NOT EXISTS idx_campaigns_company_status_dates 
  ON public.campaigns(company_id, status, start_date, end_date);
