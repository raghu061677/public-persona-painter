-- Create log_audit function for audit logging
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_user_name text;
  v_user_id uuid;
BEGIN
  -- Get current user ID (works with both regular auth and service role with JWT)
  v_user_id := auth.uid();
  
  -- Fetch username from profiles
  IF v_user_id IS NOT NULL THEN
    SELECT username INTO v_user_name
    FROM profiles
    WHERE id = v_user_id;
  END IF;
  
  -- Insert activity log
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
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Update log_activity to handle edge function calls better
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_resource_name text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL -- Optional user_id for service role calls
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_user_name text;
  v_user_id uuid;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Fetch username from profiles
  IF v_user_id IS NOT NULL THEN
    SELECT username INTO v_user_name
    FROM profiles
    WHERE id = v_user_id;
  END IF;
  
  -- Insert activity log
  INSERT INTO activity_logs (
    user_id,
    user_name,
    action,
    resource_type,
    resource_id,
    resource_name,
    details
  ) VALUES (
    v_user_id,
    COALESCE(v_user_name, 'System'),
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;