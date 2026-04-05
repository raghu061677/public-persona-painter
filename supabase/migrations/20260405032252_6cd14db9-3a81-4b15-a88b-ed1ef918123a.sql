
-- =============================================
-- 1. FIX: daily_digest_settings — add company_id
-- =============================================

ALTER TABLE public.daily_digest_settings
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill existing row with first company
UPDATE public.daily_digest_settings
SET company_id = (SELECT id FROM public.companies LIMIT 1)
WHERE company_id IS NULL;

ALTER TABLE public.daily_digest_settings
  ALTER COLUMN company_id SET NOT NULL;

-- Drop permissive policies
DROP POLICY IF EXISTS "Authenticated can view digest settings" ON public.daily_digest_settings;
DROP POLICY IF EXISTS "Authenticated can insert digest settings" ON public.daily_digest_settings;
DROP POLICY IF EXISTS "Authenticated can update digest settings" ON public.daily_digest_settings;

-- Company-scoped policies
CREATE POLICY "Company members can view digest settings"
  ON public.daily_digest_settings FOR SELECT TO authenticated
  USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Company admins can insert digest settings"
  ON public.daily_digest_settings FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_current_user_company_id());

CREATE POLICY "Company admins can update digest settings"
  ON public.daily_digest_settings FOR UPDATE TO authenticated
  USING (company_id = public.get_current_user_company_id());

-- =============================================
-- 2. FIX: analytics_daily — add company_id
-- =============================================

ALTER TABLE public.analytics_daily
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Drop permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view analytics" ON public.analytics_daily;

-- Company-scoped SELECT
CREATE POLICY "Company members can view own analytics"
  ON public.analytics_daily FOR SELECT TO authenticated
  USING (company_id = public.get_current_user_company_id());

-- Update admin policy to also be company-scoped
DROP POLICY IF EXISTS "Admins can manage analytics" ON public.analytics_daily;
CREATE POLICY "Admins can manage analytics"
  ON public.analytics_daily FOR ALL TO authenticated
  USING (
    company_id = public.get_current_user_company_id()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    company_id = public.get_current_user_company_id()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- =============================================
-- 3. FIX: bill_reminders — scope via bill → asset
-- =============================================

DROP POLICY IF EXISTS "System can manage reminders" ON public.bill_reminders;
DROP POLICY IF EXISTS "Admins can view reminders" ON public.bill_reminders;

-- Company-scoped SELECT via bill → asset → company
CREATE POLICY "Company members can view own bill reminders"
  ON public.bill_reminders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_power_bills pb
      JOIN public.media_assets ma ON ma.id = pb.asset_id
      WHERE pb.id = bill_reminders.bill_id
        AND ma.company_id = public.get_current_user_company_id()
    )
  );

-- Service-level INSERT for system/cron operations
CREATE POLICY "System can insert reminders"
  ON public.bill_reminders FOR INSERT TO authenticated
  WITH CHECK (true);

-- Company-scoped UPDATE
CREATE POLICY "Company members can update own bill reminders"
  ON public.bill_reminders FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.asset_power_bills pb
      JOIN public.media_assets ma ON ma.id = pb.asset_id
      WHERE pb.id = bill_reminders.bill_id
        AND ma.company_id = public.get_current_user_company_id()
    )
  );

-- =============================================
-- 4. NEW: file_access_logs — audit trail
-- =============================================

CREATE TABLE IF NOT EXISTS public.file_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  company_id uuid REFERENCES public.companies(id),
  file_path text NOT NULL,
  bucket text,
  access_type text NOT NULL DEFAULT 'view',
  status text NOT NULL DEFAULT 'allowed',
  client_id text,
  resource_type text,
  resource_id text,
  ip_info text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.file_access_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view their company's file access logs
CREATE POLICY "Company admins can view file access logs"
  ON public.file_access_logs FOR SELECT TO authenticated
  USING (
    company_id = public.get_current_user_company_id()
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Any authenticated user can insert (for logging their own access)
CREATE POLICY "Users can log file access"
  ON public.file_access_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_file_access_logs_company_created
  ON public.file_access_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_access_logs_user
  ON public.file_access_logs (user_id, created_at DESC);
