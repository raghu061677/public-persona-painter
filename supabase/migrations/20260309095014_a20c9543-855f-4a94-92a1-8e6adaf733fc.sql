
-- Extend existing email_templates table with missing columns
ALTER TABLE public.email_templates 
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Rename columns to match new schema (only if old names exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_templates' AND column_name = 'subject' AND table_schema = 'public') THEN
    ALTER TABLE public.email_templates RENAME COLUMN subject TO subject_template;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_templates' AND column_name = 'html_body' AND table_schema = 'public') THEN
    ALTER TABLE public.email_templates RENAME COLUMN html_body TO html_template;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_templates' AND column_name = 'text_body' AND table_schema = 'public') THEN
    ALTER TABLE public.email_templates RENAME COLUMN text_body TO text_template;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_templates' AND column_name = 'variables' AND table_schema = 'public') THEN
    ALTER TABLE public.email_templates RENAME COLUMN variables TO variables_json;
  END IF;
END $$;

-- Email Provider Configs (already created by failed partial migration, use IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.email_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_type text NOT NULL DEFAULT 'resend' CHECK (provider_type IN ('resend', 'smtp')),
  provider_name text NOT NULL DEFAULT 'default',
  is_active boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  from_name text,
  from_email text,
  reply_to_email text,
  smtp_host text,
  smtp_port integer,
  smtp_secure boolean DEFAULT true,
  smtp_username text,
  smtp_password_encrypted text,
  resend_api_key_encrypted text,
  daily_limit integer DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_provider_configs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_provider_configs' AND policyname = 'tenant_isolation_email_provider_configs') THEN
    CREATE POLICY "tenant_isolation_email_provider_configs" ON public.email_provider_configs FOR ALL USING (company_id = current_company_id());
  END IF;
END $$;

-- Email Outbox
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  template_key text,
  entity_type text,
  entity_id text,
  recipient_to text NOT NULL,
  recipient_cc text,
  recipient_bcc text,
  subject_rendered text NOT NULL,
  html_rendered text NOT NULL,
  text_rendered text,
  provider_config_id uuid REFERENCES public.email_provider_configs(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'bounced')),
  retry_count integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_outbox' AND policyname = 'email_outbox_tenant') THEN
    CREATE POLICY "email_outbox_tenant" ON public.email_outbox FOR ALL USING (company_id = current_company_id());
  END IF;
END $$;

-- Email Delivery Logs
CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id uuid REFERENCES public.email_outbox(id) ON DELETE CASCADE,
  provider_type text,
  provider_name text,
  attempt_no integer NOT NULL DEFAULT 1,
  request_payload_meta jsonb,
  response_meta jsonb,
  status text NOT NULL DEFAULT 'attempted',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_delivery_logs' AND policyname = 'email_delivery_logs_tenant') THEN
    CREATE POLICY "email_delivery_logs_tenant" ON public.email_delivery_logs FOR ALL USING (
      EXISTS (SELECT 1 FROM public.email_outbox o WHERE o.id = outbox_id AND o.company_id = current_company_id())
    );
  END IF;
END $$;

-- Email Webhook Events
CREATE TABLE IF NOT EXISTS public.email_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_type text NOT NULL,
  external_message_id text,
  event_type text NOT NULL,
  recipient_email text,
  payload jsonb,
  event_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_webhook_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_webhook_events' AND policyname = 'email_webhook_events_tenant') THEN
    CREATE POLICY "email_webhook_events_tenant" ON public.email_webhook_events FOR ALL USING (company_id = current_company_id());
  END IF;
END $$;

-- Email Suppressions
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  reason text NOT NULL DEFAULT 'bounce',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_suppressions' AND policyname = 'email_suppressions_tenant') THEN
    CREATE POLICY "email_suppressions_tenant" ON public.email_suppressions FOR ALL USING (company_id = current_company_id());
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON public.email_outbox(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_outbox_company ON public.email_outbox(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON public.email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_outbox ON public.email_delivery_logs(outbox_id);
CREATE INDEX IF NOT EXISTS idx_email_webhook_events_company ON public.email_webhook_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_suppressions_email ON public.email_suppressions(company_id, email);
