-- Fix generate_campaign_id to accept user_id parameter for service role calls
CREATE OR REPLACE FUNCTION public.generate_campaign_id(p_user_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_year TEXT;
  current_month TEXT;
  next_seq INTEGER;
  new_id TEXT;
  user_company_id uuid;
  actual_user_id uuid;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  actual_user_id := COALESCE(p_user_id, auth.uid());
  
  IF actual_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if user has permission (must have active company association)
  SELECT company_id INTO user_company_id
  FROM company_users
  WHERE user_id = actual_user_id AND status = 'active'
  LIMIT 1;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'No active company association found for user %', actual_user_id;
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