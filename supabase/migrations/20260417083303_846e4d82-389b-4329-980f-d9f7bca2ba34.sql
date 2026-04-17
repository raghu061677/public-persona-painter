-- ============================================================
-- Phase 2: Panel-based Printing Costing (non-breaking extension)
-- ============================================================
-- Adds a child table for per-panel printing breakup and aggregate
-- columns on campaign_assets. Existing printing_charges is preserved
-- as the client-facing amount used by invoices/exports.
-- ============================================================

-- 1) Aggregate columns on campaign_assets (additive, NOT in the locked-financial trigger list)
ALTER TABLE public.campaign_assets
  ADD COLUMN IF NOT EXISTS printing_client_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS printing_vendor_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS printing_margin_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS printing_costing_mode text NOT NULL DEFAULT 'legacy';

-- 2) Child table for panel-wise printing
CREATE TABLE IF NOT EXISTS public.campaign_asset_printing_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  campaign_id text,
  campaign_asset_id uuid NOT NULL REFERENCES public.campaign_assets(id) ON DELETE CASCADE,
  panel_name text NOT NULL DEFAULT 'Panel 1',
  width_ft numeric NOT NULL DEFAULT 0,
  height_ft numeric NOT NULL DEFAULT 0,
  sqft numeric NOT NULL DEFAULT 0,
  illumination_type text NOT NULL DEFAULT 'Non Lit'
    CHECK (illumination_type IN ('Non Lit', 'Back Lit')),
  client_rate_per_sqft numeric NOT NULL DEFAULT 0,
  vendor_rate_per_sqft numeric NOT NULL DEFAULT 0,
  client_amount numeric NOT NULL DEFAULT 0,
  vendor_amount numeric NOT NULL DEFAULT 0,
  margin_amount numeric NOT NULL DEFAULT 0,
  printer_vendor_id uuid,
  printer_vendor_name text,
  printing_status text NOT NULL DEFAULT 'Pending'
    CHECK (printing_status IN ('Pending','Assigned','In Printing','Printed','Delivered','Installed')),
  payment_status text NOT NULL DEFAULT 'Unpaid',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capp_campaign_asset
  ON public.campaign_asset_printing_panels(campaign_asset_id);
CREATE INDEX IF NOT EXISTS idx_capp_campaign
  ON public.campaign_asset_printing_panels(campaign_id);
CREATE INDEX IF NOT EXISTS idx_capp_company
  ON public.campaign_asset_printing_panels(company_id);
CREATE INDEX IF NOT EXISTS idx_capp_status
  ON public.campaign_asset_printing_panels(printing_status);

-- 3) RLS — mirror campaign_assets pattern (auth select, admin/finance/operations write)
ALTER TABLE public.campaign_asset_printing_panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view printing panels"
  ON public.campaign_asset_printing_panels
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Privileged users can insert printing panels"
  ON public.campaign_asset_printing_panels
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
    OR public.has_role(auth.uid(), 'operations')
    OR public.has_role(auth.uid(), 'operations_manager')
  );

CREATE POLICY "Privileged users can update printing panels"
  ON public.campaign_asset_printing_panels
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
    OR public.has_role(auth.uid(), 'operations')
    OR public.has_role(auth.uid(), 'operations_manager')
  );

CREATE POLICY "Privileged users can delete printing panels"
  ON public.campaign_asset_printing_panels
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance')
    OR public.has_role(auth.uid(), 'operations')
    OR public.has_role(auth.uid(), 'operations_manager')
  );

-- 4) updated_at trigger
CREATE TRIGGER trg_capp_updated_at
  BEFORE UPDATE ON public.campaign_asset_printing_panels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Sync trigger: keep campaign_assets aggregates in sync with panels
--    Does NOT touch printing_charges (client billing remains immutable).
CREATE OR REPLACE FUNCTION public.sync_campaign_asset_printing_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset uuid;
  v_client numeric;
  v_vendor numeric;
  v_margin numeric;
  v_count integer;
BEGIN
  v_asset := COALESCE(NEW.campaign_asset_id, OLD.campaign_asset_id);
  IF v_asset IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COALESCE(SUM(client_amount), 0),
    COALESCE(SUM(vendor_amount), 0),
    COALESCE(SUM(margin_amount), 0),
    COUNT(*)
  INTO v_client, v_vendor, v_margin, v_count
  FROM public.campaign_asset_printing_panels
  WHERE campaign_asset_id = v_asset;

  UPDATE public.campaign_assets
  SET
    printing_client_amount = v_client,
    printing_vendor_amount = v_vendor,
    printing_margin_amount = v_margin,
    printing_costing_mode = CASE WHEN v_count > 0 THEN 'panel_based' ELSE 'legacy' END
  WHERE id = v_asset;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_printing_totals_ins
  AFTER INSERT ON public.campaign_asset_printing_panels
  FOR EACH ROW EXECUTE FUNCTION public.sync_campaign_asset_printing_totals();

CREATE TRIGGER trg_sync_printing_totals_upd
  AFTER UPDATE ON public.campaign_asset_printing_panels
  FOR EACH ROW EXECUTE FUNCTION public.sync_campaign_asset_printing_totals();

CREATE TRIGGER trg_sync_printing_totals_del
  AFTER DELETE ON public.campaign_asset_printing_panels
  FOR EACH ROW EXECUTE FUNCTION public.sync_campaign_asset_printing_totals();

-- 6) Backfill: legacy rows keep behaving — copy printing_charges → printing_client_amount.
--    Vendor and margin remain 0 until panels are configured. printing_charges itself is untouched.
UPDATE public.campaign_assets
SET printing_client_amount = COALESCE(printing_charges, 0)
WHERE printing_client_amount = 0
  AND COALESCE(printing_charges, 0) > 0;