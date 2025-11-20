-- Fix security warning: set search_path for trigger function
CREATE OR REPLACE FUNCTION update_onboarding_progress_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;