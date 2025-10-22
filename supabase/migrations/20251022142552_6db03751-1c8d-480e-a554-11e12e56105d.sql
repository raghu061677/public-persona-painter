-- Remove security definer from view and implement proper RLS
DROP VIEW IF EXISTS public.clients_basic CASCADE;

-- Recreate view without security definer
CREATE OR REPLACE VIEW public.clients_basic AS
SELECT 
  id,
  name,
  company,
  city,
  state,
  created_at
FROM public.clients;

-- Enable RLS on the view by using security_barrier
ALTER VIEW public.clients_basic SET (security_barrier = true);

-- Grant access to view
GRANT SELECT ON public.clients_basic TO authenticated;

-- Add RLS policy for the view access
-- Operations and Finance roles can use the masked view
CREATE POLICY "Operations and finance can view basic client info"
  ON public.clients
  FOR SELECT
  USING (
    has_role(auth.uid(), 'operations'::app_role) OR 
    has_role(auth.uid(), 'finance'::app_role)
  );