-- Fix: Matrix Network Solutions (ID 00000000-0000-0000-0000-000000000001) should be media_owner, not platform_admin
-- Only "Go-Ads Platform" should be type platform_admin

UPDATE companies 
SET type = 'media_owner'
WHERE id = '00000000-0000-0000-0000-000000000001' 
AND type = 'platform_admin';

-- Set only Go-Ads Platform as primary for raghu@go-ads.in
UPDATE company_users
SET is_primary = false
WHERE user_id = 'e99ea9aa-5214-4750-b83d-1a4ba25d5d7e'
AND company_id != 'a9273e21-de54-48fa-91f4-348fe82bd86e';

-- Ensure Go-Ads Platform is primary
UPDATE company_users
SET is_primary = true
WHERE user_id = 'e99ea9aa-5214-4750-b83d-1a4ba25d5d7e'
AND company_id = 'a9273e21-de54-48fa-91f4-348fe82bd86e';