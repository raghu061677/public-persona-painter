
-- Add traceability columns for plan-level holds
ALTER TABLE public.asset_holds
  ADD COLUMN IF NOT EXISTS source_plan_id text REFERENCES public.plans(id),
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Index for fast lookup by plan
CREATE INDEX IF NOT EXISTS idx_asset_holds_source_plan_id ON public.asset_holds(source_plan_id) WHERE source_plan_id IS NOT NULL;
