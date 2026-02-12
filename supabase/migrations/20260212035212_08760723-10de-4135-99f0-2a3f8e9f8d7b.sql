
-- ============================================================
-- PHASE-2: FINANCIAL RBAC - POLICY CHANGES (re-run)
-- ============================================================

-- INVOICES: Remove broad public policies
DROP POLICY IF EXISTS "Users can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view invoices" ON public.invoices;

-- Replace "Company users can view" with admin/finance only
DROP POLICY IF EXISTS "Company users can view their company invoices" ON public.invoices;

CREATE POLICY "invoices_select_full_access"
ON public.invoices FOR SELECT TO authenticated
USING (
  (
    has_company_role(ARRAY['admin', 'finance']::app_role[])
    AND company_id = current_company_id()
  )
  OR is_platform_admin(auth.uid())
  OR client_id IN (
    SELECT cpu.client_id FROM client_portal_users cpu
    WHERE cpu.auth_user_id = auth.uid() AND cpu.is_active = true
  )
);

-- CAMPAIGNS: Remove broad public policies
DROP POLICY IF EXISTS "Users can create campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can view campaigns" ON public.campaigns;

-- PLANS: Remove ALL broad/duplicate policies and recreate with authenticated
DROP POLICY IF EXISTS "Users can create plans" ON public.plans;
DROP POLICY IF EXISTS "Users can delete plans" ON public.plans;
DROP POLICY IF EXISTS "Users can update plans" ON public.plans;
DROP POLICY IF EXISTS "Users can view plans" ON public.plans;
DROP POLICY IF EXISTS "Users can view their company plans" ON public.plans;
DROP POLICY IF EXISTS "Company users can view their company plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can insert company plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can update company plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can delete company plans" ON public.plans;

CREATE POLICY "plans_select_company"
ON public.plans FOR SELECT TO authenticated
USING (
  company_id = current_company_id()
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "plans_insert_authorized"
ON public.plans FOR INSERT TO authenticated
WITH CHECK (
  company_id = current_company_id()
  AND has_company_role(ARRAY['admin', 'sales']::app_role[])
);

CREATE POLICY "plans_update_authorized"
ON public.plans FOR UPDATE TO authenticated
USING (
  company_id = current_company_id()
  AND has_company_role(ARRAY['admin', 'sales']::app_role[])
);

CREATE POLICY "plans_delete_admin_only"
ON public.plans FOR DELETE TO authenticated
USING (
  company_id = current_company_id()
  AND has_company_role(ARRAY['admin']::app_role[])
);

-- PAYMENT_RECORDS: Tighten SELECT + block DELETE
DROP POLICY IF EXISTS "Users can view payment records" ON public.payment_records;
DROP POLICY IF EXISTS "payment_records_delete" ON public.payment_records;
DROP POLICY IF EXISTS "Admins can delete payment records" ON public.payment_records;

CREATE POLICY "payment_records_select_secure"
ON public.payment_records FOR SELECT TO authenticated
USING (
  (
    has_company_role(ARRAY['admin', 'finance']::app_role[])
    AND (company_id = current_company_id() OR is_platform_admin(auth.uid()))
  )
  OR (
    invoice_id IN (
      SELECT i.id FROM invoices i
      WHERE i.client_id IN (
        SELECT cpu.client_id FROM client_portal_users cpu
        WHERE cpu.auth_user_id = auth.uid() AND cpu.is_active = true
      )
    )
  )
);
