
-- GO-ADS | Daily Alerts: Views, Functions, Tables

-- 1) Default asset columns view
CREATE OR REPLACE VIEW public.v_assets_default AS
SELECT a.id AS asset_id, a.area, a.location, a.direction, a.dimensions AS dimension, a.total_sqft AS sqft, a.illumination_type AS illumination
FROM public.media_assets a;

-- 2) Booking windows per asset
CREATE OR REPLACE VIEW public.v_asset_booking_windows AS
WITH ca AS (
  SELECT ca.asset_id, ca.campaign_id, ca.booking_start_date AS start_date, ca.booking_end_date AS end_date, c.client_name, c.campaign_name, c.status AS campaign_status
  FROM public.campaign_assets ca JOIN public.campaigns c ON c.id = ca.campaign_id
  WHERE COALESCE(c.is_deleted, false) = false AND c.status NOT IN ('Cancelled', 'Archived') AND ca.booking_start_date IS NOT NULL AND ca.booking_end_date IS NOT NULL
),
live AS (SELECT DISTINCT ON (asset_id) asset_id, campaign_id, client_name, campaign_name, start_date, end_date FROM ca WHERE current_date BETWEEN start_date AND end_date ORDER BY asset_id, end_date DESC),
next_up AS (SELECT DISTINCT ON (asset_id) asset_id, campaign_id, client_name, campaign_name, start_date, end_date FROM ca WHERE start_date > current_date ORDER BY asset_id, start_date ASC),
last_end AS (SELECT DISTINCT ON (asset_id) asset_id, end_date FROM ca WHERE end_date < current_date ORDER BY asset_id, end_date DESC)
SELECT a.asset_id, l.campaign_id AS live_campaign_id, l.client_name AS live_client_name, l.campaign_name AS live_campaign_name, l.start_date AS live_start_date, l.end_date AS live_end_date, n.campaign_id AS next_campaign_id, n.client_name AS next_client_name, n.campaign_name AS next_campaign_name, n.start_date AS next_start_date, n.end_date AS next_end_date, e.end_date AS last_end_date
FROM public.v_assets_default a LEFT JOIN live l ON l.asset_id = a.asset_id LEFT JOIN next_up n ON n.asset_id = a.asset_id LEFT JOIN last_end e ON e.asset_id = a.asset_id;

-- 3) Availability view
CREATE OR REPLACE VIEW public.v_asset_availability AS
SELECT d.asset_id, d.area, d.location, d.direction, d.dimension, d.sqft, d.illumination,
  CASE WHEN w.live_campaign_id IS NOT NULL THEN 'BOOKED_LIVE' WHEN w.next_campaign_id IS NOT NULL THEN 'BOOKED_UPCOMING' ELSE 'AVAILABLE' END AS availability_status,
  w.live_campaign_id, w.live_client_name, w.live_campaign_name, w.live_start_date, w.live_end_date,
  w.next_campaign_id, w.next_client_name, w.next_campaign_name, w.next_start_date, w.next_end_date,
  CASE WHEN w.live_campaign_id IS NOT NULL THEN NULL WHEN w.next_campaign_id IS NOT NULL THEN (w.next_end_date + 1) ELSE current_date END AS available_from
FROM public.v_assets_default d LEFT JOIN public.v_asset_booking_windows w ON w.asset_id = d.asset_id;

-- 4) Vacant today
CREATE OR REPLACE VIEW public.v_assets_vacant_today AS
SELECT * FROM public.v_asset_availability WHERE availability_status = 'AVAILABLE' ORDER BY area, location, asset_id;

-- 5) Assets ending within X days
CREATE OR REPLACE FUNCTION public.fn_assets_ending_within(days_ahead int)
RETURNS TABLE (bucket text, asset_id text, area text, location text, direction text, dimension text, sqft numeric, illumination text, campaign_id text, client_name text, campaign_name text, booking_end_date date)
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN v.live_end_date = current_date THEN 'ENDING_TODAY' ELSE 'ENDING_IN_' || days_ahead::text || '_DAYS' END,
    v.asset_id, v.area, v.location, v.direction, v.dimension, v.sqft, v.illumination, v.live_campaign_id, v.live_client_name, v.live_campaign_name, v.live_end_date
  FROM public.v_asset_availability v WHERE v.live_campaign_id IS NOT NULL AND v.live_end_date BETWEEN current_date AND (current_date + days_ahead)
  ORDER BY v.live_end_date, v.area, v.location, v.asset_id;
$$;

