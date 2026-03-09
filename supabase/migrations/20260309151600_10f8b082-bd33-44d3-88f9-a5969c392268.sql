
-- ============================================================
-- PART 1: Secure Summary Views for list pages
-- ============================================================

-- A. clients_summary_secure — hides contact info and financial data
CREATE OR REPLACE VIEW public.clients_summary_secure AS
SELECT
  id,
  company_id,
  name AS client_name,
  gst_number,
  billing_address_line1,
  billing_address_line2,
  billing_city,
  billing_state,
  billing_pincode,
  shipping_address_line1,
  shipping_address_line2,
  shipping_city,
  shipping_state,
  shipping_pincode,
  city,
  state,
  created_by,
  owner_id,
  secondary_owner_ids,
  created_at,
  updated_at
FROM public.clients;

-- B. plans_summary_secure — hides financial fields
CREATE OR REPLACE VIEW public.plans_summary_secure AS
SELECT
  p.id,
  p.company_id,
  p.plan_name,
  p.client_id,
  p.client_name,
  p.start_date,
  p.end_date,
  p.status,
  p.plan_type,
  p.duration_days,
  p.created_by,
  p.owner_id,
  p.secondary_owner_ids,
  p.created_at,
  p.updated_at,
  (SELECT count(*) FROM public.plan_items pi WHERE pi.plan_id = p.id) AS asset_count
FROM public.plans p;

-- C. campaigns_summary_secure — hides billing/financial fields
CREATE OR REPLACE VIEW public.campaigns_summary_secure AS
SELECT
  c.id,
  c.company_id,
  c.campaign_name,
  c.client_id,
  c.client_name,
  c.plan_id,
  c.start_date,
  c.end_date,
  c.status,
  c.total_assets,
  c.created_by,
  c.owner_id,
  c.secondary_owner_ids,
  c.created_at,
  c.updated_at,
  c.public_tracking_token,
  c.public_share_enabled
FROM public.campaigns c;

-- D. invoices_summary_secure — hides amounts for restricted users
CREATE OR REPLACE VIEW public.invoices_summary_secure AS
SELECT
  id,
  company_id,
  client_id,
  client_name,
  campaign_id,
  status,
  invoice_date,
  due_date,
  created_by,
  created_at,
  updated_at
FROM public.invoices;

-- ============================================================
-- PART 2: Secure detail RPC functions
-- ============================================================

-- get_record_access_mode: returns 'FULL_DETAIL', 'SUMMARY_READONLY', or 'NO_ACCESS'
CREATE OR REPLACE FUNCTION public.get_record_access_mode(
  p_table_name text,
  p_record_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_record_company_id uuid;
  v_record_created_by uuid;
  v_record_owner_id uuid;
  v_record_secondary_owners uuid[];
  v_is_admin boolean := false;
  v_access_mode text := 'NO_ACCESS';
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('mode', 'NO_ACCESS', 'reason', 'unauthenticated');
  END IF;

  -- Get user's company
  SELECT cu.company_id INTO v_company_id
  FROM public.company_users cu
  WHERE cu.user_id = v_user_id
  LIMIT 1;

  -- Check admin
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_user_id AND ur.role = 'admin'
  ) INTO v_is_admin;

  -- Get record ownership info based on table
  IF p_table_name = 'clients' THEN
    SELECT c.company_id, c.created_by, c.owner_id, c.secondary_owner_ids
    INTO v_record_company_id, v_record_created_by, v_record_owner_id, v_record_secondary_owners
    FROM public.clients c WHERE c.id = p_record_id;
  ELSIF p_table_name = 'plans' THEN
    SELECT p.company_id, p.created_by, p.owner_id, p.secondary_owner_ids
    INTO v_record_company_id, v_record_created_by, v_record_owner_id, v_record_secondary_owners
    FROM public.plans p WHERE p.id = p_record_id;
  ELSIF p_table_name = 'campaigns' THEN
    SELECT ca.company_id, ca.created_by, ca.owner_id, ca.secondary_owner_ids
    INTO v_record_company_id, v_record_created_by, v_record_owner_id, v_record_secondary_owners
    FROM public.campaigns ca WHERE ca.id = p_record_id;
  ELSE
    RETURN jsonb_build_object('mode', 'NO_ACCESS', 'reason', 'unknown_table');
  END IF;

  -- Record not found
  IF v_record_company_id IS NULL THEN
    RETURN jsonb_build_object('mode', 'NO_ACCESS', 'reason', 'not_found');
  END IF;

  -- Cross-company = NO_ACCESS
  IF v_company_id IS DISTINCT FROM v_record_company_id THEN
    RETURN jsonb_build_object('mode', 'NO_ACCESS', 'reason', 'cross_company');
  END IF;

  -- Admin = FULL_DETAIL
  IF v_is_admin THEN
    RETURN jsonb_build_object('mode', 'FULL_DETAIL', 'reason', 'admin');
  END IF;

  -- Owner/creator/secondary = FULL_DETAIL
  IF v_user_id = v_record_created_by
     OR v_user_id = v_record_owner_id
     OR (v_record_secondary_owners IS NOT NULL AND v_user_id = ANY(v_record_secondary_owners))
  THEN
    RETURN jsonb_build_object('mode', 'FULL_DETAIL', 'reason', 'owner');
  END IF;

  -- Same company = SUMMARY_READONLY
  RETURN jsonb_build_object('mode', 'SUMMARY_READONLY', 'reason', 'same_company');
END;
$$;

-- ============================================================
-- PART 3: Indexes for ownership fields
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_plans_owner_id ON public.plans(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner_id ON public.campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);

-- ============================================================
-- PART 4: Backfill owner_id from created_by where null
-- ============================================================
UPDATE public.clients SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE public.plans SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
UPDATE public.campaigns SET owner_id = created_by WHERE owner_id IS NULL AND created_by IS NOT NULL;
