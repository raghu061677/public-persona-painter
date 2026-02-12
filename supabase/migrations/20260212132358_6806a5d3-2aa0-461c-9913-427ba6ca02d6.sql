
-- ============================================================
-- Phase-4A.2: Convert all views to SECURITY INVOKER
-- This makes views respect the querying user's RLS policies
-- instead of the view creator's permissions.
-- ============================================================

-- Set security_invoker = true on ALL public views
ALTER VIEW public.asset_profitability SET (security_invoker = true);
ALTER VIEW public.asset_revenue_summary SET (security_invoker = true);
ALTER VIEW public.asset_utilization SET (security_invoker = true);
ALTER VIEW public.campaign_public_share_safe SET (security_invoker = true);
ALTER VIEW public.clients_basic SET (security_invoker = true);
ALTER VIEW public.finance_eligible_campaigns SET (security_invoker = true);
ALTER VIEW public.media_asset_forecast SET (security_invoker = true);
ALTER VIEW public.media_calendar_heatmap SET (security_invoker = true);
ALTER VIEW public.public_media_assets_safe SET (security_invoker = true);
ALTER VIEW public.v_asset_availability SET (security_invoker = true);
ALTER VIEW public.v_asset_booking_windows SET (security_invoker = true);
ALTER VIEW public.v_assets_default SET (security_invoker = true);
ALTER VIEW public.v_assets_vacant_today SET (security_invoker = true);

-- Also fix the other views that exist
ALTER VIEW IF EXISTS public.asset_expense_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.client_outstanding_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.invoice_aging_report SET (security_invoker = true);
ALTER VIEW IF EXISTS public.user_roles_compat SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_invoice_dues SET (security_invoker = true);
