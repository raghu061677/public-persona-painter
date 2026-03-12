
-- ============================================================
-- asset_availability_view — Unified availability layer
-- ============================================================
-- This view exposes EVERY booking window (campaigns + holds) as
-- individual rows, PLUS a "base" row for every asset so assets
-- with no bookings still appear. Consumers filter by date range
-- overlap to determine availability for any arbitrary period.
--
-- Business rules:
--  1. Dropped campaign assets block only up to effective_end_date
--  2. Holds block only during active hold dates
--  3. Cancelled/Archived/Completed campaigns excluded
--  4. Every asset appears at least once (even if fully available)
-- ============================================================

DROP VIEW IF EXISTS public.asset_availability_view CASCADE;

CREATE OR REPLACE VIEW public.asset_availability_view AS

-- CTE: All active campaign booking windows
WITH campaign_bookings AS (
  SELECT
    ca.asset_id,
    ca.campaign_id,
    c.campaign_name,
    c.client_name,
    c.status AS campaign_status,
    COALESCE(ca.effective_start_date, ca.booking_start_date, c.start_date)::date AS booking_start,
    COALESCE(ca.effective_end_date, ca.booking_end_date, c.end_date)::date AS booking_end,
    ca.is_removed,
    ca.dropped_on,
    ca.drop_reason,
    CASE
      WHEN COALESCE(ca.effective_start_date, ca.booking_start_date, c.start_date)::date <= CURRENT_DATE
       AND COALESCE(ca.effective_end_date, ca.booking_end_date, c.end_date)::date >= CURRENT_DATE
       AND ca.is_removed = false
      THEN true ELSE false
    END AS is_running_now,
    CASE
      WHEN COALESCE(ca.effective_start_date, ca.booking_start_date, c.start_date)::date > CURRENT_DATE
       AND ca.is_removed = false
      THEN true ELSE false
    END AS is_future_booking
  FROM campaign_assets ca
  JOIN campaigns c ON c.id = ca.campaign_id
  WHERE c.is_deleted = false
    AND c.status NOT IN ('Cancelled', 'Archived', 'Completed')
    -- Include dropped assets: they block up to effective_end_date
    -- Exclude dropped assets whose effective window has fully passed
    AND (
      ca.is_removed = false
      OR (
        ca.is_removed = true
        AND COALESCE(ca.effective_end_date, ca.booking_end_date, c.end_date)::date >= CURRENT_DATE
      )
    )
),

-- CTE: Active holds
active_holds AS (
  SELECT
    ah.asset_id,
    ah.id AS hold_id,
    ah.client_name,
    ah.source_plan_id,
    ah.start_date::date AS hold_start,
    ah.end_date::date AS hold_end,
    ah.hold_type,
    ah.status AS hold_status,
    CASE
      WHEN ah.start_date::date <= CURRENT_DATE AND ah.end_date::date >= CURRENT_DATE
      THEN true ELSE false
    END AS is_active_now,
    CASE
      WHEN ah.start_date::date > CURRENT_DATE
      THEN true ELSE false
    END AS is_future_hold
  FROM asset_holds ah
  WHERE ah.status = 'ACTIVE'
),

-- CTE: Next available date per asset
-- Max end date across all current/future blocking entries + 1 day
next_avail AS (
  SELECT
    sub.asset_id,
    (MAX(sub.block_end) + INTERVAL '1 day')::date AS next_available_date
  FROM (
    SELECT cb.asset_id, cb.booking_end AS block_end
    FROM campaign_bookings cb
    WHERE cb.booking_end >= CURRENT_DATE AND cb.is_removed = false
    UNION ALL
    SELECT ah.asset_id, ah.hold_end AS block_end
    FROM active_holds ah
    WHERE ah.hold_end >= CURRENT_DATE
  ) sub
  GROUP BY sub.asset_id
)

