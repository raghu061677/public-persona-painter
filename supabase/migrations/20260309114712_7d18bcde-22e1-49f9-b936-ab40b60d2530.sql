
-- Clean up legacy roles from role_permissions
DELETE FROM role_permissions WHERE role IN ('user', 'manager', 'installation', 'monitor', 'operations');
