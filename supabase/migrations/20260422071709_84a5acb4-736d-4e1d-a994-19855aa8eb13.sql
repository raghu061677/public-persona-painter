
CREATE OR REPLACE VIEW public.asset_availability_view AS
WITH campaign_bookings AS (
  SELECT ca.asset_id,
    ca.campaign_id,
    c.campaign_name,
    c.client_name,
    c.status AS campaign_status,
    COALESCE(ca.effective_start_date, ca.booking_start_date, c.start_date) AS booking_start,
    COALESCE(ca.effective_end_date, ca.booking_end_date, c.end_date) AS booking_end,
    ca.is_removed,
    ca.dropped_on,
    ca.drop_reason,
    CASE
      WHEN COALESCE(ca.effective_start_date, ca.booking_start_date, c.start_date) <= CURRENT_DATE
       AND COALESCE(ca.effective_end_date, ca.booking_end_date, c.end_date) >= CURRENT_DATE
       AND ca.is_removed = false THEN true
      ELSE false
    END AS is_running_now,
    CASE
      WHEN COALESCE(ca.effective_start_date, ca.booking_start_date, c.start_date) > CURRENT_DATE
       AND ca.is_removed = false THEN true
      ELSE false
    END AS is_future_booking
  FROM campaign_assets ca
    JOIN campaigns c ON c.id = ca.campaign_id
  WHERE c.is_deleted = false
    AND (c.status <> ALL (ARRAY['Cancelled'::campaign_status, 'Archived'::campaign_status, 'Completed'::campaign_status]))
    AND (ca.is_removed = false OR ca.is_removed = true AND COALESCE(ca.effective_end_date, ca.booking_end_date, c.end_date) >= CURRENT_DATE)
), active_holds AS (
  SELECT ah.asset_id,
    ah.id AS hold_id,
    ah.client_name,
    ah.source_plan_id,
    ah.start_date AS hold_start,
    ah.end_date AS hold_end,
    ah.hold_type,
    ah.status AS hold_status,
    CASE WHEN ah.start_date <= CURRENT_DATE AND ah.end_date >= CURRENT_DATE THEN true ELSE false END AS is_active_now,
    CASE WHEN ah.start_date > CURRENT_DATE THEN true ELSE false END AS is_future_hold
  FROM asset_holds ah
  WHERE ah.status = 'ACTIVE'::text
), next_avail AS (
  SELECT sub.asset_id,
    (max(sub.block_end) + '1 day'::interval)::date AS next_available_date
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
SELECT ma.id AS asset_id,
  ma.media_asset_code, ma.location, ma.area, ma.city, ma.media_type, ma.category,
  ma.dimensions AS size, ma.direction AS facing, ma.municipal_authority AS authority,
  ma.illumination_type, ma.total_sqft, ma.card_rate, ma.base_rate, ma.company_id,
  CASE
    WHEN cb.is_running_now THEN 'RUNNING'::text
    WHEN cb.is_future_booking THEN 'FUTURE_BOOKED'::text
    WHEN cb.is_removed THEN 'AVAILABLE'::text
    ELSE 'BOOKED'::text
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
  (COALESCE(ma.media_asset_code, ma.id) || ' — '::text) || COALESCE(ma.location, ''::text) AS display_label
FROM media_assets ma
  JOIN campaign_bookings cb ON cb.asset_id = ma.id
  LEFT JOIN next_avail na ON na.asset_id = ma.id
WHERE ma.operational_status = 'active'
UNION ALL
SELECT ma.id AS asset_id,
  ma.media_asset_code, ma.location, ma.area, ma.city, ma.media_type, ma.category,
  ma.dimensions AS size, ma.direction AS facing, ma.municipal_authority AS authority,
  ma.illumination_type, ma.total_sqft, ma.card_rate, ma.base_rate, ma.company_id,
  'HELD'::text AS availability_status,
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
  (COALESCE(ma.media_asset_code, ma.id) || ' — '::text) || COALESCE(ma.location, ''::text) AS display_label
FROM media_assets ma
  JOIN active_holds ah ON ah.asset_id = ma.id
  LEFT JOIN next_avail na ON na.asset_id = ma.id
WHERE ma.operational_status = 'active'
UNION ALL
SELECT ma.id AS asset_id,
  ma.media_asset_code, ma.location, ma.area, ma.city, ma.media_type, ma.category,
  ma.dimensions AS size, ma.direction AS facing, ma.municipal_authority AS authority,
  ma.illumination_type, ma.total_sqft, ma.card_rate, ma.base_rate, ma.company_id,
  'AVAILABLE'::text AS availability_status,
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
  (COALESCE(ma.media_asset_code, ma.id) || ' — '::text) || COALESCE(ma.location, ''::text) AS display_label
FROM media_assets ma
WHERE ma.operational_status = 'active'
  AND NOT EXISTS (SELECT 1 FROM campaign_bookings cb WHERE cb.asset_id = ma.id)
  AND NOT EXISTS (SELECT 1 FROM active_holds ah WHERE ah.asset_id = ma.id);
