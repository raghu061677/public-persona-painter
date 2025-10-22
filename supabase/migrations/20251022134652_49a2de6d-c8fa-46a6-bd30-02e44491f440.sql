-- Drop the overly permissive policy that allows all authenticated users to view clients
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

-- Create a new policy that only allows admins to view clients
CREATE POLICY "Only admins can view clients" 
ON public.clients 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add comment to document the security fix
COMMENT ON TABLE public.clients IS 'Client database with PII - restricted to admin access only for data protection';