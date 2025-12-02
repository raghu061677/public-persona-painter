-- Create function to generate invoice IDs with format INV-YYYYMM-####
CREATE OR REPLACE FUNCTION public.generate_invoice_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_period TEXT;
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
  
  -- Generate period as YYYYMM
  current_period := to_char(CURRENT_DATE, 'YYYYMM');
  
  -- Get next sequence number for this period
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(id FROM 'INV-[0-9]{6}-([0-9]+)$') 
      AS INTEGER
    )
  ), 0) + 1
  INTO next_seq
  FROM invoices
  WHERE id LIKE 'INV-' || current_period || '-%';
  
  -- Build ID: INV-YYYYMM-####
  new_id := 'INV-' || current_period || '-' || LPAD(next_seq::TEXT, 4, '0');
  
  RETURN new_id;
END;
$function$;