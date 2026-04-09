
CREATE OR REPLACE FUNCTION public.create_plan_approval_workflow(p_plan_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_record RECORD;
  v_approval_config RECORD;
  v_legacy_config RECORD;
  v_level JSONB;
  v_existing_count integer;
  v_level_num integer;
  v_found boolean := false;
BEGIN
  SELECT * INTO v_plan_record FROM plans WHERE id = p_plan_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_id;
  END IF;

  -- Idempotency guard: if approvals already exist, skip
  SELECT COUNT(*) INTO v_existing_count 
  FROM plan_approvals WHERE plan_id = p_plan_id;
  
  IF v_existing_count > 0 THEN
    RETURN;
  END IF;

  -- Strategy 1: Try approval_rules table (managed by the UI at /admin/approvals/rules)
  SELECT * INTO v_approval_config
  FROM approval_rules
  WHERE is_active = true
    AND (plan_type IS NULL OR plan_type = COALESCE(v_plan_record.plan_type::text, 'Quotation'))
    AND min_amount <= COALESCE(v_plan_record.grand_total, 0)
    AND (max_amount IS NULL OR max_amount > COALESCE(v_plan_record.grand_total, 0))
    AND company_id = v_plan_record.company_id
  ORDER BY priority ASC NULLS LAST, min_amount DESC
  LIMIT 1;

  IF FOUND THEN
    v_found := true;
    v_level_num := 0;

    IF v_approval_config.require_sales_approval = true THEN
      v_level_num := v_level_num + 1;
      INSERT INTO plan_approvals (plan_id, approval_level, required_role, status)
      VALUES (p_plan_id, ('L' || v_level_num)::approval_level, 'sales'::app_role, 'pending');
    END IF;

    IF v_approval_config.require_operations_approval = true THEN
      v_level_num := v_level_num + 1;
      INSERT INTO plan_approvals (plan_id, approval_level, required_role, status)
      VALUES (p_plan_id, ('L' || v_level_num)::approval_level, 'operations_manager'::app_role, 'pending');
    END IF;

    IF v_approval_config.require_finance_approval = true THEN
      v_level_num := v_level_num + 1;
      INSERT INTO plan_approvals (plan_id, approval_level, required_role, status)
      VALUES (p_plan_id, ('L' || v_level_num)::approval_level, 'finance'::app_role, 'pending');
    END IF;

    IF v_approval_config.require_director_approval = true THEN
      v_level_num := v_level_num + 1;
      INSERT INTO plan_approvals (plan_id, approval_level, required_role, status)
      VALUES (p_plan_id, ('L' || v_level_num)::approval_level, 'admin'::app_role, 'pending');
    END IF;

    -- If the rule had no approval flags set, insert a default L1 sales approval
    IF v_level_num = 0 THEN
      INSERT INTO plan_approvals (plan_id, approval_level, required_role, status)
      VALUES (p_plan_id, 'L1'::approval_level, 'sales'::app_role, 'pending');
    END IF;

    RETURN;
  END IF;

  -- Strategy 2: Fallback to legacy approval_settings table
  -- Exact plan_type match first
  SELECT * INTO v_legacy_config
  FROM approval_settings
  WHERE plan_type::text = COALESCE(v_plan_record.plan_type::text, 'Quotation')
    AND is_active = true
    AND min_amount <= COALESCE(v_plan_record.grand_total, 0)
    AND (max_amount IS NULL OR max_amount > COALESCE(v_plan_record.grand_total, 0))
  ORDER BY min_amount DESC
  LIMIT 1;

  -- Fallback: any active setting by amount
  IF NOT FOUND THEN
    SELECT * INTO v_legacy_config
    FROM approval_settings
    WHERE is_active = true
      AND min_amount <= COALESCE(v_plan_record.grand_total, 0)
      AND (max_amount IS NULL OR max_amount > COALESCE(v_plan_record.grand_total, 0))
    ORDER BY min_amount DESC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No approval configuration found for plan % (type: %, amount: %). Please configure approval rules.',
      p_plan_id, v_plan_record.plan_type, v_plan_record.grand_total;
  END IF;

  FOR v_level IN SELECT * FROM jsonb_array_elements(v_legacy_config.approval_levels)
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
