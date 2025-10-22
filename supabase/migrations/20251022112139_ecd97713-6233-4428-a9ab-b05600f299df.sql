-- Fix security warning for get_financial_year function
CREATE OR REPLACE FUNCTION public.get_financial_year()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  fy_start_year INTEGER;
  fy_end_year INTEGER;
BEGIN
  -- FY starts April 1st
  IF EXTRACT(MONTH FROM current_date) >= 4 THEN
    fy_start_year := EXTRACT(YEAR FROM current_date);
  ELSE
    fy_start_year := EXTRACT(YEAR FROM current_date) - 1;
  END IF;
  
  fy_end_year := fy_start_year + 1;
  
  RETURN fy_start_year || '-' || SUBSTRING(fy_end_year::TEXT FROM 3 FOR 2);
END;
$$;