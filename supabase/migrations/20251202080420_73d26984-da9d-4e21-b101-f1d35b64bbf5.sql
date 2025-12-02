-- Create asset utilization view for inventory analytics
CREATE OR REPLACE VIEW asset_utilization AS
SELECT 
  ma.id AS asset_id,
  ma.company_id,
  ma.city,
  ma.area,
  ma.location,
  ma.media_type,
  ma.total_sqft,
  ma.card_rate,
  ma.status AS current_status,
  
  -- Total bookings count
  (SELECT COUNT(*) 
   FROM campaign_assets ca 
   WHERE ca.asset_id = ma.id) AS total_bookings,
  
  -- Currently active bookings
  (SELECT COUNT(*) 
   FROM campaign_assets ca 
   JOIN campaigns c ON c.id = ca.campaign_id
   WHERE ca.asset_id = ma.id
   AND CURRENT_DATE BETWEEN c.start_date AND c.end_date
   AND c.status IN ('Running', 'Upcoming')) AS currently_booked,
  
  -- Total revenue generated
  COALESCE((SELECT SUM(ca.total_price) 
   FROM campaign_assets ca 
   WHERE ca.asset_id = ma.id), 0) AS total_revenue,
  
  -- Revenue this month
  COALESCE((SELECT SUM(ca.total_price) 
   FROM campaign_assets ca 
   JOIN campaigns c ON c.id = ca.campaign_id
   WHERE ca.asset_id = ma.id
   AND EXTRACT(MONTH FROM c.start_date) = EXTRACT(MONTH FROM CURRENT_DATE)
   AND EXTRACT(YEAR FROM c.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0) AS revenue_this_month,
  
  -- Days booked in last 365 days
  (SELECT COUNT(DISTINCT day_date)
   FROM generate_series(CURRENT_DATE - INTERVAL '365 days', CURRENT_DATE, INTERVAL '1 day') AS day_date
   WHERE EXISTS (
     SELECT 1 FROM campaign_assets ca
     JOIN campaigns c ON c.id = ca.campaign_id
     WHERE ca.asset_id = ma.id
     AND day_date BETWEEN c.start_date AND c.end_date
   )) AS days_booked_last_year,
  
  -- Occupancy percentage (last 365 days)
  ROUND(
    (SELECT COUNT(DISTINCT day_date)::numeric
     FROM generate_series(CURRENT_DATE - INTERVAL '365 days', CURRENT_DATE, INTERVAL '1 day') AS day_date
     WHERE EXISTS (
       SELECT 1 FROM campaign_assets ca
       JOIN campaigns c ON c.id = ca.campaign_id
       WHERE ca.asset_id = ma.id
       AND day_date BETWEEN c.start_date AND c.end_date
     )) / 365.0 * 100, 2
  ) AS occupancy_percent,
  
  -- Last booking date
  (SELECT MAX(c.end_date) 
   FROM campaign_assets ca 
   JOIN campaigns c ON c.id = ca.campaign_id
   WHERE ca.asset_id = ma.id) AS last_booking_date,
  
  -- Next booking date
  (SELECT MIN(c.start_date) 
   FROM campaign_assets ca 
   JOIN campaigns c ON c.id = ca.campaign_id
   WHERE ca.asset_id = ma.id
   AND c.start_date > CURRENT_DATE) AS next_booking_date

FROM media_assets ma;

-- Create media asset forecast view
CREATE OR REPLACE VIEW media_asset_forecast AS
SELECT 
    ma.id AS asset_id,
    ma.company_id,
    ma.media_type,
    ma.city,
    ma.area,
    ma.location,
    ma.status AS asset_status,

    c.id AS campaign_id,
    c.campaign_name,
    c.client_name,
    c.status AS campaign_status,
    c.start_date AS campaign_start,
    c.end_date AS campaign_end,

    ca.booking_start_date,
    ca.booking_end_date,
    ca.total_price AS booking_value

FROM media_assets ma
LEFT JOIN campaign_assets ca ON ca.asset_id = ma.id
LEFT JOIN campaigns c ON c.id = ca.campaign_id

WHERE ma.status IN ('Available', 'Booked')
ORDER BY ma.id, ca.booking_start_date;

-- Create booking calendar heatmap view
CREATE OR REPLACE VIEW media_calendar_heatmap AS
SELECT 
    ma.id AS asset_id,
    ma.company_id,
    ma.city,
    ma.media_type,
    dates.day,

    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM campaign_assets ca 
            JOIN campaigns c ON ca.campaign_id = c.id
            WHERE ca.asset_id = ma.id
            AND dates.day BETWEEN c.start_date AND c.end_date
            AND c.status IN ('Running', 'Upcoming', 'Draft')
        ) THEN 'Booked'
        ELSE 'Available'
    END AS day_status,
    
    -- Get campaign info if booked
    (SELECT c.id
     FROM campaign_assets ca 
     JOIN campaigns c ON ca.campaign_id = c.id
     WHERE ca.asset_id = ma.id
     AND dates.day BETWEEN c.start_date AND c.end_date
     AND c.status IN ('Running', 'Upcoming', 'Draft')
     LIMIT 1) AS campaign_id,
     
    (SELECT c.client_name
     FROM campaign_assets ca 
     JOIN campaigns c ON ca.campaign_id = c.id
     WHERE ca.asset_id = ma.id
     AND dates.day BETWEEN c.start_date AND c.end_date
     AND c.status IN ('Running', 'Upcoming', 'Draft')
     LIMIT 1) AS client_name

FROM media_assets ma
CROSS JOIN generate_series(
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '365 days',
    INTERVAL '1 day'
) AS dates(day);

-- Create function to check asset conflicts
CREATE OR REPLACE FUNCTION check_asset_conflict(
  p_asset_id text,
  p_start_date date,
  p_end_date date,
  p_exclude_campaign_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conflict jsonb;
BEGIN
  SELECT jsonb_build_object(
    'has_conflict', EXISTS (
      SELECT 1 
      FROM campaign_assets ca 
      JOIN campaigns c ON ca.campaign_id = c.id
      WHERE ca.asset_id = p_asset_id
      AND daterange(c.start_date, c.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
      AND c.status NOT IN ('Completed', 'Cancelled', 'Archived')
      AND (p_exclude_campaign_id IS NULL OR c.id != p_exclude_campaign_id)
    ),
    'conflicting_campaigns', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'campaign_id', c.id,
        'campaign_name', c.campaign_name,
        'client_name', c.client_name,
        'start_date', c.start_date,
        'end_date', c.end_date,
        'status', c.status
      ))
      FROM campaign_assets ca 
      JOIN campaigns c ON ca.campaign_id = c.id
      WHERE ca.asset_id = p_asset_id
      AND daterange(c.start_date, c.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
      AND c.status NOT IN ('Completed', 'Cancelled', 'Archived')
      AND (p_exclude_campaign_id IS NULL OR c.id != p_exclude_campaign_id)
    ), '[]'::jsonb)
  ) INTO v_conflict;
  
  RETURN v_conflict;
END;
$$;