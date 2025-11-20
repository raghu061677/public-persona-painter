-- Update log_security_event trigger to include user_name
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_id_value uuid;
  v_user_name text;
  v_user_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Fetch username from profiles
  IF v_user_id IS NOT NULL THEN
    SELECT username INTO v_user_name
    FROM profiles
    WHERE id = v_user_id;
  END IF;
  
  -- Try to get company_id from NEW or OLD record if it exists
  BEGIN
    company_id_value := COALESCE(
      (to_jsonb(NEW)->>'company_id')::uuid,
      (to_jsonb(OLD)->>'company_id')::uuid
    );
  EXCEPTION WHEN OTHERS THEN
    company_id_value := NULL;
  END;

  INSERT INTO activity_logs (
    user_id,
    user_name,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    v_user_id,
    COALESCE(v_user_name, 'System'),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(OLD)->>'id')),
    jsonb_build_object(
      'company_id', company_id_value,
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;