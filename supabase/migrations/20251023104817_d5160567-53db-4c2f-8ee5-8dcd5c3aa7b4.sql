-- Fix SECURITY DEFINER view warning by setting SECURITY INVOKER
-- This ensures the view uses permissions of the querying user, not the creator

ALTER VIEW public.clients_basic SET (security_invoker = true);

-- Verify the view has proper RLS policy
-- The existing RLS policy on clients table will be enforced through the view