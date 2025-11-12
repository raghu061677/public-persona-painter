-- Create alert_settings table for configurable thresholds
CREATE TABLE IF NOT EXISTS public.alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_variance_threshold numeric NOT NULL DEFAULT 10, -- Percentage
  schedule_warning_days integer NOT NULL DEFAULT 7,
  schedule_critical_days integer NOT NULL DEFAULT 3,
  verification_lag_threshold numeric NOT NULL DEFAULT 20, -- Percentage
  verification_delay_warning_days integer NOT NULL DEFAULT 3,
  verification_delay_critical_days integer NOT NULL DEFAULT 7,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage alert settings"
  ON public.alert_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view alert settings"
  ON public.alert_settings FOR SELECT
  USING (true);

-- Insert default settings
INSERT INTO public.alert_settings (
  budget_variance_threshold,
  schedule_warning_days,
  schedule_critical_days,
  verification_lag_threshold,
  verification_delay_warning_days,
  verification_delay_critical_days
) VALUES (10, 7, 3, 20, 3, 7)
ON CONFLICT DO NOTHING;