-- Priority 2.5: Add permission checks to SECURITY DEFINER functions

-- 1. Add permission check to generate_campaign_id
CREATE OR REPLACE FUNCTION public.generate_campaign_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_year TEXT;
  current_month TEXT;
  next_seq INTEGER;
  new_id TEXT;
  user_company_id uuid;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if user has permission (must have active company association)
  SELECT company_id INTO user_company_id
  FROM company_users
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'No active company association found';
  END IF;
  
  current_year := to_char(CURRENT_DATE, 'YYYY');
  current_month := to_char(CURRENT_DATE, 'Month');
  current_month := trim(current_month);
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(id FROM 'CAM-[0-9]{4}-[A-Za-z]+-([0-9]+)$') 
      AS INTEGER
    )
  ), 0) + 1
  INTO next_seq
  FROM campaigns
  WHERE id LIKE 'CAM-' || current_year || '-' || current_month || '-%';
  
  new_id := 'CAM-' || current_year || '-' || current_month || '-' || LPAD(next_seq::TEXT, 3, '0');
  
  RETURN new_id;
END;
$function$;

-- 2. Add permission check to generate_plan_id
CREATE OR REPLACE FUNCTION public.generate_plan_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_year TEXT;
  current_month TEXT;
  next_seq INTEGER;
  new_id TEXT;
  user_company_id uuid;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check company association
  SELECT company_id INTO user_company_id
  FROM company_users
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'No active company association found';
  END IF;
  
  current_year := to_char(CURRENT_DATE, 'YYYY');
  current_month := to_char(CURRENT_DATE, 'Month');
  current_month := trim(current_month);
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(id FROM 'PLAN-[0-9]{4}-[A-Za-z]+-([0-9]+)$') 
      AS INTEGER
    )
  ), 0) + 1
  INTO next_seq
  FROM plans
  WHERE id LIKE 'PLAN-' || current_year || '-' || current_month || '-%';
  
  new_id := 'PLAN-' || current_year || '-' || current_month || '-' || LPAD(next_seq::TEXT, 3, '0');
  
  RETURN new_id;
END;
$function$;

-- 3. Add permission check to generate_estimation_id
CREATE OR REPLACE FUNCTION public.generate_estimation_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  fy TEXT;
  next_seq INTEGER;
  new_id TEXT;
  user_company_id uuid;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check company association
  SELECT company_id INTO user_company_id
  FROM company_users
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'No active company association found';
  END IF;
  
  fy := get_financial_year();
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(id FROM 'EST-[0-9]{4}-[0-9]{2}-([0-9]+)$') 
      AS INTEGER
    )
  ), 0) + 1
  INTO next_seq
  FROM estimations
  WHERE id LIKE 'EST-' || fy || '-%';
  
  new_id := 'EST-' || fy || '-' || LPAD(next_seq::TEXT, 3, '0');
  
  RETURN new_id;
END;
$function$;

-- 4. Add permission check to generate_invoice_id
CREATE OR REPLACE FUNCTION public.generate_invoice_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  fy TEXT;
  next_seq INTEGER;
  new_id TEXT;
  user_company_id uuid;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check company association
  SELECT company_id INTO user_company_id
  FROM company_users
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'No active company association found';
  END IF;
  
  fy := get_financial_year();
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(id FROM 'INV-[0-9]{4}-[0-9]{2}-([0-9]+)$') 
      AS INTEGER
    )
  ), 0) + 1
  INTO next_seq
  FROM invoices
  WHERE id LIKE 'INV-' || fy || '-%';
  
  new_id := 'INV-' || fy || '-' || LPAD(next_seq::TEXT, 4, '0');
  
  RETURN new_id;
END;
$function$;

-- 5. Add permission check to generate_expense_id
CREATE OR REPLACE FUNCTION public.generate_expense_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  fy TEXT;
  next_seq INTEGER;
  new_id TEXT;
  user_company_id uuid;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check company association
  SELECT company_id INTO user_company_id
  FROM company_users
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'No active company association found';
  END IF;
  
  fy := get_financial_year();
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(id FROM 'EXP-[0-9]{4}-[0-9]{2}-([0-9]+)$') 
      AS INTEGER
    )
  ), 0) + 1
  INTO next_seq
  FROM expenses
  WHERE id LIKE 'EXP-' || fy || '-%';
  
  new_id := 'EXP-' || fy || '-' || LPAD(next_seq::TEXT, 3, '0');
  
  RETURN new_id;
END;
$function$;

-- 6. Add permission check to generate_share_token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$function$;

-- 7. Add permission check to get_next_code_number
CREATE OR REPLACE FUNCTION public.get_next_code_number(p_counter_type text, p_counter_key text, p_period text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_next_value integer;
  user_company_id uuid;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check company association
  SELECT company_id INTO user_company_id
  FROM company_users
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'No active company association found';
  END IF;
  
  INSERT INTO public.code_counters (counter_type, counter_key, period, current_value, updated_at)
  VALUES (p_counter_type, p_counter_key, p_period, 1, now())
  ON CONFLICT (counter_type, counter_key, period)
  DO UPDATE SET 
    current_value = code_counters.current_value + 1,
    updated_at = now()
  RETURNING current_value INTO v_next_value;
  
  RETURN v_next_value;
END;
$function$;