-- Fix function search path security warning
DROP FUNCTION IF EXISTS public.get_next_code_number(text, text, text);

CREATE OR REPLACE FUNCTION public.get_next_code_number(
  p_counter_type text,
  p_counter_key text,
  p_period text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_value integer;
BEGIN
  -- Insert or update counter
  INSERT INTO public.code_counters (counter_type, counter_key, period, current_value, updated_at)
  VALUES (p_counter_type, p_counter_key, p_period, 1, now())
  ON CONFLICT (counter_type, counter_key, period)
  DO UPDATE SET 
    current_value = code_counters.current_value + 1,
    updated_at = now()
  RETURNING current_value INTO v_next_value;
  
  RETURN v_next_value;
END;
$$;