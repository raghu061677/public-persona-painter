
CREATE OR REPLACE FUNCTION public.fn_media_availability_range(
  p_company_id uuid,
  p_start date,
  p_end date,
  p_city text DEFAULT NULL,
  p_media_type text DEFAULT NULL
)
RETURNS TABLE(
  asset_id text,
  media_asset_code text,
  area text,
  location text,
  direction text,
  dimension text,
  sqft numeric,
  illumination text,
  card_rate numeric,
  city text,
  media_type text,
  primary_photo_url text,
  qr_code_url text,
  latitude numeric,
  longitude numeric,
  availability_status text,
  available_from date,
  booked_till date,
  current_campaign_id text,
  current_campaign_name text,
  current_client_name text,
  booking_start text,
  booking_end text
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH asset_base AS (
    SELECT
      a.id AS asset_id,
      a.media_asset_code,
      a.area,
      a.location,
      a.direction,
      a.dimensions AS dimension,
      COALESCE(a.total_sqft, 0) AS sqft,
      COALESCE(a.illumination_type, '') AS illumination,
      a.card_rate,
      a.city,
      a.media_type,
      a.primary_photo_url,
      a.qr_code_url,
      a.latitude,
      a.longitude,
      a.current_campaign_id
    FROM public.media_assets a
    WHERE a.company_id = p_company_id
      AND COALESCE(a.status::text, 'Available') NOT IN ('Inactive', 'Expired')
      AND (p_city IS NULL OR p_city = 'all' OR a.city = p_city)
      AND (p_media_type IS NULL OR p_media_type = 'all' OR a.media_type = p_media_type)
  ),
  valid_bookings AS (
    SELECT
      ca.asset_id,
      ca.booking_start_date AS b_start,
      ca.booking_end_date AS b_end,
      ca.campaign_id,
      c.campaign_name,
      c.client_name
    FROM public.campaign_assets ca
    JOIN public.campaigns c ON c.id = ca.campaign_id
    WHERE COALESCE(c.is_deleted, false) = false
      AND c.status::text NOT IN ('Cancelled','Archived')
      AND ca.booking_start_date IS NOT NULL
      AND ca.booking_end_date IS NOT NULL
      AND ca.booking_end_date >= ca.booking_start_date
      AND ca.asset_id IN (SELECT ab.asset_id FROM asset_base ab)
  ),
  last_booking_in_range AS (
    SELECT
      b.asset_id,
      MAX(b.b_end) AS booked_till,
      (array_agg(b.campaign_id ORDER BY b.b_end DESC))[1] AS latest_campaign_id,
      (array_agg(b.campaign_name ORDER BY b.b_end DESC))[1] AS latest_campaign_name,
      (array_agg(b.client_name ORDER BY b.b_end DESC))[1] AS latest_client_name,
      (array_agg(b.b_start::text ORDER BY b.b_end DESC))[1] AS latest_booking_start,
      (array_agg(b.b_end::text ORDER BY b.b_end DESC))[1] AS latest_booking_end
    FROM valid_bookings b
    WHERE b.b_end >= p_start
    GROUP BY b.asset_id
  ),
  has_overlap_in_range AS (
    SELECT DISTINCT b.asset_id
    FROM valid_bookings b
    WHERE b.b_start <= p_end
      AND b.b_end >= p_start
  ),
  availability_calc AS (
    SELECT
      ab.*,
      lb.booked_till,
      lb.latest_campaign_id,
      lb.latest_campaign_name,
      lb.latest_client_name,
      lb.latest_booking_start,
      lb.latest_booking_end,
      CASE
        WHEN ho.asset_id IS NULL THEN p_start
        WHEN lb.booked_till IS NOT NULL THEN (lb.booked_till + INTERVAL '1 day')::date
        ELSE p_start
      END AS calc_available_from
    FROM asset_base ab
    LEFT JOIN last_booking_in_range lb ON lb.asset_id = ab.asset_id
    LEFT JOIN has_overlap_in_range ho ON ho.asset_id = ab.asset_id
  )
  SELECT
    ac.asset_id,
    ac.media_asset_code,
    ac.area,
    ac.location,
    ac.direction,
    ac.dimension,
    ac.sqft,
    ac.illumination,
    ac.card_rate,
    ac.city,
    ac.media_type,
    ac.primary_photo_url,
    ac.qr_code_url,
    ac.latitude,
    ac.longitude,
    CASE
      WHEN ac.calc_available_from <= p_start THEN 'VACANT_NOW'
      WHEN ac.calc_available_from > p_start AND ac.calc_available_from <= p_end THEN 'AVAILABLE_SOON'
      ELSE 'BOOKED_THROUGH_RANGE'
    END AS availability_status,
    ac.calc_available_from AS available_from,
    ac.booked_till,
    ac.latest_campaign_id AS current_campaign_id,
    ac.latest_campaign_name AS current_campaign_name,
    ac.latest_client_name AS current_client_name,
    ac.latest_booking_start AS booking_start,
    ac.latest_booking_end AS booking_end
  FROM availability_calc ac
  WHERE ac.calc_available_from <= p_end
  ORDER BY
    CASE
      WHEN ac.calc_available_from <= p_start THEN 1
      WHEN ac.calc_available_from <= p_end THEN 2
      ELSE 3
    END,
    ac.calc_available_from ASC,
    ac.area ASC,
    ac.location ASC,
    ac.asset_id ASC;
END;
$$;
