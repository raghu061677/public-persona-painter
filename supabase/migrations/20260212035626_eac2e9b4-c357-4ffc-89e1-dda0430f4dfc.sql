
-- PHASE 2.1: Role-aware RPC patches + campaign share safety

-- A) list_invoices_limited - totals null for ops/viewer
DROP FUNCTION IF EXISTS public.list_invoices_limited();
CREATE FUNCTION public.list_invoices_limited()
RETURNS TABLE (
  id text,
  invoice_no text,
  invoice_date date,
  due_date date,
  status text,
  client_id text,
  client_name text,
  campaign_id text,
  total_amount numeric,
  balance_due numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_cid uuid; v_r text;
BEGIN
  v_cid := public.current_company_id();
  v_r := public."current_role"();
  IF v_cid IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT i.id, i.invoice_no, i.invoice_date::date, i.due_date::date, i.status,
    i.client_id, i.client_name, i.campaign_id,
    CASE WHEN v_r IN ('admin','finance','sales') THEN i.total_amount ELSE NULL::numeric END,
    CASE WHEN v_r IN ('admin','finance','sales') THEN i.balance_due ELSE NULL::numeric END
  FROM public.invoices i
  WHERE i.company_id = v_cid AND (i.is_deleted IS NOT TRUE)
  ORDER BY i.invoice_date DESC;
END; $fn$;

-- B) get_invoice_limited
DROP FUNCTION IF EXISTS public.get_invoice_limited(text);
CREATE FUNCTION public.get_invoice_limited(p_id text)
RETURNS TABLE (
  id text, invoice_no text, invoice_date date, due_date date, status text,
  client_id text, client_name text, campaign_id text,
  total_amount numeric, balance_due numeric, notes text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_cid uuid; v_r text;
BEGIN
  v_cid := public.current_company_id();
  v_r := public."current_role"();
  IF v_cid IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT i.id, i.invoice_no, i.invoice_date::date, i.due_date::date, i.status,
    i.client_id, i.client_name, i.campaign_id,
    CASE WHEN v_r IN ('admin','finance','sales') THEN i.total_amount ELSE NULL::numeric END,
    CASE WHEN v_r IN ('admin','finance','sales') THEN i.balance_due ELSE NULL::numeric END,
    i.notes
  FROM public.invoices i
  WHERE i.id = p_id AND i.company_id = v_cid AND (i.is_deleted IS NOT TRUE);
END; $fn$;

-- C) list_plans_limited
DROP FUNCTION IF EXISTS public.list_plans_limited();
CREATE FUNCTION public.list_plans_limited()
RETURNS TABLE (
  id text, plan_name text, client_id text, status text,
  start_date date, end_date date, total_amount numeric, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_cid uuid; v_r text;
BEGIN
  v_cid := public.current_company_id();
  v_r := public."current_role"();
  IF v_cid IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT p.id, p.plan_name, p.client_id, p.status,
    p.start_date::date, p.end_date::date,
    CASE WHEN v_r IN ('admin','finance','sales') THEN p.total_amount ELSE NULL::numeric END,
    p.created_at
  FROM public.plans p WHERE p.company_id = v_cid ORDER BY p.created_at DESC;
END; $fn$;

-- D) list_campaigns_limited
DROP FUNCTION IF EXISTS public.list_campaigns_limited();
CREATE FUNCTION public.list_campaigns_limited()
RETURNS TABLE (
  id text, campaign_name text, client_id text, client_name text,
  status text, start_date date, end_date date, total_amount numeric, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_cid uuid; v_r text;
BEGIN
  v_cid := public.current_company_id();
  v_r := public."current_role"();
  IF v_cid IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT c.id, c.campaign_name, c.client_id, c.client_name, c.status,
    c.start_date::date, c.end_date::date,
    CASE WHEN v_r IN ('admin','finance','sales') THEN c.total_amount ELSE NULL::numeric END,
    c.created_at
  FROM public.campaigns c WHERE c.company_id = v_cid ORDER BY c.created_at DESC;
END; $fn$;

-- E) get_campaign_limited
DROP FUNCTION IF EXISTS public.get_campaign_limited(text);
CREATE FUNCTION public.get_campaign_limited(p_id text)
RETURNS TABLE (
  id text, campaign_name text, client_id text, client_name text,
  status text, start_date date, end_date date, total_amount numeric,
  created_at timestamptz, plan_id text, notes text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_cid uuid; v_r text;
BEGIN
  v_cid := public.current_company_id();
  v_r := public."current_role"();
  IF v_cid IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT c.id, c.campaign_name, c.client_id, c.client_name, c.status,
    c.start_date::date, c.end_date::date,
    CASE WHEN v_r IN ('admin','finance','sales') THEN c.total_amount ELSE NULL::numeric END,
    c.created_at, c.plan_id, c.notes
  FROM public.campaigns c WHERE c.id = p_id AND c.company_id = v_cid;
END; $fn$;

-- F) Sanitized campaign public share view
DROP VIEW IF EXISTS public.campaign_public_share_safe;
CREATE VIEW public.campaign_public_share_safe AS
SELECT c.id, c.campaign_name, c.client_name, c.status, c.start_date, c.end_date,
  c.public_tracking_token, c.public_share_enabled
FROM public.campaigns c
WHERE c.public_share_enabled = true AND c.public_tracking_token IS NOT NULL;
GRANT SELECT ON public.campaign_public_share_safe TO anon, authenticated;

-- G) Lock RPC execution to authenticated only
REVOKE ALL ON FUNCTION public.list_invoices_limited() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_invoices_limited() TO authenticated;
REVOKE ALL ON FUNCTION public.get_invoice_limited(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invoice_limited(text) TO authenticated;
REVOKE ALL ON FUNCTION public.list_plans_limited() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_plans_limited() TO authenticated;
REVOKE ALL ON FUNCTION public.list_campaigns_limited() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_campaigns_limited() TO authenticated;
REVOKE ALL ON FUNCTION public.get_campaign_limited(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campaign_limited(text) TO authenticated;
