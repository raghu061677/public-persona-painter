-- Add billing and shipping address fields to clients table
ALTER TABLE public.clients
  ADD COLUMN billing_address_line1 TEXT,
  ADD COLUMN billing_address_line2 TEXT,
  ADD COLUMN billing_city TEXT,
  ADD COLUMN billing_state TEXT,
  ADD COLUMN billing_pincode TEXT,
  ADD COLUMN shipping_address_line1 TEXT,
  ADD COLUMN shipping_address_line2 TEXT,
  ADD COLUMN shipping_city TEXT,
  ADD COLUMN shipping_state TEXT,
  ADD COLUMN shipping_pincode TEXT,
  ADD COLUMN shipping_same_as_billing BOOLEAN DEFAULT false;

-- Migrate existing address data to billing address (if any exists)
UPDATE public.clients
SET billing_address_line1 = address
WHERE address IS NOT NULL AND address != '';

-- Migrate existing city/state to billing (if needed)
UPDATE public.clients
SET 
  billing_city = city,
  billing_state = state
WHERE city IS NOT NULL OR state IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.billing_address_line1 IS 'Billing address line 1';
COMMENT ON COLUMN public.clients.billing_address_line2 IS 'Billing address line 2';
COMMENT ON COLUMN public.clients.billing_city IS 'Billing city';
COMMENT ON COLUMN public.clients.billing_state IS 'Billing state code';
COMMENT ON COLUMN public.clients.billing_pincode IS 'Billing pincode/zipcode';
COMMENT ON COLUMN public.clients.shipping_address_line1 IS 'Shipping address line 1';
COMMENT ON COLUMN public.clients.shipping_address_line2 IS 'Shipping address line 2';
COMMENT ON COLUMN public.clients.shipping_city IS 'Shipping city';
COMMENT ON COLUMN public.clients.shipping_state IS 'Shipping state code';
COMMENT ON COLUMN public.clients.shipping_pincode IS 'Shipping pincode/zipcode';
COMMENT ON COLUMN public.clients.shipping_same_as_billing IS 'Whether shipping address is same as billing address';