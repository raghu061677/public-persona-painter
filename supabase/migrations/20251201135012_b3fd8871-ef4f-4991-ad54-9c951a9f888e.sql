-- Update existing clients to have proper client_type if NULL
UPDATE clients 
SET client_type = 'Business'
WHERE client_type IS NULL;