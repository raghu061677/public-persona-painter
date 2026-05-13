
DROP POLICY IF EXISTS "Users can view registrations for their company" ON public.client_registrations;
DROP POLICY IF EXISTS "Users can create registrations for their company" ON public.client_registrations;
DROP POLICY IF EXISTS "Users can update registrations for their company" ON public.client_registrations;
DROP POLICY IF EXISTS "Users can delete registrations for their company" ON public.client_registrations;

CREATE POLICY "Members can view registrations for their company"
ON public.client_registrations FOR SELECT
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Members can create registrations for their company"
ON public.client_registrations FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Members can update registrations for their company"
ON public.client_registrations FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'))
WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Members can delete registrations for their company"
ON public.client_registrations FOR DELETE
USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'));

DROP POLICY IF EXISTS "Authenticated users can view estimations" ON public.estimations;

CREATE POLICY "Members can view their company estimations"
ON public.estimations FOR SELECT
USING (company_id = public.current_company_id() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view email logs" ON public.email_logs;
