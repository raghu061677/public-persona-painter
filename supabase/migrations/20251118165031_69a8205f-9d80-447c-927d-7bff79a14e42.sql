-- Priority 1 Critical Security Fix: Add Missing RLS Policies for Multi-Tenant Isolation
-- This migration adds comprehensive RLS policies to all tables with company_id

-- ============================================
-- 1. SUBSCRIPTIONS TABLE RLS
-- ============================================
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company subscriptions" ON subscriptions;
CREATE POLICY "Users can view their company subscriptions"
ON subscriptions FOR SELECT
USING (
  company_id::text = (SELECT get_user_company_id(auth.uid())::text)
  OR is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "Platform admins can manage all subscriptions" ON subscriptions;
CREATE POLICY "Platform admins can manage all subscriptions"
ON subscriptions FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- ============================================
-- 2. TRANSACTIONS TABLE RLS
-- ============================================
ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company transactions" ON transactions;
CREATE POLICY "Users can view their company transactions"
ON transactions FOR SELECT
USING (
  company_id::text = (SELECT get_user_company_id(auth.uid())::text)
  OR is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "Platform admins can manage all transactions" ON transactions;
CREATE POLICY "Platform admins can manage all transactions"
ON transactions FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- ============================================
-- 3. AI_ASSISTANT_LOGS TABLE RLS
-- ============================================
ALTER TABLE IF EXISTS ai_assistant_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company AI logs" ON ai_assistant_logs;
CREATE POLICY "Users can view their company AI logs"
ON ai_assistant_logs FOR SELECT
USING (
  company_id::text = (SELECT get_user_company_id(auth.uid())::text)
  OR is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can create AI logs for their company" ON ai_assistant_logs;
CREATE POLICY "Users can create AI logs for their company"
ON ai_assistant_logs FOR INSERT
WITH CHECK (
  company_id::text = (SELECT get_user_company_id(auth.uid())::text)
  OR is_platform_admin(auth.uid())
);

-- ============================================
-- 4. APPROVAL_SETTINGS TABLE RLS
-- ============================================
ALTER TABLE IF EXISTS approval_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approval settings" ON approval_settings;
CREATE POLICY "Users can view approval settings"
ON approval_settings FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can modify approval settings" ON approval_settings;
CREATE POLICY "Only admins can modify approval settings"
ON approval_settings FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_platform_admin(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_platform_admin(auth.uid())
);

-- ============================================
-- 5. PLAN_APPROVALS TABLE RLS  
-- ============================================
ALTER TABLE IF EXISTS plan_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view plan approvals for their company plans" ON plan_approvals;
CREATE POLICY "Users can view plan approvals for their company plans"
ON plan_approvals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM plans p
    WHERE p.id = plan_approvals.plan_id
    AND (
      p.company_id::text = (SELECT get_user_company_id(auth.uid())::text)
      OR is_platform_admin(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Approvers can update their assigned approvals" ON plan_approvals;
CREATE POLICY "Approvers can update their assigned approvals"
ON plan_approvals FOR UPDATE
USING (
  required_role = ANY(
    SELECT role FROM user_roles WHERE user_id = auth.uid()
  )
  OR is_platform_admin(auth.uid())
)
WITH CHECK (
  required_role = ANY(
    SELECT role FROM user_roles WHERE user_id = auth.uid()
  )
  OR is_platform_admin(auth.uid())
);

-- ============================================
-- 6. BOOKING_REQUESTS TABLE RLS
-- ============================================
ALTER TABLE IF EXISTS booking_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requester company can view their booking requests" ON booking_requests;
CREATE POLICY "Requester company can view their booking requests"
ON booking_requests FOR SELECT
USING (
  requester_company_id::text = (SELECT get_user_company_id(auth.uid())::text)
  OR owner_company_id::text = (SELECT get_user_company_id(auth.uid())::text)
  OR is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "Agency users can create booking requests" ON booking_requests;
CREATE POLICY "Agency users can create booking requests"
ON booking_requests FOR INSERT
WITH CHECK (
  requester_company_id::text = (SELECT get_user_company_id(auth.uid())::text)
  AND requested_by = auth.uid()
);

DROP POLICY IF EXISTS "Media owners can update booking request status" ON booking_requests;
CREATE POLICY "Media owners can update booking request status"
ON booking_requests FOR UPDATE
USING (
  owner_company_id::text = (SELECT get_user_company_id(auth.uid())::text)
  OR is_platform_admin(auth.uid())
)
WITH CHECK (
  owner_company_id::text = (SELECT get_user_company_id(auth.uid())::text)
  OR is_platform_admin(auth.uid())
);

-- ============================================
-- 7. COMMISSION_RULES TABLE RLS
-- ============================================
ALTER TABLE IF EXISTS commission_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active commission rules" ON commission_rules;
CREATE POLICY "Everyone can view active commission rules"
ON commission_rules FOR SELECT
USING (is_active = true OR is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Only platform admins can manage commission rules" ON commission_rules;
CREATE POLICY "Only platform admins can manage commission rules"
ON commission_rules FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));