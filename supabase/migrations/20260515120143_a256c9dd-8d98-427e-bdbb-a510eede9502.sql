ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS target_locations text,
  ADD COLUMN IF NOT EXISTS campaign_start_date date,
  ADD COLUMN IF NOT EXISTS campaign_end_date date,
  ADD COLUMN IF NOT EXISTS campaign_duration_days integer,
  ADD COLUMN IF NOT EXISTS estimated_budget numeric,
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_id text;

CREATE INDEX IF NOT EXISTS idx_leads_phone_source ON public.leads(phone, source);
CREATE INDEX IF NOT EXISTS idx_leads_source_status ON public.leads(source, status);

ALTER TABLE public.whatsapp_logs
  ADD COLUMN IF NOT EXISTS wa_message_id text,
  ADD COLUMN IF NOT EXISTS from_number text,
  ADD COLUMN IF NOT EXISTS to_number text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb,
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uniq_whatsapp_logs_wa_message_id
  ON public.whatsapp_logs(wa_message_id)
  WHERE wa_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_lead ON public.whatsapp_logs(lead_id);

CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  company_id uuid PRIMARY KEY,
  auto_reply_enabled boolean NOT NULL DEFAULT true,
  auto_reply_text text DEFAULT 'Thank you for contacting us. We have received your outdoor advertising enquiry. Please share your target locations, campaign dates, media type, and budget so we can send suitable available media options.',
  proposal_template text DEFAULT 'Hello {{name}}, your OOH media proposal for {{campaign}} is ready. Please view it here: {{link}}',
  proof_template text DEFAULT 'Hello {{name}}, your campaign proof of execution for {{campaign}} is ready. Please view/download it here: {{link}}',
  payment_template text DEFAULT 'Hello {{name}}, this is a reminder for invoice {{invoice_no}} amounting to ₹{{amount}}. Payment details: {{link}}',
  phone_number_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members view whatsapp settings" ON public.whatsapp_settings;
CREATE POLICY "Company members view whatsapp settings"
  ON public.whatsapp_settings FOR SELECT
  TO authenticated
  USING (company_id IS NULL OR public.is_company_member(company_id));

DROP POLICY IF EXISTS "Company admins manage whatsapp settings" ON public.whatsapp_settings;
CREATE POLICY "Company admins manage whatsapp settings"
  ON public.whatsapp_settings FOR ALL
  TO authenticated
  USING (
    company_id IS NULL
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_company_member(company_id)
  )
  WITH CHECK (
    company_id IS NULL
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_company_member(company_id)
  );

CREATE OR REPLACE FUNCTION public.touch_whatsapp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_whatsapp_logs_updated_at ON public.whatsapp_logs;
CREATE TRIGGER trg_whatsapp_logs_updated_at
  BEFORE UPDATE ON public.whatsapp_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_whatsapp_updated_at();

DROP TRIGGER IF EXISTS trg_whatsapp_settings_updated_at ON public.whatsapp_settings;
CREATE TRIGGER trg_whatsapp_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_whatsapp_updated_at();