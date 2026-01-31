-- Add RLS policy for client portal users to view their receipts
CREATE POLICY "Client portal users can view their receipts"
ON public.receipts
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT client_id FROM public.client_portal_users
    WHERE auth_user_id = auth.uid() AND is_active = true
  )
);

-- Add RLS policy for client portal users to view their payment records
DROP POLICY IF EXISTS "Users can view payment records" ON public.payment_records;
CREATE POLICY "Users can view payment records"
ON public.payment_records
FOR SELECT
TO authenticated
USING (
  -- Company users can view company payment records
  company_id IN (
    SELECT company_id FROM company_users
    WHERE user_id = auth.uid() AND status = 'active'
  )
  -- Or client portal users can view their own invoices' payment records
  OR invoice_id IN (
    SELECT id FROM invoices
    WHERE client_id IN (
      SELECT client_id FROM client_portal_users
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  )
  -- Or platform admin
  OR is_platform_admin(auth.uid())
);