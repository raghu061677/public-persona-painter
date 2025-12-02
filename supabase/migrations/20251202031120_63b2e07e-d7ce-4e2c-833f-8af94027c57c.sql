-- Fix security warning: Add search_path to get_mounter_workload function
DROP FUNCTION IF EXISTS get_mounter_workload(uuid);

CREATE OR REPLACE FUNCTION get_mounter_workload(p_company_id uuid)
RETURNS TABLE(mounter_id uuid, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT mounter_id, COUNT(*)::bigint
  FROM operations
  WHERE company_id = p_company_id
    AND status IN ('Assigned', 'In Progress')
  GROUP BY mounter_id;
$$;