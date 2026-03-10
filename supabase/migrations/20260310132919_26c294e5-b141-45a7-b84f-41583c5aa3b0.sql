
-- Phase 3.2: RLS hardening for company settings tables
-- Harden write access on settings tables that currently allow any company member to mutate

-- ============================================================
-- 1. email_providers — ADMIN ONLY (contains SMTP credentials)
-- ============================================================
DROP POLICY IF EXISTS "tenant_isolation_email_providers" ON public.email_providers;

CREATE POLICY "ep_select" ON public.email_providers
  FOR SELECT TO authenticated
  USING (company_id = current_company_id());

CREATE POLICY "ep_insert" ON public.email_providers
  FOR INSERT TO authenticated
  WITH CHECK (company_id = current_company_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ep_update" ON public.email_providers
  FOR UPDATE TO authenticated
  USING (company_id = current_company_id() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (company_id = current_company_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ep_delete" ON public.email_providers
  FOR DELETE TO authenticated
  USING (company_id = current_company_id() AND has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 2. email_templates — ADMIN ONLY for system templates, admin+ops_manager for custom
-- ============================================================
DROP POLICY IF EXISTS "tenant_isolation_email_templates" ON public.email_templates;

CREATE POLICY "et_select" ON public.email_templates
  FOR SELECT TO authenticated
  USING (company_id = current_company_id());

CREATE POLICY "et_insert" ON public.email_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = current_company_id()
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  );

CREATE POLICY "et_update" ON public.email_templates
  FOR UPDATE TO authenticated
  USING (
    company_id = current_company_id()
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  )
  WITH CHECK (
    company_id = current_company_id()
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  );

CREATE POLICY "et_delete" ON public.email_templates
  FOR DELETE TO authenticated
  USING (
    company_id = current_company_id()
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 3. notification_settings — ADMIN + OPS MANAGER write
-- ============================================================
DROP POLICY IF EXISTS "Companies can manage their notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "notification_settings_company_access" ON public.notification_settings;

CREATE POLICY "ns_select" ON public.notification_settings
  FOR SELECT TO authenticated
  USING (company_id = current_company_id());

CREATE POLICY "ns_insert" ON public.notification_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = current_company_id()
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  );

CREATE POLICY "ns_update" ON public.notification_settings
  FOR UPDATE TO authenticated
  USING (
    company_id = current_company_id()
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  )
  WITH CHECK (
    company_id = current_company_id()
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  );

CREATE POLICY "ns_delete" ON public.notification_settings
  FOR DELETE TO authenticated
  USING (
    company_id = current_company_id()
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 4. auto_reminder_settings — ADMIN + OPS MANAGER write
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage their company settings" ON public.auto_reminder_settings;
DROP POLICY IF EXISTS "Users can view their company settings" ON public.auto_reminder_settings;

CREATE POLICY "ars_select" ON public.auto_reminder_settings
  FOR SELECT TO authenticated
  USING (company_id::text = current_company_id()::text);

CREATE POLICY "ars_insert" ON public.auto_reminder_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id::text = current_company_id()::text
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  );

CREATE POLICY "ars_update" ON public.auto_reminder_settings
  FOR UPDATE TO authenticated
  USING (
    company_id::text = current_company_id()::text
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  )
  WITH CHECK (
    company_id::text = current_company_id()::text
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  );

-- ============================================================
-- 5. automation_rules — ADMIN + OPS MANAGER write
-- ============================================================
DROP POLICY IF EXISTS "automation_rules_tenant" ON public.automation_rules;

CREATE POLICY "ar_select" ON public.automation_rules
  FOR SELECT TO authenticated
  USING (company_id = current_company_id());

CREATE POLICY "ar_insert" ON public.automation_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = current_company_id()
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  );

CREATE POLICY "ar_update" ON public.automation_rules
  FOR UPDATE TO authenticated
  USING (
    company_id = current_company_id()
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  )
  WITH CHECK (
    company_id = current_company_id()
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  );

CREATE POLICY "ar_delete" ON public.automation_rules
  FOR DELETE TO authenticated
  USING (
    company_id = current_company_id()
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 6. organization_settings — clean up duplicate policies, keep admin-only write
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert organization settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Admins can update organization settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Authenticated can view organization settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Admins can insert their company settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Admins can update their company settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Users can view their company settings" ON public.organization_settings;

CREATE POLICY "os_select" ON public.organization_settings
  FOR SELECT TO authenticated
  USING (company_id = current_company_id() OR is_platform_admin(auth.uid()));

CREATE POLICY "os_insert" ON public.organization_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = current_company_id()
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  );

CREATE POLICY "os_update" ON public.organization_settings
  FOR UPDATE TO authenticated
  USING (
    company_id = current_company_id()
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  )
  WITH CHECK (
    company_id = current_company_id()
    AND has_company_role(ARRAY['admin'::app_role, 'operations_manager'::app_role])
  );
