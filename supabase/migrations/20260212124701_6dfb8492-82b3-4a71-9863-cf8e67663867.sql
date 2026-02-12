
-- Phase-3: Security Audit Log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  user_id uuid,
  company_id uuid,
  action text NOT NULL,
  record_ids jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  ip_address text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_security_audit_log_user ON public.security_audit_log(user_id, created_at DESC);
CREATE INDEX idx_security_audit_log_company ON public.security_audit_log(company_id, created_at DESC);
CREATE INDEX idx_security_audit_log_function ON public.security_audit_log(function_name, created_at DESC);

-- Enable RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admin/finance can read audit logs for their company
CREATE POLICY "audit_log_read_admin" ON public.security_audit_log
FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND public.has_company_role(ARRAY['admin']::public.app_role[])
);

-- Insert allowed for authenticated (edge functions insert via service role anyway, but this is for safety)
CREATE POLICY "audit_log_insert" ON public.security_audit_log
FOR INSERT TO authenticated
WITH CHECK (true);

-- Retention: allow service-role cleanup only (no user deletes)
-- No DELETE policy = users can't delete audit logs
