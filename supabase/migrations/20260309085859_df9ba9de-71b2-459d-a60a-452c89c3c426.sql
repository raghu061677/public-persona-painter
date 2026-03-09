
-- Email Providers (tenant SMTP configuration)
CREATE TABLE IF NOT EXISTS public.email_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_type text NOT NULL DEFAULT 'smtp',
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_user text,
  smtp_password text,
  smtp_secure boolean DEFAULT true,
  from_email text NOT NULL,
  from_name text,
  reply_to_email text,
  is_default boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_email_providers" ON public.email_providers;
CREATE POLICY "tenant_isolation_email_providers" ON public.email_providers
  FOR ALL USING (company_id = public.current_company_id());

-- Email Templates (per-tenant customizable templates)
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  template_name text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL DEFAULT '',
  text_body text,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, template_key)
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_email_templates" ON public.email_templates;
CREATE POLICY "tenant_isolation_email_templates" ON public.email_templates
  FOR ALL USING (company_id = public.current_company_id());

-- Outbound Email Send Logs
CREATE TABLE public.email_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_key text,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider_used text DEFAULT 'resend',
  error_message text,
  metadata jsonb,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_email_send_logs" ON public.email_send_logs
  FOR ALL USING (company_id = public.current_company_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_providers_company ON public.email_providers(company_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_company_key ON public.email_templates(company_id, template_key);
CREATE INDEX idx_email_send_logs_company ON public.email_send_logs(company_id);
CREATE INDEX idx_email_send_logs_sent_at ON public.email_send_logs(sent_at DESC);
