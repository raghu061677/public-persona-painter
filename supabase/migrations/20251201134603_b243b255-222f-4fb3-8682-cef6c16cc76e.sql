-- Fix security warnings by setting search_path for all functions

-- Fix extract_state_code function
CREATE OR REPLACE FUNCTION extract_state_code(client_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Extract first part before hyphen (e.g., "TG" from "TG-0001" or "TG-5")
  RETURN split_part(client_id, '-', 1);
END;
$$;

-- Fix get_next_client_number function
CREATE OR REPLACE FUNCTION get_next_client_number(p_state_code text, p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_num integer;
  v_next_num integer;
BEGIN
  -- Get the maximum number currently in use for this state code and company
  SELECT COALESCE(MAX(
    CASE 
      WHEN split_part(id, '-', 2) ~ '^[0-9]+$' 
      THEN split_part(id, '-', 2)::integer
      ELSE 0
    END
  ), 0)
  INTO v_max_num
  FROM clients
  WHERE company_id = p_company_id
    AND id ~ ('^' || p_state_code || '-[0-9]+$');
  
  -- Return next number
  v_next_num := v_max_num + 1;
  RETURN v_next_num;
END;
$$;

-- Fix generate_client_id function
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
  v_next_num integer;
  v_new_id text;
  v_max_attempts integer := 50;
  v_attempt integer := 0;
BEGIN
  -- Validate inputs
  IF p_state_code IS NULL OR length(p_state_code) != 2 THEN
    RAISE EXCEPTION 'Invalid state code. Must be exactly 2 characters.';
  END IF;
  
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'Company ID is required.';
  END IF;
  
  -- Ensure state code is uppercase
  p_state_code := upper(p_state_code);
  
  -- Loop until we find a unique ID
  WHILE v_attempt < v_max_attempts LOOP
    v_attempt := v_attempt + 1;
    
    -- Lock the clients table for this company and state to prevent race conditions
    -- Get the maximum number for this state code and company
    SELECT COALESCE(MAX(
      CASE 
        WHEN split_part(id, '-', 2) ~ '^[0-9]{4}$' 
        THEN split_part(id, '-', 2)::integer
        ELSE 0
      END
    ), 0) + 1
    INTO v_next_num
    FROM clients
    WHERE company_id = p_company_id
      AND id ~ ('^' || p_state_code || '-[0-9]{4}$')
    FOR UPDATE;  -- Lock the rows to prevent concurrent access
    
    -- Generate new ID
    v_new_id := p_state_code || '-' || LPAD(v_next_num::text, 4, '0');
    
    -- Check if this ID exists (double-check)
    IF NOT EXISTS (
      SELECT 1 FROM clients 
      WHERE id = v_new_id 
      AND company_id = p_company_id
    ) THEN
      -- ID is unique, return it
      RETURN v_new_id;
    END IF;
    
    -- If we got here, ID exists (shouldn't happen with locking, but be safe)
    -- Increment and try again
    v_next_num := v_next_num + 1;
  END LOOP;
  
  -- If we exhausted all attempts, raise an error
  RAISE EXCEPTION 'Failed to generate unique client ID after % attempts', v_max_attempts;
END;
$$;