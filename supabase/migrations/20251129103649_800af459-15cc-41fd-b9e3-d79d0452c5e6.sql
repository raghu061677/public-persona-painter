-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_next_code_number(text, text, text);

-- Create improved function that checks actual data if counter doesn't exist
CREATE OR REPLACE FUNCTION get_next_code_number(
  p_counter_type text,
  p_counter_key text,
  p_period text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_value integer;
  v_max_existing integer;
BEGIN
  -- Try to get and increment existing counter
  UPDATE code_counters
  SET current_value = current_value + 1,
      updated_at = now()
  WHERE counter_type = p_counter_type
    AND counter_key = p_counter_key
    AND period = p_period
  RETURNING current_value INTO v_next_value;
  
  -- If counter doesn't exist, check actual data
  IF NOT FOUND THEN
    -- For media assets, check the actual media_assets table
    IF p_counter_type = 'ASSET' THEN
      -- Extract the max sequence number from existing asset IDs
      -- Example: HYD-BQS-0123 -> extract 123
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
    ELSE
      -- For other types, start from 1
      v_next_value := 1;
    END IF;
    
    -- Insert the counter with the correct starting value
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
      current_value = EXCLUDED.current_value,
      updated_at = now()
    RETURNING current_value INTO v_next_value;
  END IF;
  
  RETURN v_next_value;
END;
$$;