-- 6) Campaigns ending within X days (correct enum values)
CREATE OR REPLACE FUNCTION public.fn_campaigns_ending_within(days_ahead int)
RETURNS TABLE (campaign_id text, campaign_name text, client_name text, start_date date, end_date date, total_assets int)
LANGUAGE sql STABLE AS $$
  SELECT c.id, c.campaign_name, c.client_name, c.start_date, c.end_date, COALESCE(c.total_assets, 0)
  FROM public.campaigns c
  WHERE COALESCE(c.is_deleted, false) = false AND c.status IN ('Running','Upcoming','Planned','Draft','Assigned','InProgress') AND c.end_date BETWEEN current_date AND (current_date + days_ahead)
  ORDER BY c.end_date ASC, c.id ASC;
$$;

-- 7) Assets for campaign
CREATE OR REPLACE FUNCTION public.fn_assets_for_campaign(p_campaign_id text)
RETURNS TABLE (asset_id text, area text, location text, direction text, dimension text, sqft numeric, illumination text, booking_start_date date, booking_end_date date)
LANGUAGE sql STABLE AS $$
  SELECT a.asset_id, a.area, a.location, a.direction, a.dimension, a.sqft, a.illumination, ca.booking_start_date, ca.booking_end_date
  FROM public.campaign_assets ca JOIN public.v_assets_default a ON a.asset_id = ca.asset_id WHERE ca.campaign_id = p_campaign_id
  ORDER BY ca.booking_end_date ASC, a.area, a.location, a.asset_id;
$$;

-- 8) Assets for invoice
CREATE OR REPLACE FUNCTION public.fn_assets_for_invoice(p_invoice_id text)
RETURNS TABLE (asset_id text, area text, location text, direction text, dimension text, sqft numeric, illumination text, booking_start_date date, booking_end_date date)
LANGUAGE sql STABLE AS $$
  WITH inv AS (SELECT id, campaign_id, invoice_period_start, invoice_period_end FROM public.invoices WHERE id = p_invoice_id)
  SELECT a.asset_id, a.area, a.location, a.direction, a.dimension, a.sqft, a.illumination, ca.booking_start_date, ca.booking_end_date
  FROM inv JOIN public.campaign_assets ca ON ca.campaign_id = inv.campaign_id JOIN public.v_assets_default a ON a.asset_id = ca.asset_id
  WHERE inv.campaign_id IS NOT NULL AND (inv.invoice_period_start IS NULL OR inv.invoice_period_end IS NULL OR (ca.booking_start_date <= inv.invoice_period_end AND ca.booking_end_date >= inv.invoice_period_start))
  ORDER BY ca.booking_end_date ASC, a.area, a.location, a.asset_id;
$$;

-- 9) Invoice dues view
CREATE OR REPLACE VIEW public.v_invoice_dues AS
SELECT i.id AS invoice_id, i.client_name, i.campaign_id, i.invoice_date, i.due_date, i.total_amount, COALESCE(i.paid_amount,0) AS paid_amount, COALESCE(i.balance_due,0) AS outstanding, i.status AS invoice_status,
  CASE WHEN COALESCE(i.balance_due,0) <= 0 THEN 'PAID' WHEN i.due_date IS NULL THEN 'NO_DUE_DATE' WHEN i.due_date < current_date THEN 'OVERDUE' WHEN i.due_date = current_date THEN 'DUE_TODAY' WHEN i.due_date <= current_date + 7 THEN 'DUE_NEXT_7_DAYS' ELSE 'OPEN' END AS due_bucket
FROM public.invoices i WHERE i.status NOT IN ('Cancelled', 'Draft');

-- 10) Daily digest settings
CREATE TABLE IF NOT EXISTS public.daily_digest_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enabled boolean NOT NULL DEFAULT true, daily_time time NOT NULL DEFAULT '09:00', timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  recipients_to text[] NOT NULL DEFAULT '{}'::text[], recipients_cc text[] NOT NULL DEFAULT '{}'::text[], windows_days int[] NOT NULL DEFAULT ARRAY[3,7,15],
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS daily_digest_settings_singleton ON public.daily_digest_settings ((true));
ALTER TABLE public.daily_digest_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view digest settings" ON public.daily_digest_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated can update digest settings" ON public.daily_digest_settings FOR UPDATE USING (true);
CREATE POLICY "Authenticated can insert digest settings" ON public.daily_digest_settings FOR INSERT WITH CHECK (true);

-- 11) Alert log
CREATE TABLE IF NOT EXISTS public.alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), alert_date date NOT NULL, alert_type text NOT NULL, entity_type text NOT NULL, entity_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alert_date, alert_type, entity_type, entity_id)
);
ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view alert logs" ON public.alert_log FOR SELECT USING (true);
CREATE POLICY "Can insert alert logs" ON public.alert_log FOR INSERT WITH CHECK (true);