-- ============ UNION 1: Campaign booking rows ============
SELECT
  ma.id AS asset_id,
  ma.media_asset_code,
  ma.location,
  ma.area,
  ma.city,
  ma.media_type,
  ma.category,
  ma.dimensions AS size,
  ma.direction AS facing,
  ma.municipal_authority AS authority,
  ma.illumination_type,
  ma.total_sqft,
  ma.card_rate,
  ma.base_rate,
  ma.company_id,
  -- Availability status
  CASE
    WHEN cb.is_running_now THEN 'RUNNING'
    WHEN cb.is_future_booking THEN 'FUTURE_BOOKED'
    WHEN cb.is_removed THEN 'AVAILABLE'  -- dropped and past effective end
    ELSE 'BOOKED'
  END AS availability_status,
  'CAMPAIGN'::text AS booking_type,
  cb.campaign_id AS current_campaign_id,
  cb.campaign_name AS current_campaign_name,
  NULL::text AS current_plan_id,
  NULL::text AS current_plan_name,
  cb.client_name,
  cb.booking_start AS booking_start_date,
  cb.booking_end AS booking_end_date,
  cb.booking_start AS effective_booking_start,
  cb.booking_end AS effective_booking_end,
  cb.is_running_now AS is_running,
  cb.is_future_booking,
  false AS is_held,
  na.next_available_date,
  COALESCE(ma.media_asset_code, ma.id) || ' — ' || COALESCE(ma.location, '') AS display_label
FROM media_assets ma
JOIN campaign_bookings cb ON cb.asset_id = ma.id
LEFT JOIN next_avail na ON na.asset_id = ma.id

UNION ALL

-- ============ UNION 2: Hold rows ============
SELECT
  ma.id AS asset_id,
  ma.media_asset_code,
  ma.location,
  ma.area,
  ma.city,
  ma.media_type,
  ma.category,
  ma.dimensions AS size,
  ma.direction AS facing,
  ma.municipal_authority AS authority,
  ma.illumination_type,
  ma.total_sqft,
  ma.card_rate,
  ma.base_rate,
  ma.company_id,
  'HELD' AS availability_status,
  'HOLD'::text AS booking_type,
  NULL::text AS current_campaign_id,
  NULL::text AS current_campaign_name,
  ah.source_plan_id AS current_plan_id,
  NULL::text AS current_plan_name,
  ah.client_name,
  ah.hold_start AS booking_start_date,
  ah.hold_end AS booking_end_date,
  ah.hold_start AS effective_booking_start,
  ah.hold_end AS effective_booking_end,
  false AS is_running,
  ah.is_future_hold AS is_future_booking,
  ah.is_active_now AS is_held,
  na.next_available_date,
  COALESCE(ma.media_asset_code, ma.id) || ' — ' || COALESCE(ma.location, '') AS display_label
FROM media_assets ma
JOIN active_holds ah ON ah.asset_id = ma.id
LEFT JOIN next_avail na ON na.asset_id = ma.id

UNION ALL

-- ============ UNION 3: Available assets (no active booking or hold) ============
SELECT
  ma.id AS asset_id,
  ma.media_asset_code,
  ma.location,
  ma.area,
  ma.city,
  ma.media_type,
  ma.category,
  ma.dimensions AS size,
  ma.direction AS facing,
  ma.municipal_authority AS authority,
  ma.illumination_type,
  ma.total_sqft,
  ma.card_rate,
  ma.base_rate,
  ma.company_id,
  'AVAILABLE' AS availability_status,
  NULL::text AS booking_type,
  NULL::text AS current_campaign_id,
  NULL::text AS current_campaign_name,
  NULL::text AS current_plan_id,
  NULL::text AS current_plan_name,
  NULL::text AS client_name,
  NULL::date AS booking_start_date,
  NULL::date AS booking_end_date,
  NULL::date AS effective_booking_start,
  NULL::date AS effective_booking_end,
  false AS is_running,
  false AS is_future_booking,
  false AS is_held,
  NULL::date AS next_available_date,
  COALESCE(ma.media_asset_code, ma.id) || ' — ' || COALESCE(ma.location, '') AS display_label
FROM media_assets ma
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_bookings cb WHERE cb.asset_id = ma.id
)
AND NOT EXISTS (
  SELECT 1 FROM active_holds ah WHERE ah.asset_id = ma.id
);

-- ============================================================
-- Performance indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaign_assets_avail_lookup
  ON campaign_assets (asset_id, effective_start_date, effective_end_date)
  WHERE is_removed = false;

CREATE INDEX IF NOT EXISTS idx_campaign_assets_avail_removed
  ON campaign_assets (asset_id, effective_end_date)
  WHERE is_removed = true;

CREATE INDEX IF NOT EXISTS idx_asset_holds_avail_lookup
  ON asset_holds (asset_id, start_date, end_date)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_campaigns_status_deleted
  ON campaigns (id, status)
  WHERE is_deleted = false;
