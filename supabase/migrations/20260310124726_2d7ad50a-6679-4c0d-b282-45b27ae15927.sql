-- Extend email_templates with notification engine fields
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS audience text DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS trigger_event text,
  ADD COLUMN IF NOT EXISTS send_mode text DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS description text;

-- Rename columns for consistency if needed (html_template -> html_body alias handled in code)

-- Extend email_outbox with event tracking
ALTER TABLE public.email_outbox
  ADD COLUMN IF NOT EXISTS event_key text,
  ADD COLUMN IF NOT EXISTS source_module text,
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS payload_json jsonb,
  ADD COLUMN IF NOT EXISTS recipient_type text DEFAULT 'to',
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0;

-- Create notification_settings table if not exists (for reminders persistence)
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reminders jsonb DEFAULT '{}'::jsonb,
  alerts jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_settings' AND policyname = 'notification_settings_company_access'
  ) THEN
    CREATE POLICY notification_settings_company_access ON public.notification_settings
      FOR ALL TO authenticated
      USING (company_id = current_company_id() OR is_platform_admin(auth.uid()))
      WITH CHECK (company_id = current_company_id() OR is_platform_admin(auth.uid()));
  END IF;
END $$;