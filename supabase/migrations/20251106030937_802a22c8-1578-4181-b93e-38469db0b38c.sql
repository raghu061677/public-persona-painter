-- Create code_counters table for tracking sequential numbers
CREATE TABLE IF NOT EXISTS public.code_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_type text NOT NULL,
  counter_key text NOT NULL,
  current_value integer NOT NULL DEFAULT 0,
  period text NOT NULL, -- Format: YYYYMM for monthly counters
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(counter_type, counter_key, period)
);

-- Enable RLS
ALTER TABLE public.code_counters ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read counters
CREATE POLICY "Authenticated users can view counters"
  ON public.code_counters
  FOR SELECT
  USING (true);

-- Allow admins to manage counters
CREATE POLICY "Admins can manage counters"
  ON public.code_counters
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to get and increment counter
CREATE OR REPLACE FUNCTION public.get_next_code_number(
  p_counter_type text,
  p_counter_key text,
  p_period text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Add index for better performance
CREATE INDEX idx_code_counters_lookup ON public.code_counters(counter_type, counter_key, period);