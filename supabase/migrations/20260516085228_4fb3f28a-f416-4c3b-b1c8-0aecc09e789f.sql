
-- 1. Allow null company_id on whatsapp_settings (global defaults)
ALTER TABLE public.whatsapp_settings DROP CONSTRAINT IF EXISTS whatsapp_settings_pkey;
ALTER TABLE public.whatsapp_settings ALTER COLUMN company_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_settings_company_uniq
  ON public.whatsapp_settings (company_id) WHERE company_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_settings_global_uniq
  ON public.whatsapp_settings ((company_id IS NULL)) WHERE company_id IS NULL;

-- 2. Auto-reply rules
CREATE TABLE IF NOT EXISTS public.whatsapp_auto_reply_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NULL,
  name text NOT NULL,
  template_kind text NOT NULL DEFAULT 'custom', -- proposal | proof | payment | custom
  keywords text[] NOT NULL DEFAULT '{}',
  media_type text NULL,
  min_budget numeric NULL,
  max_budget numeric NULL,
  body text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_auto_reply_rules_company_idx
  ON public.whatsapp_auto_reply_rules (company_id, enabled, priority);

ALTER TABLE public.whatsapp_auto_reply_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage whatsapp auto reply rules"
  ON public.whatsapp_auto_reply_rules;
CREATE POLICY "Admins manage whatsapp auto reply rules"
  ON public.whatsapp_auto_reply_rules
  FOR ALL
  TO authenticated
  USING (company_id IS NULL OR has_role(auth.uid(),'admin'::app_role) OR is_company_member(company_id))
  WITH CHECK (company_id IS NULL OR has_role(auth.uid(),'admin'::app_role) OR is_company_member(company_id));

DROP POLICY IF EXISTS "Members view whatsapp auto reply rules"
  ON public.whatsapp_auto_reply_rules;
CREATE POLICY "Members view whatsapp auto reply rules"
  ON public.whatsapp_auto_reply_rules
  FOR SELECT
  TO authenticated
  USING (company_id IS NULL OR is_company_member(company_id));

CREATE TRIGGER trg_whatsapp_rules_updated_at
  BEFORE UPDATE ON public.whatsapp_auto_reply_rules
  FOR EACH ROW EXECUTE FUNCTION touch_whatsapp_updated_at();
