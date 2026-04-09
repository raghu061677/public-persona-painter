
-- Add soft-delete columns
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Add rejection metadata columns
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Index for efficient filtering of non-deleted plans
CREATE INDEX IF NOT EXISTS idx_plans_is_deleted ON public.plans (is_deleted);
