CREATE POLICY "payment_records_delete_secure"
ON public.payment_records
FOR DELETE
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role))
  AND (company_id = current_company_id() OR is_platform_admin(auth.uid()))
);