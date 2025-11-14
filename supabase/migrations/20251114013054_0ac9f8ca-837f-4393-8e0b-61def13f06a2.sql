-- Fix function search_path security warnings
-- Update log_activity function
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action text, 
  p_resource_type text, 
  p_resource_id text DEFAULT NULL::text, 
  p_resource_name text DEFAULT NULL::text, 
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id uuid;
  v_user_name text;
BEGIN
  -- Get user name from profiles
  SELECT username INTO v_user_name
  FROM profiles
  WHERE id = auth.uid();
  
  INSERT INTO activity_logs (
    user_id,
    user_name,
    action,
    resource_type,
    resource_id,
    resource_name,
    details
  ) VALUES (
    auth.uid(),
    v_user_name,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$function$;

-- Update log_user_activity function
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id uuid, 
  p_activity_type text, 
  p_activity_description text DEFAULT NULL::text, 
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.user_activity_logs (
    user_id,
    activity_type,
    activity_description,
    metadata
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_activity_description,
    p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$function$;