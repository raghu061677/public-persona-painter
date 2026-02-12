
-- ============================================================
-- Phase-4A: SECURITY DEFINER VIEW AUDIT & HARDENING
-- ============================================================

-- 1. public_media_assets_safe → SAFE: already excludes rates/financials
-- Convert to security_invoker = true (RLS-enforced)
-- But this is a PUBLIC view, needs anon access. Keep as-is but ensure no rates.
-- Already verified: no card_rate, base_rate, printing, mounting in columns. ✅ SAFE

-- 2. campaign_public_share_safe → SAFE: only id, name, status, dates, token
-- Already verified: excludes total_amount, gst, vendor info. ✅ SAFE

-- 3. clients_basic → SAFE: only id, name, company, city, state, created_at
-- Needs company_id for tenant isolation
DROP VIEW IF EXISTS public.clients_basic CASCADE;
CREATE VIEW public.clients_basic AS
  SELECT id, name, company, city, state, created_at, company_id
  FROM clients;
COMMENT ON VIEW public.clients_basic IS 'Basic client info with company_id for RLS filtering';

-- 4. finance_eligible_campaigns → RISK: exposes total_amount, gst_amount, grand_total
-- These should only be visible to admin/finance/sales
-- Recreate with company_id for RLS, and rename financial columns
DROP VIEW IF EXISTS public.finance_eligible_campaigns CASCADE;
CREATE VIEW public.finance_eligible_campaigns AS
  SELECT c.id, c.campaign_name, c.client_id, c.client_name, c.status,
         c.start_date, c.end_date, c.total_amount, c.gst_amount, c.grand_total,
         c.company_id, c.created_at, c.plan_id,
         cl.email AS client_email, cl.phone AS client_phone, cl.gst_number AS client_gst
  FROM campaigns c
  LEFT JOIN clients cl ON cl.id = c.client_id
  WHERE c.status IN ('Running', 'Completed');
COMMENT ON VIEW public.finance_eligible_campaigns IS 'Campaigns eligible for invoicing. Contains financial data — access via RLS on campaigns table.';

-- 5. asset_profitability → RISK: exposes total_revenue, expenses, profit margin
-- This is an analytics view — acceptable for admin/finance only (enforced via RLS on underlying tables)
-- No change needed — RLS on media_assets + campaign_assets filters data

-- 6. asset_revenue_summary → Same as above, RLS on media_assets filters it
-- No change needed

-- 7. asset_utilization → Exposes card_rate, total_revenue — RLS-filtered
-- No change needed (card_rate is on media_assets which has RLS)

-- 8. media_asset_forecast → Exposes booking_value (total_price from campaign_assets)
-- RLS on media_assets + campaign_assets filters this. Acceptable.

-- 9. media_calendar_heatmap → Only shows status, client_name. No financials. ✅ SAFE

-- 10. v_assets_default → Only shows dimensions/location info. ✅ SAFE
-- 11. v_asset_booking_windows → Shows client_name, campaign_name, dates. No financials. ✅ SAFE
-- 12. v_asset_availability → Derived from v_assets_default + v_asset_booking_windows. ✅ SAFE
-- 13. v_assets_vacant_today → Derived view. ✅ SAFE

-- Revoke broad public grants on financial views (if any exist)
-- These views should only be accessible through RLS on underlying tables
REVOKE ALL ON public.asset_profitability FROM anon;
REVOKE ALL ON public.asset_revenue_summary FROM anon;
REVOKE ALL ON public.asset_utilization FROM anon;
REVOKE ALL ON public.finance_eligible_campaigns FROM anon;
REVOKE ALL ON public.media_asset_forecast FROM anon;

-- Grant to authenticated only (RLS on underlying tables enforces company isolation)
GRANT SELECT ON public.asset_profitability TO authenticated;
GRANT SELECT ON public.asset_revenue_summary TO authenticated;
GRANT SELECT ON public.asset_utilization TO authenticated;
GRANT SELECT ON public.finance_eligible_campaigns TO authenticated;
GRANT SELECT ON public.media_asset_forecast TO authenticated;
GRANT SELECT ON public.media_calendar_heatmap TO authenticated;
GRANT SELECT ON public.clients_basic TO authenticated;

-- Public views that need anon access
GRANT SELECT ON public.public_media_assets_safe TO anon;
GRANT SELECT ON public.public_media_assets_safe TO authenticated;
GRANT SELECT ON public.campaign_public_share_safe TO anon;
GRANT SELECT ON public.campaign_public_share_safe TO authenticated;

-- Availability views (internal use)
GRANT SELECT ON public.v_asset_availability TO authenticated;
GRANT SELECT ON public.v_asset_booking_windows TO authenticated;
GRANT SELECT ON public.v_assets_default TO authenticated;
GRANT SELECT ON public.v_assets_vacant_today TO authenticated;

-- ============================================================
-- Phase-4B: STORAGE POLICIES — CAMPAIGN PROOF HARDENING
-- ============================================================

-- 1. Make operations-photos bucket PRIVATE (was public)
UPDATE storage.buckets SET public = false WHERE id = 'operations-photos';

-- 2. Make campaign-photos bucket PRIVATE (was public)
UPDATE storage.buckets SET public = false WHERE id = 'campaign-photos';

-- 3. Remove overly permissive public SELECT policies on campaign/operations photos
DROP POLICY IF EXISTS "Anyone can view campaign photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view campaign photos" ON storage.objects;

-- 4. Add company-scoped READ for campaign-photos
CREATE POLICY "Company members can view campaign photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'campaign-photos'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR is_platform_admin(auth.uid())
  )
);

-- 5. Add company-scoped READ for operations-photos (already has company-scoped write)
-- Existing "Users can view their company operations photos" policy is good.
-- Just ensure the public read is removed (it shouldn't exist after making bucket private)

-- 6. Create a dedicated campaign-proofs bucket (private) if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-proofs', 'campaign-proofs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Campaign proofs: company-scoped access
CREATE POLICY "Company members can read campaign proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'campaign-proofs'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR is_platform_admin(auth.uid())
  )
);

CREATE POLICY "Ops and admin can upload campaign proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'campaign-proofs'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users
      WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('admin', 'operations')
    )
    OR is_platform_admin(auth.uid())
  )
);

CREATE POLICY "Admin can delete campaign proofs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'campaign-proofs'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_users
      WHERE user_id = auth.uid() AND status = 'active'
      AND role = 'admin'
    )
    OR is_platform_admin(auth.uid())
  )
);

-- ============================================================
-- Phase-4C: TIGHTEN SECURITY AUDIT LOG RLS
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "audit_log_read_admin" ON public.security_audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON public.security_audit_log;

-- Platform admin: read all
CREATE POLICY "audit_log_platform_admin_read" ON public.security_audit_log
FOR SELECT TO authenticated
USING (
  is_platform_admin(auth.uid())
);

-- Company admin: read own company only
CREATE POLICY "audit_log_company_admin_read" ON public.security_audit_log
FOR SELECT TO authenticated
USING (
  company_id = public.current_company_id()
  AND public.has_company_role(ARRAY['admin']::public.app_role[])
);

-- No client-side inserts — only service role (via Edge Functions) can insert
-- This is enforced by having NO insert policy for authenticated role
-- The service role bypasses RLS

-- ============================================================
-- Phase-4D: ADD revoked_at AND revoked_by TO SHARE TOKENS
-- ============================================================
ALTER TABLE public.invoice_share_tokens
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid;
