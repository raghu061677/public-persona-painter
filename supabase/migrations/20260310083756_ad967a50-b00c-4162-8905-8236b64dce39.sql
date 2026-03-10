
-- Drop restrictive admin-only policies on plan_items
DROP POLICY IF EXISTS "Admins can insert plan items" ON public.plan_items;
DROP POLICY IF EXISTS "Admins can update plan items" ON public.plan_items;
DROP POLICY IF EXISTS "Admins can delete plan items" ON public.plan_items;

-- Create policies that allow sales users too (matching plans table policies)
CREATE POLICY "Authorized users can insert plan items" ON public.plan_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = plan_items.plan_id
      AND p.company_id = current_company_id()
      AND has_company_role(ARRAY['admin'::app_role, 'sales'::app_role])
  )
);

CREATE POLICY "Authorized users can update plan items" ON public.plan_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = plan_items.plan_id
      AND p.company_id = current_company_id()
      AND has_company_role(ARRAY['admin'::app_role, 'sales'::app_role])
  )
);

CREATE POLICY "Authorized users can delete plan items" ON public.plan_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = plan_items.plan_id
      AND p.company_id = current_company_id()
      AND has_company_role(ARRAY['admin'::app_role, 'sales'::app_role])
  )
);
