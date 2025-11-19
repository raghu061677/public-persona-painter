-- Rename the Platform Admin company to avoid confusion with operational company
UPDATE companies 
SET name = 'Go-Ads System Admin',
    legal_name = 'Go-Ads Platform Administration'
WHERE type = 'platform_admin' 
  AND name = 'Matrix Network Solutions';