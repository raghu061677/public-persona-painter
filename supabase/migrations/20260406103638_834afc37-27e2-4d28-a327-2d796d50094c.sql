CREATE OR REPLACE FUNCTION public.create_plan_approval_workflow(p_plan_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_record RECORD;
  v_approval_config RECORD;
  v_level JSONB;
  v_existing_count integer;
BEGIN
  SELECT * INTO v_plan_record FROM plans WHERE id = p_plan_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_id;
  END IF;

  -- Check if approvals already exist (idempotency guard)
  SELECT COUNT(*) INTO v_existing_count 
  FROM plan_approvals WHERE plan_id = p_plan_id;
  
  IF v_existing_count > 0 THEN
    RETURN; -- Already has approval records
  END IF;

  -- Try exact plan_type match first
  SELECT * INTO v_approval_config
  FROM approval_settings
  WHERE plan_type::text = COALESCE(v_plan_record.plan_type, 'Quotation')
    AND is_active = true
    AND min_amount <= COALESCE(v_plan_record.grand_total, 0)
    AND (max_amount IS NULL OR max_amount > COALESCE(v_plan_record.grand_total, 0))
  ORDER BY min_amount DESC
  LIMIT 1;

  -- Fallback: match any active approval setting by amount if exact type not found
  IF NOT FOUND THEN
    SELECT * INTO v_approval_config
    FROM approval_settings
    WHERE is_active = true
      AND min_amount <= COALESCE(v_plan_record.grand_total, 0)
      AND (max_amount IS NULL OR max_amount > COALESCE(v_plan_record.grand_total, 0))
    ORDER BY min_amount DESC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No approval configuration found for plan % (type: %, amount: %)', 
      p_plan_id, v_plan_record.plan_type, v_plan_record.grand_total;
  END IF;

  FOR v_level IN SELECT * FROM jsonb_array_elements(v_approval_config.approval_levels)
  LOOP
    INSERT INTO plan_approvals (plan_id, approval_level, required_role, status)
    VALUES (
      p_plan_id,
      (v_level->>'level')::approval_level,
      (v_level->>'role')::app_role,
      'pending'
    );
  END LOOP;
END;
$$;