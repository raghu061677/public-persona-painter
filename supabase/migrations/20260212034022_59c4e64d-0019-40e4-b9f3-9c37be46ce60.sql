
-- ============================================================
-- GO-ADS 360° — PHASE-1 SECURITY FOUNDATION
-- Safe, non-breaking, reversible
-- ============================================================

-- ============================================================
-- SECTION 1: Create reusable security helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.company_users
  WHERE user_id = auth.uid()
    AND status = 'active'
  ORDER BY is_primary DESC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.company_users
  WHERE user_id = auth.uid()
    AND status = 'active'
  ORDER BY is_primary DESC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = _company_id
      AND status = 'active'
  );
$$;

-- has_company_role: accepts app_role[] to match the enum type
CREATE OR REPLACE FUNCTION public.has_company_role(_required_roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role = ANY(_required_roles)
  );
$$;

-- ============================================================
-- SECTION 2: 🚨 CRITICAL — Fix payment_records
-- Current: INSERT/UPDATE/DELETE all USING(true) on {public}
-- ============================================================

DROP POLICY IF EXISTS "Users can delete payment records" ON public.payment_records;
DROP POLICY IF EXISTS "Users can insert payment records" ON public.payment_records;
DROP POLICY IF EXISTS "Users can update payment records" ON public.payment_records;

CREATE POLICY "payment_records_insert_secure"
ON public.payment_records
FOR INSERT TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role))
  AND (company_id = current_company_id() OR is_platform_admin(auth.uid()))
);

CREATE POLICY "payment_records_update_secure"
ON public.payment_records
FOR UPDATE TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role))
  AND (company_id = current_company_id() OR is_platform_admin(auth.uid()))
);

-- No DELETE — soft delete only going forward

-- ============================================================
-- SECTION 3: Fix companies table — remove anon access
-- ============================================================

DROP POLICY IF EXISTS "Public can view companies with public assets" ON public.companies;

CREATE POLICY "Authenticated can view companies with public assets"
ON public.companies FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM media_assets
    WHERE media_assets.company_id = companies.id
    AND media_assets.is_public = true
  )
);

-- ============================================================
-- SECTION 4: Fix USING(true) SELECT on {public} → {authenticated}
-- ============================================================

-- alert_log
DROP POLICY IF EXISTS "Authenticated can view alert logs" ON public.alert_log;
CREATE POLICY "Authenticated can view alert logs"
ON public.alert_log FOR SELECT TO authenticated USING (true);

-- alert_settings
DROP POLICY IF EXISTS "Authenticated users can view alert settings" ON public.alert_settings;
CREATE POLICY "Authenticated users can view alert settings"
ON public.alert_settings FOR SELECT TO authenticated USING (true);

-- approval_settings
DROP POLICY IF EXISTS "Authenticated users can view approval settings" ON public.approval_settings;
CREATE POLICY "Authenticated users can view approval settings"
ON public.approval_settings FOR SELECT TO authenticated USING (true);

-- asset_expenses — add company isolation
DROP POLICY IF EXISTS "Authenticated users can view asset expenses" ON public.asset_expenses;
CREATE POLICY "Authenticated users can view asset expenses"
ON public.asset_expenses FOR SELECT TO authenticated
USING (
  asset_id IN (SELECT id FROM media_assets WHERE company_id = current_company_id())
  OR is_platform_admin(auth.uid())
);

-- asset_maintenance — add company isolation
DROP POLICY IF EXISTS "Authenticated users can view maintenance records" ON public.asset_maintenance;
CREATE POLICY "Authenticated users can view maintenance records"
ON public.asset_maintenance FOR SELECT TO authenticated
USING (
  asset_id IN (SELECT id FROM media_assets WHERE company_id = current_company_id())
  OR is_platform_admin(auth.uid())
);

-- asset_power_bills — add company isolation
DROP POLICY IF EXISTS "Authenticated users can view power bills" ON public.asset_power_bills;
CREATE POLICY "Authenticated users can view power bills"
ON public.asset_power_bills FOR SELECT TO authenticated
USING (
  asset_id IN (SELECT id FROM media_assets WHERE company_id = current_company_id())
  OR is_platform_admin(auth.uid())
);

-- code_counters
DROP POLICY IF EXISTS "Authenticated users can view counters" ON public.code_counters;
CREATE POLICY "Authenticated users can view counters"
ON public.code_counters FOR SELECT TO authenticated USING (true);

-- campaign_templates
DROP POLICY IF EXISTS "Users can view templates" ON public.campaign_templates;
CREATE POLICY "Users can view templates"
ON public.campaign_templates FOR SELECT TO authenticated USING (true);

-- daily_digest_settings
DROP POLICY IF EXISTS "Authenticated can view digest settings" ON public.daily_digest_settings;
CREATE POLICY "Authenticated can view digest settings"
ON public.daily_digest_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can update digest settings" ON public.daily_digest_settings;
CREATE POLICY "Authenticated can update digest settings"
ON public.daily_digest_settings FOR UPDATE TO authenticated USING (true);

-- organization_settings
DROP POLICY IF EXISTS "Anyone can view organization settings" ON public.organization_settings;
CREATE POLICY "Authenticated can view organization settings"
ON public.organization_settings FOR SELECT TO authenticated USING (true);

-- ============================================================
-- SECTION 5: Fix USING(true) INSERT on {public} → {authenticated}
-- ============================================================

DROP POLICY IF EXISTS "System can insert logs" ON public.ai_assistant_logs;
CREATE POLICY "System can insert logs"
ON public.ai_assistant_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Can insert alert logs" ON public.alert_log;
CREATE POLICY "Can insert alert logs"
ON public.alert_log FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert campaign deletions" ON public.campaign_deletions;
CREATE POLICY "System can insert campaign deletions"
ON public.campaign_deletions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert timeline events" ON public.campaign_timeline;
CREATE POLICY "System can insert timeline events"
ON public.campaign_timeline FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.client_audit_log;
CREATE POLICY "System can insert audit logs"
ON public.client_audit_log FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert code settings" ON public.company_code_settings;
CREATE POLICY "System can insert code settings"
ON public.company_code_settings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can insert digest settings" ON public.daily_digest_settings;
CREATE POLICY "Authenticated can insert digest settings"
ON public.daily_digest_settings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert expense approvals log" ON public.expense_approvals_log;
CREATE POLICY "System can insert expense approvals log"
ON public.expense_approvals_log FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert reminders" ON public.invoice_reminders;
CREATE POLICY "System can insert reminders"
ON public.invoice_reminders FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- SECTION 6: Fix bill_reminders & company_counters — ALL on {public}
-- ============================================================

DROP POLICY IF EXISTS "System can manage reminders" ON public.bill_reminders;
CREATE POLICY "System can manage reminders"
ON public.bill_reminders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "System can manage counters" ON public.company_counters;
CREATE POLICY "System can manage counters"
ON public.company_counters FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SECTION 7: Grant/Revoke on new helper functions
-- ============================================================

GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_role(app_role[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_company_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_company_role(app_role[]) FROM anon;
