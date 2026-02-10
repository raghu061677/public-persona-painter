
-- ============================================
-- Asset Holds / Blocks — additive table
-- ============================================

-- 1) Helper: dates_overlap
CREATE OR REPLACE FUNCTION public.dates_overlap(
  a_start date, a_end date, b_start date, b_end date
) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT a_start <= b_end AND b_start <= a_end;
$$;

-- 2) Table: asset_holds
CREATE TABLE public.asset_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  asset_id text NOT NULL REFERENCES public.media_assets(id),
  client_id text NULL REFERENCES public.clients(id),
  client_name text NULL,
  hold_type text NOT NULL CHECK (hold_type IN ('OPTION','SOFT_HOLD','HARD_BLOCK')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RELEASED','EXPIRED','CONVERTED')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  priority int NOT NULL DEFAULT 50,
  notes text NULL,
  created_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  converted_campaign_id text NULL REFERENCES public.campaigns(id)
);

-- Indexes
CREATE INDEX idx_asset_holds_asset_dates ON public.asset_holds (asset_id, start_date, end_date);
CREATE INDEX idx_asset_holds_company ON public.asset_holds (company_id);
CREATE INDEX idx_asset_holds_status ON public.asset_holds (status);

-- 3) Validation trigger
CREATE OR REPLACE FUNCTION public.validate_asset_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enforce end_date >= start_date
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'End date (%) must be on or after start date (%)', NEW.end_date, NEW.start_date;
  END IF;

  -- Set updated_at
  NEW.updated_at := now();

  -- Only validate overlaps for ACTIVE holds
  IF NEW.status = 'ACTIVE' THEN
    -- Check overlap with other ACTIVE holds for same asset
    IF EXISTS (
      SELECT 1 FROM public.asset_holds
      WHERE asset_id = NEW.asset_id
        AND status = 'ACTIVE'
        AND id IS DISTINCT FROM NEW.id
        AND public.dates_overlap(NEW.start_date, NEW.end_date, start_date, end_date)
    ) THEN
      RAISE EXCEPTION 'This asset already has an active hold overlapping % to %', NEW.start_date, NEW.end_date;
    END IF;

    -- Check overlap with campaign bookings (Upcoming/Running campaigns only)
    IF EXISTS (
      SELECT 1 FROM public.campaign_assets ca
      JOIN public.campaigns c ON c.id = ca.campaign_id
      WHERE ca.asset_id = NEW.asset_id
        AND c.status IN ('Upcoming','Running','upcoming','running','planned','Planned')
        AND COALESCE(c.is_deleted, false) = false
        AND ca.booking_start_date IS NOT NULL
        AND ca.booking_end_date IS NOT NULL
        AND public.dates_overlap(NEW.start_date, NEW.end_date, ca.booking_start_date::date, ca.booking_end_date::date)
    ) THEN
      RAISE EXCEPTION 'This asset has an active campaign booking overlapping % to %', NEW.start_date, NEW.end_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_asset_hold
  BEFORE INSERT OR UPDATE ON public.asset_holds
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_asset_hold();

-- 4) RLS
ALTER TABLE public.asset_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_holds_select" ON public.asset_holds
  FOR SELECT TO authenticated
  USING (
    company_id = public.get_current_user_company_id()
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "asset_holds_insert" ON public.asset_holds
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_current_user_company_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sales'::app_role))
  );

CREATE POLICY "asset_holds_update" ON public.asset_holds
  FOR UPDATE TO authenticated
  USING (
    company_id = public.get_current_user_company_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sales'::app_role))
  );

CREATE POLICY "asset_holds_delete" ON public.asset_holds
  FOR DELETE TO authenticated
  USING (
    company_id = public.get_current_user_company_id()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );
