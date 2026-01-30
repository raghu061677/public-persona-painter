-- Fix function ambiguity - drop the no-arg version and make the main one have proper default
DROP FUNCTION IF EXISTS public.generate_campaign_id_v2();

-- Ensure the main function handles NULL gracefully (already does)
-- The main function already has p_user_id UUID DEFAULT NULL