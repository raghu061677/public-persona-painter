-- Fix the generate_client_id function to not use FOR UPDATE with aggregate
DROP FUNCTION IF EXISTS generate_client_id(text, uuid);

CREATE OR REPLACE FUNCTION generate_client_id(
  p_state_code text,
  p_company_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_max integer;
  v_next_number integer;
  v_new_id text;
  v_attempt integer := 0;
  v_max_attempts integer := 50;
  v_exists boolean;
BEGIN
  LOOP
    -- Get the current max number for this state and company (without FOR UPDATE on aggregate)
    SELECT COALESCE(MAX(
      CASE 
        WHEN id ~ ('^' || p_state_code || '-[0-9]{4}$') 
        THEN CAST(SUBSTRING(id FROM '[0-9]{4}$') AS integer)
        ELSE 0
      END
    ), 0)
    INTO v_current_max
    FROM clients
    WHERE company_id = p_company_id
      AND id LIKE p_state_code || '-%';
    
    -- Calculate next number
    v_next_number := v_current_max + 1;
    
    -- Format as 4-digit padded ID
    v_new_id := p_state_code || '-' || LPAD(v_next_number::text, 4, '0');
    
    -- Check if this ID already exists (with row-level lock)
    SELECT EXISTS(
      SELECT 1 FROM clients 
      WHERE id = v_new_id AND company_id = p_company_id
      FOR UPDATE SKIP LOCKED
    ) INTO v_exists;
    
    -- If doesn't exist, we're done
    IF NOT v_exists THEN
      RETURN v_new_id;
    END IF;
    
    -- Increment attempt counter
    v_attempt := v_attempt + 1;
    IF v_attempt >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique client ID after % attempts', v_max_attempts;
    END IF;
    
    -- Small delay to avoid tight loop
    PERFORM pg_sleep(0.01);
  END LOOP;
END;
$$;