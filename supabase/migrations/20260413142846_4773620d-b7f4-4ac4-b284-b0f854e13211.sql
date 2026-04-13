
-- Create client_registrations table
CREATE TABLE public.client_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Head Office',
  gstin text,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_state text,
  billing_pincode text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_pincode text,
  state text,
  state_code text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_client_registrations_client_id ON public.client_registrations(client_id);
CREATE INDEX idx_client_registrations_company_id ON public.client_registrations(company_id);

-- Only one default per client
CREATE UNIQUE INDEX idx_client_registrations_default ON public.client_registrations(client_id) WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.client_registrations ENABLE ROW LEVEL SECURITY;

-- RLS policies using company_id from profiles
CREATE POLICY "Users can view registrations for their company"
  ON public.client_registrations FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create registrations for their company"
  ON public.client_registrations FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update registrations for their company"
  ON public.client_registrations FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete registrations for their company"
  ON public.client_registrations FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Timestamp trigger
CREATE TRIGGER update_client_registrations_updated_at
  BEFORE UPDATE ON public.client_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: create one default registration per existing client
INSERT INTO public.client_registrations (
  client_id, company_id, label, gstin,
  billing_address_line1, billing_address_line2, billing_city, billing_state, billing_pincode,
  shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_pincode,
  state, state_code, is_default
)
SELECT
  c.id,
  c.company_id,
  'Head Office',
  c.gst_number,
  c.billing_address_line1, c.billing_address_line2, c.billing_city, c.billing_state, c.billing_pincode,
  c.shipping_address_line1, c.shipping_address_line2, c.shipping_city, c.shipping_state, c.shipping_pincode,
  c.state,
  c.state_code,
  true
FROM public.clients c
WHERE c.company_id IS NOT NULL;
