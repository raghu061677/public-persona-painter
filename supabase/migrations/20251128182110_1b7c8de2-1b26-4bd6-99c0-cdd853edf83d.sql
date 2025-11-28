-- Fix security warning: Set search_path for update_campaign_items_updated_at function
CREATE OR REPLACE FUNCTION update_campaign_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;