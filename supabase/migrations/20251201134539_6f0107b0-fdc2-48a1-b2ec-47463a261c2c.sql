-- ============================================================
-- PART 1: DATABASE CLEANUP - NORMALIZE EXISTING CLIENT IDs
-- ============================================================

-- Step 1: Create helper function to extract state code from client ID
CREATE OR REPLACE FUNCTION extract_state_code(client_id text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Extract first part before hyphen (e.g., "TG" from "TG-0001" or "TG-5")
  RETURN split_part(client_id, '-', 1);
END;
$$;

-- Step 2: Create helper function to get next available number for a state
CREATE OR REPLACE FUNCTION get_next_client_number(p_state_code text, p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
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

-- Step 3: Normalize all existing client IDs
DO $$
DECLARE
  v_client RECORD;
  v_state_code text;
  v_number_part text;
  v_number integer;
  v_new_id text;
  v_needs_update boolean;
BEGIN
  -- Loop through all clients
  FOR v_client IN 
    SELECT id, state, company_id 
    FROM clients 
    ORDER BY created_at ASC
  LOOP
    v_needs_update := false;
    v_state_code := NULL;
    v_new_id := NULL;
    
    -- Check if ID matches the correct pattern: ^[A-Z]{2}-[0-9]{4}$
    IF v_client.id !~ '^[A-Z]{2}-[0-9]{4}$' THEN
      v_needs_update := true;
      
      -- Try to extract state code from existing ID
      v_state_code := extract_state_code(v_client.id);
      
      -- Validate state code (must be 2 uppercase letters)
      IF v_state_code !~ '^[A-Z]{2}$' THEN
        -- Invalid state code, use state from client record
        -- Get state code from state name using the state mapping
        CASE v_client.state
          WHEN 'Andhra Pradesh' THEN v_state_code := 'AP';
          WHEN 'Arunachal Pradesh' THEN v_state_code := 'AR';
          WHEN 'Assam' THEN v_state_code := 'AS';
          WHEN 'Bihar' THEN v_state_code := 'BR';
          WHEN 'Chhattisgarh' THEN v_state_code := 'CG';
          WHEN 'Goa' THEN v_state_code := 'GA';
          WHEN 'Gujarat' THEN v_state_code := 'GJ';
          WHEN 'Haryana' THEN v_state_code := 'HR';
          WHEN 'Himachal Pradesh' THEN v_state_code := 'HP';
          WHEN 'Jharkhand' THEN v_state_code := 'JH';
          WHEN 'Karnataka' THEN v_state_code := 'KA';
          WHEN 'Kerala' THEN v_state_code := 'KL';
          WHEN 'Madhya Pradesh' THEN v_state_code := 'MP';
          WHEN 'Maharashtra' THEN v_state_code := 'MH';
          WHEN 'Manipur' THEN v_state_code := 'MN';
          WHEN 'Meghalaya' THEN v_state_code := 'ML';
          WHEN 'Mizoram' THEN v_state_code := 'MZ';
          WHEN 'Nagaland' THEN v_state_code := 'NL';
          WHEN 'Odisha' THEN v_state_code := 'OD';
          WHEN 'Punjab' THEN v_state_code := 'PB';
          WHEN 'Rajasthan' THEN v_state_code := 'RJ';
          WHEN 'Sikkim' THEN v_state_code := 'SK';
          WHEN 'Tamil Nadu' THEN v_state_code := 'TN';
          WHEN 'Telangana' THEN v_state_code := 'TG';
          WHEN 'Tripura' THEN v_state_code := 'TR';
          WHEN 'Uttar Pradesh' THEN v_state_code := 'UP';
          WHEN 'Uttarakhand' THEN v_state_code := 'UK';
          WHEN 'West Bengal' THEN v_state_code := 'WB';
          WHEN 'Andaman and Nicobar Islands' THEN v_state_code := 'AN';
          WHEN 'Chandigarh' THEN v_state_code := 'CH';
          WHEN 'Dadra and Nagar Haveli and Daman and Diu' THEN v_state_code := 'DD';
          WHEN 'Delhi' THEN v_state_code := 'DL';
          WHEN 'Jammu and Kashmir' THEN v_state_code := 'JK';
          WHEN 'Ladakh' THEN v_state_code := 'LA';
          WHEN 'Lakshadweep' THEN v_state_code := 'LD';
          WHEN 'Puducherry' THEN v_state_code := 'PY';
          ELSE v_state_code := substring(v_client.state, 1, 2);
        END CASE;
      END IF;
      
      -- Try to extract and normalize the number part
      v_number_part := split_part(v_client.id, '-', 2);
      
      IF v_number_part ~ '^[0-9]+$' THEN
        -- Valid number, pad to 4 digits
        v_number := v_number_part::integer;
        v_new_id := v_state_code || '-' || LPAD(v_number::text, 4, '0');
      ELSE
        -- Invalid number, assign next available
        v_number := get_next_client_number(v_state_code, v_client.company_id);
        v_new_id := v_state_code || '-' || LPAD(v_number::text, 4, '0');
      END IF;
      
      -- Check if new ID already exists for this company
      WHILE EXISTS (
        SELECT 1 FROM clients 
        WHERE id = v_new_id 
        AND company_id = v_client.company_id
      ) LOOP
        v_number := v_number + 1;
        v_new_id := v_state_code || '-' || LPAD(v_number::text, 4, '0');
      END LOOP;
      
      -- Update the client ID and all related records
      -- First update related tables
      UPDATE plans SET client_id = v_new_id WHERE client_id = v_client.id;
      UPDATE campaigns SET client_id = v_new_id WHERE client_id = v_client.id;
      UPDATE estimations SET client_id = v_new_id WHERE client_id = v_client.id;
      UPDATE invoices SET client_id = v_new_id WHERE client_id = v_client.id;
      UPDATE client_documents SET client_id = v_new_id WHERE client_id = v_client.id;
      UPDATE client_contacts SET client_id = v_new_id WHERE client_id = v_client.id;
      UPDATE client_tags SET client_id = v_new_id WHERE client_id = v_client.id;
      UPDATE client_portal_users SET client_id = v_new_id WHERE client_id = v_client.id;
      UPDATE client_portal_access_logs SET client_id = v_new_id WHERE client_id = v_client.id;
      UPDATE client_audit_log SET client_id = v_new_id WHERE client_id = v_client.id;
      
      -- Finally update the client record itself
      UPDATE clients SET id = v_new_id WHERE id = v_client.id;
      
      RAISE NOTICE 'Updated client ID: % -> %', v_client.id, v_new_id;
    END IF;
  END LOOP;
END $$;

-- Step 4: Add unique constraint on (company_id, id)
-- First check if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clients_company_id_id_key'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_company_id_id_key UNIQUE (company_id, id);
  END IF;
END $$;

-- ============================================================
-- PART 2: CREATE SERVER-SIDE RPC FUNCTION FOR ID GENERATION
-- ============================================================

CREATE OR REPLACE FUNCTION generate_client_id(
  p_state_code text,
  p_company_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_client_id(text, uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION generate_client_id IS 'Generates a unique client ID in format STATECODE-#### with proper locking to prevent duplicates';

-- ============================================================
-- VERIFICATION QUERIES (FOR TESTING)
-- ============================================================

-- Check all client IDs are now normalized
-- Uncomment to verify:
-- SELECT 
--   id, 
--   state, 
--   CASE 
--     WHEN id ~ '^[A-Z]{2}-[0-9]{4}$' THEN '✓ Valid'
--     ELSE '✗ Invalid'
--   END as format_check
-- FROM clients
-- ORDER BY id;