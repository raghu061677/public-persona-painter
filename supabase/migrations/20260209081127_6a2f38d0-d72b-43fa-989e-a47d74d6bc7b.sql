
-- Add new toggle columns to daily_digest_settings
ALTER TABLE public.daily_digest_settings
  ADD COLUMN IF NOT EXISTS sender_name text DEFAULT 'GO-ADS Alerts',
  ADD COLUMN IF NOT EXISTS daily_digest_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS per_campaign_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS per_invoice_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS campaign_end_window_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS invoice_buckets text[] NOT NULL DEFAULT ARRAY['DUE_TODAY','OVERDUE'];

-- Create alert_email_templates table
CREATE TABLE IF NOT EXISTS public.alert_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_alert_templates_updated_at ON public.alert_email_templates;
CREATE TRIGGER trg_alert_templates_updated_at
BEFORE UPDATE ON public.alert_email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for alert_email_templates
ALTER TABLE public.alert_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_templates_select" ON public.alert_email_templates;
CREATE POLICY "alert_templates_select"
ON public.alert_email_templates FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "alert_templates_admin_insert" ON public.alert_email_templates;
CREATE POLICY "alert_templates_admin_insert"
ON public.alert_email_templates FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "alert_templates_admin_update" ON public.alert_email_templates;
CREATE POLICY "alert_templates_admin_update"
ON public.alert_email_templates FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
