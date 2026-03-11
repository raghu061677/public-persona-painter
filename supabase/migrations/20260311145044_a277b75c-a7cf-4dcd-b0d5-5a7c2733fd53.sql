
DROP VIEW IF EXISTS public.v_asset_availability CASCADE;

CREATE VIEW public.v_asset_availability AS
WITH active_campaign_bookings AS (
  SELECT
    ca.asset_id,
    ca.campaign_id,
    c.campaign_name,
    c.client_name,
    c.status AS campaign_status,
    COALESCE(ca.effective_start_date, ca.booking_start_date, c.start_date) AS booking_start,
    COALESCE(ca.effective_end_date, ca.booking_end_date, c.end_date) AS booking_end,
    ca.is_removed,
    'campaign'::text AS booking_type
  FROM campaign_assets ca
  JOIN campaigns c ON c.id = ca.campaign_id
  WHERE c.is_deleted = false
    AND c.status NOT IN ('Cancelled', 'Archived', 'Completed')
),
active_holds AS (
  SELECT
    ah.asset_id,
    ah.id AS hold_id,
    ah.client_name,
    ah.start_date AS booking_start,
    ah.end_date AS booking_end,
    ah.status AS hold_status,
    'hold'::text AS booking_type
  FROM asset_holds ah
  WHERE ah.status = 'ACTIVE'
),
today_val AS (
  SELECT CURRENT_DATE AS today
),
asset_current_status AS (
  SELECT
    ma.id AS asset_id,
    ma.media_asset_code,
    ma.location,
    ma.city,
    ma.area,
    ma.media_type,
    ma.category,
    ma.direction,
    ma.dimensions,
    ma.total_sqft,
    ma.illumination_type,
    ma.municipal_authority,
    ma.card_rate,
    ma.base_rate,
    ma.company_id,
    (SELECT acb.campaign_id FROM active_campaign_bookings acb, today_val t
     WHERE acb.asset_id = ma.id AND acb.is_removed = false
       AND acb.booking_start::date <= t.today AND acb.booking_end::date >= t.today
     ORDER BY acb.booking_start LIMIT 1) AS current_campaign_id,
    (SELECT acb.campaign_name FROM active_campaign_bookings acb, today_val t
     WHERE acb.asset_id = ma.id AND acb.is_removed = false
       AND acb.booking_start::date <= t.today AND acb.booking_end::date >= t.today
     ORDER BY acb.booking_start LIMIT 1) AS current_campaign_name,
    (SELECT acb.client_name FROM active_campaign_bookings acb, today_val t
     WHERE acb.asset_id = ma.id AND acb.is_removed = false
       AND acb.booking_start::date <= t.today AND acb.booking_end::date >= t.today
     ORDER BY acb.booking_start LIMIT 1) AS current_client_name,
    (SELECT acb.booking_start FROM active_campaign_bookings acb, today_val t
     WHERE acb.asset_id = ma.id AND acb.is_removed = false
       AND acb.booking_start::date <= t.today AND acb.booking_end::date >= t.today
     ORDER BY acb.booking_start LIMIT 1) AS current_booking_start,
    (SELECT acb.booking_end FROM active_campaign_bookings acb, today_val t
     WHERE acb.asset_id = ma.id AND acb.is_removed = false
       AND acb.booking_start::date <= t.today AND acb.booking_end::date >= t.today
     ORDER BY acb.booking_start LIMIT 1) AS current_booking_end,
    (SELECT acb.campaign_id FROM active_campaign_bookings acb, today_val t
     WHERE acb.asset_id = ma.id AND acb.is_removed = false
       AND acb.booking_start::date > t.today
     ORDER BY acb.booking_start LIMIT 1) AS next_campaign_id,
    (SELECT acb.campaign_name FROM active_campaign_bookings acb, today_val t
     WHERE acb.asset_id = ma.id AND acb.is_removed = false
       AND acb.booking_start::date > t.today
     ORDER BY acb.booking_start LIMIT 1) AS next_campaign_name,
    (SELECT acb.booking_start FROM active_campaign_bookings acb, today_val t
     WHERE acb.asset_id = ma.id AND acb.is_removed = false
       AND acb.booking_start::date > t.today
     ORDER BY acb.booking_start LIMIT 1) AS next_booking_start,
    (SELECT acb.booking_end FROM active_campaign_bookings acb, today_val t
     WHERE acb.asset_id = ma.id AND acb.is_removed = false
       AND acb.booking_start::date > t.today
     ORDER BY acb.booking_start LIMIT 1) AS next_booking_end,
    (SELECT ah.hold_id FROM active_holds ah, today_val t
     WHERE ah.asset_id = ma.id
       AND ah.booking_start::date <= t.today AND ah.booking_end::date >= t.today
     LIMIT 1) AS current_hold_id,
    (SELECT ah.client_name FROM active_holds ah, today_val t
     WHERE ah.asset_id = ma.id
       AND ah.booking_start::date <= t.today AND ah.booking_end::date >= t.today
     LIMIT 1) AS current_hold_client,
    (SELECT ah.booking_start FROM active_holds ah, today_val t
     WHERE ah.asset_id = ma.id
       AND ah.booking_start::date <= t.today AND ah.booking_end::date >= t.today
     LIMIT 1) AS current_hold_start,
    (SELECT ah.booking_end FROM active_holds ah, today_val t
     WHERE ah.asset_id = ma.id
       AND ah.booking_start::date <= t.today AND ah.booking_end::date >= t.today
     LIMIT 1) AS current_hold_end,
    (SELECT MAX(sub.booking_end)::date + 1
     FROM (
       SELECT acb.booking_end FROM active_campaign_bookings acb, today_val t
       WHERE acb.asset_id = ma.id AND acb.is_removed = false AND acb.booking_end::date >= t.today
       UNION ALL
       SELECT ah.booking_end FROM active_holds ah, today_val t
       WHERE ah.asset_id = ma.id AND ah.booking_end::date >= t.today
     ) sub
    ) AS next_available_date
  FROM media_assets ma
)
SELECT
  acs.*,
  CASE
    WHEN acs.current_campaign_id IS NOT NULL THEN 'Running'
    WHEN acs.current_hold_id IS NOT NULL THEN 'Blocked'
    WHEN acs.next_campaign_id IS NOT NULL THEN 'Upcoming'
    ELSE 'Available'
  END AS availability_status,
  CASE
    WHEN acs.current_campaign_id IS NOT NULL THEN 'campaign'
    WHEN acs.current_hold_id IS NOT NULL THEN 'hold'
    WHEN acs.next_campaign_id IS NOT NULL THEN 'campaign'
    ELSE NULL
  END::text AS booking_source_type
FROM asset_current_status acs;
