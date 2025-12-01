-- Fix race condition in get_next_code_number function
DROP FUNCTION IF EXISTS get_next_code_number(text, text, text);

CREATE OR REPLACE FUNCTION get_next_code_number(
  p_counter_type text,
  p_counter_key text,
  p_period text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_value integer;
  v_max_existing integer;
BEGIN
  -- Use SELECT FOR UPDATE to lock the row and prevent race conditions
  SELECT current_value + 1 INTO v_next_value
  FROM code_counters
  WHERE counter_type = p_counter_type
    AND counter_key = p_counter_key
    AND period = p_period
  FOR UPDATE;
  
  -- If counter exists, update it
  IF FOUND THEN
    UPDATE code_counters
    SET current_value = v_next_value,
        updated_at = now()
    WHERE counter_type = p_counter_type
      AND counter_key = p_counter_key
      AND period = p_period;
      
    RETURN v_next_value;
  END IF;
  
  -- Counter doesn't exist, check actual data to find starting point
  IF p_counter_type = 'ASSET' THEN
    -- Extract the max sequence number from existing asset IDs
    SELECT COALESCE(MAX(
      CASE 
        WHEN id ~ '-[0-9]+$' 
        THEN CAST(SUBSTRING(id FROM '[0-9]+$') AS integer)
        ELSE 0
      END
    ), 0)
    INTO v_max_existing
    FROM media_assets
    WHERE id LIKE p_counter_key || '-%';
    
    v_next_value := v_max_existing + 1;
  ELSIF p_counter_type = 'CLIENT' THEN
    -- Extract the max sequence number from existing client IDs
    SELECT COALESCE(MAX(
      CASE 
        WHEN id ~ '-[0-9]+$' 
        THEN CAST(SUBSTRING(id FROM '[0-9]+$') AS integer)
        ELSE 0
      END
    ), 0)
    INTO v_max_existing
    FROM clients
    WHERE id LIKE p_counter_key || '-%';
    
    v_next_value := v_max_existing + 1;
  ELSE
    v_next_value := 1;
  END IF;
  
  -- Insert the counter with proper conflict handling
  INSERT INTO code_counters (
    counter_type,
    counter_key,
    period,
    current_value,
    created_at,
    updated_at
  ) VALUES (
    p_counter_type,
    p_counter_key,
    p_period,
    v_next_value,
    now(),
    now()
  )
  ON CONFLICT (counter_type, counter_key, period) 
  DO UPDATE SET 
    current_value = code_counters.current_value + 1,
    updated_at = now()
  RETURNING current_value INTO v_next_value;
  
  RETURN v_next_value;
END;
$$;