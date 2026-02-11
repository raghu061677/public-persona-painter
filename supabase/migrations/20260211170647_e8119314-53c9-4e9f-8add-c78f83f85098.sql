
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

    -- Check overlap with campaign bookings ONLY for non-plan holds
    -- Plan-sourced approval holds are soft reservations and should not be blocked by existing campaigns
    IF NEW.source IS DISTINCT FROM 'plan' THEN
      IF EXISTS (
        SELECT 1 FROM public.campaign_assets ca
        JOIN public.campaigns c ON c.id = ca.campaign_id
        WHERE ca.asset_id = NEW.asset_id
          AND c.status IN ('Upcoming'::campaign_status, 'Running'::campaign_status, 'Planned'::campaign_status)
          AND COALESCE(c.is_deleted, false) = false
          AND ca.booking_start_date IS NOT NULL
          AND ca.booking_end_date IS NOT NULL
          AND public.dates_overlap(NEW.start_date, NEW.end_date, ca.booking_start_date::date, ca.booking_end_date::date)
      ) THEN
        RAISE EXCEPTION 'This asset has an active campaign booking overlapping % to %', NEW.start_date, NEW.end_date;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
