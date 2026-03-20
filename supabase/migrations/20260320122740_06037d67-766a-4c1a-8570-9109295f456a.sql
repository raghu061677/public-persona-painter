
-- Add severity and workflow columns to data_quality_issues
ALTER TABLE public.data_quality_issues
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolution_note text;

-- Add error_message to data_quality_runs if missing
ALTER TABLE public.data_quality_runs
  ADD COLUMN IF NOT EXISTS error_message text;

-- Create data quality alert thresholds table
CREATE TABLE IF NOT EXISTS public.data_quality_alert_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL,
  threshold_count integer NOT NULL DEFAULT 1,
  notify_on_increase boolean NOT NULL DEFAULT false,
  increase_percent integer DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(severity)
);

-- Seed default thresholds
INSERT INTO public.data_quality_alert_thresholds (severity, threshold_count, notify_on_increase, increase_percent)
VALUES
  ('critical', 1, true, 0),
  ('high', 5, true, 50),
  ('medium', 20, false, 100),
  ('low', 50, false, 100)
ON CONFLICT (severity) DO NOTHING;

-- Enable RLS
ALTER TABLE public.data_quality_alert_thresholds ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for thresholds
CREATE POLICY "admin_select_alert_thresholds" ON public.data_quality_alert_thresholds
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_alert_thresholds" ON public.data_quality_alert_thresholds
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_dqi_severity ON public.data_quality_issues(severity);
CREATE INDEX IF NOT EXISTS idx_dqi_workflow_status ON public.data_quality_issues(workflow_status);
