
CREATE OR REPLACE FUNCTION public.search_portal_access_logs(
  p_search text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_client_id text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  client_id text,
  action text,
  resource_type text,
  resource_id text,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz,
  user_name text,
  user_email text,
  client_name text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      l.id, l.client_id, l.action, l.resource_type, l.resource_id,
      l.ip_address, l.user_agent, l.metadata, l.created_at,
      u.name AS user_name, u.email AS user_email, c.name AS client_name
    FROM public.client_portal_access_logs l
    LEFT JOIN public.client_portal_users u ON u.client_id = l.client_id
    LEFT JOIN public.clients c ON c.id = l.client_id
    WHERE (p_action IS NULL OR p_action = 'all' OR l.action = p_action)
      AND (p_from IS NULL OR l.created_at >= p_from)
      AND (p_to IS NULL OR l.created_at <= p_to)
      AND (p_client_id IS NULL OR l.client_id = p_client_id)
      AND (
        p_search IS NULL OR p_search = '' OR
        l.client_id ILIKE '%' || p_search || '%' OR
        u.name ILIKE '%' || p_search || '%' OR
        u.email ILIKE '%' || p_search || '%' OR
        c.name ILIKE '%' || p_search || '%' OR
        l.ip_address ILIKE '%' || p_search || '%'
      )
  ),
  counted AS (SELECT count(*) AS n FROM base)
  SELECT b.*, (SELECT n FROM counted) AS total_count
  FROM base b
  ORDER BY b.created_at DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_suspicious_portal_logins(
  p_days int DEFAULT 30,
  p_baseline_days int DEFAULT 90,
  p_burst_threshold int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  client_id text,
  user_email text,
  user_name text,
  client_name text,
  action text,
  ip_address text,
  user_agent text,
  created_at timestamptz,
  reason text,
  severity text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz := now() - (p_days || ' days')::interval;
  v_baseline_start timestamptz := now() - (p_baseline_days || ' days')::interval;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH login_events AS (
    SELECT l.*
    FROM public.client_portal_access_logs l
    WHERE l.created_at >= v_window_start
      AND l.action IN ('login', 'magic_link_requested', 'login_failed')
  ),
  baseline_ips AS (
    SELECT DISTINCT client_id, ip_address
    FROM public.client_portal_access_logs
    WHERE created_at < v_window_start
      AND created_at >= v_baseline_start
      AND ip_address IS NOT NULL
  ),
  bursts AS (
    SELECT client_id, date_trunc('hour', created_at) AS hr, count(*) AS c
    FROM login_events
    WHERE action IN ('login', 'magic_link_requested')
    GROUP BY 1, 2
    HAVING count(*) >= p_burst_threshold
  ),
  enriched AS (
    SELECT
      e.id, e.client_id, e.action, e.ip_address, e.user_agent, e.created_at,
      u.email AS user_email, u.name AS user_name, c.name AS client_name,
      CASE
        WHEN e.action = 'login_failed' THEN 'Failed login attempt'
        WHEN e.ip_address IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM baseline_ips b
                             WHERE b.client_id = e.client_id AND b.ip_address = e.ip_address)
          THEN 'New IP address (not seen in prior ' || p_baseline_days || ' days)'
        WHEN EXISTS (SELECT 1 FROM bursts br
                     WHERE br.client_id = e.client_id
                       AND br.hr = date_trunc('hour', e.created_at))
          THEN 'High-volume login burst (' || p_burst_threshold || '+ in same hour)'
        ELSE NULL
      END AS reason,
      CASE
        WHEN e.action = 'login_failed' THEN 'high'
        WHEN EXISTS (SELECT 1 FROM bursts br
                     WHERE br.client_id = e.client_id
                       AND br.hr = date_trunc('hour', e.created_at)) THEN 'high'
        ELSE 'medium'
      END AS severity
    FROM login_events e
    LEFT JOIN public.client_portal_users u ON u.client_id = e.client_id
    LEFT JOIN public.clients c ON c.id = e.client_id
  )
  SELECT
    en.id, en.client_id, en.user_email, en.user_name, en.client_name,
    en.action, en.ip_address, en.user_agent, en.created_at, en.reason, en.severity
  FROM enriched en
  WHERE en.reason IS NOT NULL
  ORDER BY en.created_at DESC
  LIMIT 1000;
END;
$$;
