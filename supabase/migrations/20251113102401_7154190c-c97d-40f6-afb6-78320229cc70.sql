-- Allow operations and finance users to insert power bills
CREATE POLICY "operations_can_insert_bills"
ON public.asset_power_bills
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'operations'::app_role) OR 
  has_role(auth.uid(), 'finance'::app_role)
);