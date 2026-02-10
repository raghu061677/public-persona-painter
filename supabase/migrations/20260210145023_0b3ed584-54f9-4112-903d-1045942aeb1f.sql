
-- Create a function that atomically locks a plan for conversion
-- Returns the campaign_id if already converted, NULL if available for conversion
CREATE OR REPLACE FUNCTION public.lock_plan_for_conversion(p_plan_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_converted_to text;
  v_status text;
BEGIN
  -- Lock the row with FOR UPDATE to prevent concurrent conversions
  SELECT converted_to_campaign_id, status
  INTO v_converted_to, v_status
  FROM plans
  WHERE id = p_plan_id
  FOR UPDATE;

  -- If plan not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_id;
  END IF;

  -- If already converted, return the existing campaign id
  IF v_converted_to IS NOT NULL THEN
    -- Verify the campaign still exists
    PERFORM 1 FROM campaigns WHERE id = v_converted_to;
    IF FOUND THEN
      RETURN v_converted_to;
    END IF;
    -- Campaign was deleted, clear the field and allow re-conversion
    UPDATE plans SET converted_to_campaign_id = NULL WHERE id = p_plan_id;
    RETURN NULL;
  END IF;

  -- If not approved, raise error
  IF v_status != 'Approved' THEN
    RAISE EXCEPTION 'Plan status is "%" - must be "Approved"', v_status;
  END IF;

  -- Plan is available for conversion, row stays locked until transaction commits
  RETURN NULL;
END;
$$;
