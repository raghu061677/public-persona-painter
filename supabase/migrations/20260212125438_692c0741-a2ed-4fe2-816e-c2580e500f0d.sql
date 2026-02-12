
-- Phase-3.1: Invoice share tokens + audit log RLS tightening

-- A) Invoice share tokens table
CREATE TABLE IF NOT EXISTS public.invoice_share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invoice_id text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  is_revoked boolean NOT NULL DEFAULT false,
  max_uses integer DEFAULT NULL,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_share_tokens_token ON public.invoice_share_tokens(token) WHERE NOT is_revoked;
CREATE INDEX idx_invoice_share_tokens_invoice ON public.invoice_share_tokens(invoice_id);

ALTER TABLE public.invoice_share_tokens ENABLE ROW LEVEL SECURITY;

-- Only admin/finance of the company can manage share tokens
CREATE POLICY "share_tokens_select" ON public.invoice_share_tokens
FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND public.has_company_role(ARRAY['admin', 'finance']::public.app_role[])
);

CREATE POLICY "share_tokens_insert" ON public.invoice_share_tokens
FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.current_company_id()
  AND public.has_company_role(ARRAY['admin', 'finance']::public.app_role[])
);

CREATE POLICY "share_tokens_update" ON public.invoice_share_tokens
FOR UPDATE TO authenticated
USING (
  company_id = public.current_company_id()
  AND public.has_company_role(ARRAY['admin', 'finance']::public.app_role[])
);

-- B) Tighten audit log RLS: drop overly broad insert policy, restrict properly
DROP POLICY IF EXISTS "audit_log_insert" ON public.security_audit_log;
DROP POLICY IF EXISTS "audit_log_read_admin" ON public.security_audit_log;

-- Admin can read their company's audit logs
CREATE POLICY "audit_log_read_company_admin" ON public.security_audit_log
FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND public.has_company_role(ARRAY['admin']::public.app_role[])
);

-- Platform admin can read all audit logs
CREATE POLICY "audit_log_read_platform_admin" ON public.security_audit_log
FOR SELECT TO authenticated
USING (
  public.is_platform_admin(auth.uid())
);

-- No INSERT policy for authenticated = client cannot insert directly
-- Edge functions use service role for audit inserts (bypasses RLS)
-- This is intentional: audit logs must not be writable by clients
