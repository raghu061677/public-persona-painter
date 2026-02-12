
-- ============================================================
-- PHASE-2: LIMITED RPC FUNCTIONS + SOFT DELETE + GRANTS
-- ============================================================

-- Soft delete columns on payment_records
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- list_invoices_limited: safe columns for sales (no GST breakup)
CREATE OR REPLACE FUNCTION public.list_invoices_limited(p_company_id uuid DEFAULT NULL)
RETURNS TABLE (
  id text, invoice_no text, client_id text, client_name text,
  campaign_id text, invoice_date date, due_date date,
  status text, total_amount numeric, balance_due numeric,
  paid_amount numeric, billing_month text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company_id uuid;
BEGIN
  v_company_id := current_company_id();
  IF v_company_id IS NULL AND NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF is_platform_admin(auth.uid()) THEN
    v_company_id := COALESCE(p_company_id, v_company_id);
  END IF;
  RETURN QUERY SELECT i.id, i.invoice_no, i.client_id, i.client_name,
    i.campaign_id, i.invoice_date, i.due_date, i.status::text,
    i.total_amount, i.balance_due, i.paid_amount, i.billing_month, i.created_at
  FROM invoices i WHERE i.company_id = v_company_id;
END; $$;

-- get_invoice_limited
CREATE OR REPLACE FUNCTION public.get_invoice_limited(p_invoice_id text)
RETURNS TABLE (
  id text, invoice_no text, client_id text, client_name text,
  campaign_id text, invoice_date date, due_date date,
  status text, total_amount numeric, balance_due numeric,
  paid_amount numeric, billing_month text, notes text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company_id uuid;
BEGIN
  v_company_id := current_company_id();
  IF v_company_id IS NULL AND NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT i.id, i.invoice_no, i.client_id, i.client_name,
    i.campaign_id, i.invoice_date, i.due_date, i.status::text,
    i.total_amount, i.balance_due, i.paid_amount, i.billing_month, i.notes, i.created_at
  FROM invoices i WHERE i.id = p_invoice_id
    AND (i.company_id = v_company_id OR is_platform_admin(auth.uid()));
END; $$;

-- list_campaigns_limited: no financial columns
CREATE OR REPLACE FUNCTION public.list_campaigns_limited(p_company_id uuid DEFAULT NULL)
RETURNS TABLE (
  id text, campaign_name text, client_id text, client_name text,
  plan_id text, start_date date, end_date date, status text,
  total_assets integer, assigned_to uuid, notes text,
  created_at timestamptz, is_deleted boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company_id uuid;
BEGIN
  v_company_id := current_company_id();
  IF v_company_id IS NULL AND NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF is_platform_admin(auth.uid()) THEN
    v_company_id := COALESCE(p_company_id, v_company_id);
  END IF;
  RETURN QUERY SELECT c.id, c.campaign_name, c.client_id, c.client_name,
    c.plan_id, c.start_date, c.end_date, c.status::text,
    c.total_assets, c.assigned_to, c.notes, c.created_at, c.is_deleted
  FROM campaigns c WHERE c.company_id = v_company_id;
END; $$;

-- get_campaign_limited
CREATE OR REPLACE FUNCTION public.get_campaign_limited(p_campaign_id text)
RETURNS TABLE (
  id text, campaign_name text, client_id text, client_name text,
  plan_id text, start_date date, end_date date, status text,
  total_assets integer, assigned_to uuid, notes text,
  created_at timestamptz, billing_cycle text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company_id uuid;
BEGIN
  v_company_id := current_company_id();
  IF v_company_id IS NULL AND NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT c.id, c.campaign_name, c.client_id, c.client_name,
    c.plan_id, c.start_date, c.end_date, c.status::text,
    c.total_assets, c.assigned_to, c.notes, c.created_at, c.billing_cycle
  FROM campaigns c WHERE c.id = p_campaign_id
    AND (c.company_id = v_company_id OR is_platform_admin(auth.uid()));
END; $$;

-- list_plans_limited
CREATE OR REPLACE FUNCTION public.list_plans_limited(p_company_id uuid DEFAULT NULL)
RETURNS TABLE (
  id text, plan_name text, client_id text, client_name text,
  start_date date, end_date date, status text,
  total_locations integer, notes text, created_at timestamptz, created_by uuid
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company_id uuid;
BEGIN
  v_company_id := current_company_id();
  IF v_company_id IS NULL AND NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF is_platform_admin(auth.uid()) THEN
    v_company_id := COALESCE(p_company_id, v_company_id);
  END IF;
  RETURN QUERY SELECT p.id, p.plan_name, p.client_id, p.client_name,
    p.start_date, p.end_date, p.status::text,
    p.total_locations, p.notes, p.created_at, p.created_by
  FROM plans p WHERE p.company_id = v_company_id;
END; $$;

-- Grants
GRANT EXECUTE ON FUNCTION public.list_invoices_limited TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_limited TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_campaigns_limited TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_limited TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_plans_limited TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_invoices_limited FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_invoice_limited FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_campaigns_limited FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_campaign_limited FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_plans_limited FROM anon, public;
