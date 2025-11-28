-- Fix security warning: Add search_path to get_enum_values function
CREATE OR REPLACE FUNCTION get_enum_values(enum_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(enumlabel ORDER BY enumsortorder)
  INTO result
  FROM pg_enum
  WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = enum_name
  );
  
  RETURN result;
END;
$$;