
-- FIX 1: Remove overly permissive leads SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;

-- FIX 2: Add company_id to proforma_invoices and scope RLS
ALTER TABLE public.proforma_invoices 
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Backfill company_id from linked plans (cast uuid to text for join)
UPDATE public.proforma_invoices pi
SET company_id = p.company_id
FROM public.plans p
WHERE pi.reference_plan_id::text = p.id
  AND pi.company_id IS NULL;

ALTER TABLE public.proforma_invoice_items 
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

UPDATE public.proforma_invoice_items pii
SET company_id = pi.company_id
FROM public.proforma_invoices pi
WHERE pii.proforma_invoice_id = pi.id
  AND pii.company_id IS NULL;

-- Drop overly permissive ALL policies
DROP POLICY IF EXISTS "Authenticated users can manage proforma invoices" ON public.proforma_invoices;
DROP POLICY IF EXISTS "Authenticated users can manage proforma invoice items" ON public.proforma_invoice_items;

-- Scoped policies for proforma_invoices
CREATE POLICY "Users can view proforma invoices in their company"
  ON public.proforma_invoices FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can insert proforma invoices in their company"
  ON public.proforma_invoices FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "Users can update proforma invoices in their company"
  ON public.proforma_invoices FOR UPDATE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can delete proforma invoices in their company"
  ON public.proforma_invoices FOR DELETE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Admins can manage all proforma invoices"
  ON public.proforma_invoices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Scoped policies for proforma_invoice_items
CREATE POLICY "Users can view proforma invoice items in their company"
  ON public.proforma_invoice_items FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can insert proforma invoice items in their company"
  ON public.proforma_invoice_items FOR INSERT TO authenticated
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "Users can update proforma invoice items in their company"
  ON public.proforma_invoice_items FOR UPDATE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can delete proforma invoice items in their company"
  ON public.proforma_invoice_items FOR DELETE TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Admins can manage all proforma invoice items"
  ON public.proforma_invoice_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
