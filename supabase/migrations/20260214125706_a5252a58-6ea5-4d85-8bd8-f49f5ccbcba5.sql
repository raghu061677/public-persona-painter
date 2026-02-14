-- Drop the old no-arg generate_invoice_id function that conflicts with the newer version
DROP FUNCTION IF EXISTS public.generate_invoice_id();
