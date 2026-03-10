-- Fix scope_mode for sales role on campaigns and plans to enforce ownership
UPDATE role_permissions 
SET scope_mode = 'own' 
WHERE role = 'sales' 
  AND module IN ('campaigns', 'plans') 
  AND company_id IS NULL;