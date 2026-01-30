-- Campaign ID Generation v2: CAM-YYYYMM-#### format
-- Uses atomic counters with monthly reset, collision-safe

-- Create or replace the campaign ID generator to use YYYYMM format
CREATE OR REPLACE FUNCTION public.generate_campaign_id_v2(p_user_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_period TEXT;
  v_next_seq INTEGER;
  v_campaign_id TEXT;
BEGIN
  -- Get company_id from user if provided
  IF p_user_id IS NOT NULL THEN
    SELECT company_id INTO v_company_id
    FROM company_users
    WHERE user_id = p_user_id AND status = 'active'
    LIMIT 1;
  END IF;
  
  -- Use 'default' if no company found
  IF v_company_id IS NULL THEN
    v_company_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;
  
  -- Get current period in YYYYMM format
  v_period := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Atomic counter increment with lock
  -- Try to get and increment existing counter
  UPDATE code_counters
  SET current_value = current_value + 1,
      updated_at = NOW()
  WHERE counter_type = 'CAMPAIGN_V2'
    AND counter_key = v_company_id::TEXT
    AND period = v_period
  RETURNING current_value INTO v_next_seq;
  
  -- If no row was updated, insert new counter
  IF NOT FOUND THEN
    -- Find max existing campaign number for this period to prevent collisions
    SELECT COALESCE(MAX(
      CASE 
        WHEN id ~ ('^CAM-' || v_period || '-[0-9]+$') 
        THEN CAST(SUBSTRING(id FROM '[0-9]+$') AS INTEGER)
        ELSE 0
      END
    ), 0) INTO v_next_seq
    FROM campaigns
    WHERE id LIKE 'CAM-' || v_period || '-%';
    
    v_next_seq := v_next_seq + 1;
    
    -- Insert new counter with initial value
    INSERT INTO code_counters (counter_type, counter_key, period, current_value, updated_at)
    VALUES ('CAMPAIGN_V2', v_company_id::TEXT, v_period, v_next_seq, NOW())
    ON CONFLICT (counter_type, counter_key, period)
    DO UPDATE SET
      current_value = GREATEST(code_counters.current_value, EXCLUDED.current_value) + 1,
      updated_at = NOW()
    RETURNING current_value INTO v_next_seq;
  END IF;
  
  -- Format: CAM-YYYYMM-####
  v_campaign_id := 'CAM-' || v_period || '-' || LPAD(v_next_seq::TEXT, 4, '0');
  
  RETURN v_campaign_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_campaign_id_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_campaign_id_v2(UUID) TO service_role;

-- Also create a version without parameters for simpler calls
CREATE OR REPLACE FUNCTION public.generate_campaign_id_v2()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN generate_campaign_id_v2(NULL::UUID);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_campaign_id_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_campaign_id_v2() TO service_role;