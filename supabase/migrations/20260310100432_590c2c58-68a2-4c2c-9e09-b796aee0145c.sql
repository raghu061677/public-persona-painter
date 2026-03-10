-- Fix Issue 3: Sales users should only update their own plans
-- Drop the existing overly permissive update policy
DROP POLICY IF EXISTS plans_update_authorized ON plans;

-- Recreate with ownership check: admin can update any company plan, sales can only update own plans
CREATE POLICY plans_update_authorized ON plans
FOR UPDATE
USING (
  company_id = current_company_id()
  AND (
    has_company_role(ARRAY['admin'::app_role])
    OR (has_company_role(ARRAY['sales'::app_role]) AND created_by = auth.uid())
  )
)
WITH CHECK (
  company_id = current_company_id()
  AND (
    has_company_role(ARRAY['admin'::app_role])
    OR (has_company_role(ARRAY['sales'::app_role]) AND created_by = auth.uid())
  )
);

-- Also restrict plan_items update to plan owners
DROP POLICY IF EXISTS plan_items_update_authorized ON plan_items;
CREATE POLICY plan_items_update_authorized ON plan_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM plans p 
    WHERE p.id = plan_items.plan_id 
    AND p.company_id = current_company_id()
    AND (
      has_company_role(ARRAY['admin'::app_role])
      OR (has_company_role(ARRAY['sales'::app_role]) AND p.created_by = auth.uid())
    )
  )
);

-- Restrict plan_items delete to plan owners
DROP POLICY IF EXISTS plan_items_delete_authorized ON plan_items;
CREATE POLICY plan_items_delete_authorized ON plan_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM plans p 
    WHERE p.id = plan_items.plan_id 
    AND p.company_id = current_company_id()
    AND (
      has_company_role(ARRAY['admin'::app_role])
      OR (has_company_role(ARRAY['sales'::app_role]) AND p.created_by = auth.uid())
    )
  )
);

-- Restrict plan_items insert to plan owners  
DROP POLICY IF EXISTS plan_items_insert_authorized ON plan_items;
CREATE POLICY plan_items_insert_authorized ON plan_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM plans p 
    WHERE p.id = plan_items.plan_id 
    AND p.company_id = current_company_id()
    AND (
      has_company_role(ARRAY['admin'::app_role])
      OR (has_company_role(ARRAY['sales'::app_role]) AND p.created_by = auth.uid())
    )
  )
);