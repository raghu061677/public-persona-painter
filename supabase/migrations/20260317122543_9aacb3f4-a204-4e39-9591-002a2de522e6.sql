
-- Create proforma_invoices table
CREATE TABLE public.proforma_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proforma_number TEXT NOT NULL,
  proforma_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_plan_id UUID,
  client_name TEXT NOT NULL,
  client_gstin TEXT,
  client_address TEXT,
  client_state TEXT,
  plan_name TEXT,
  campaign_start_date DATE,
  campaign_end_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  printing_total NUMERIC NOT NULL DEFAULT 0,
  mounting_total NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC NOT NULL DEFAULT 0,
  taxable_amount NUMERIC NOT NULL DEFAULT 0,
  cgst_amount NUMERIC NOT NULL DEFAULT 0,
  sgst_amount NUMERIC NOT NULL DEFAULT 0,
  total_tax NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  additional_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create proforma_invoice_items table
CREATE TABLE public.proforma_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proforma_invoice_id UUID NOT NULL REFERENCES public.proforma_invoices(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  area TEXT,
  location TEXT,
  direction TEXT,
  dimension_width NUMERIC NOT NULL DEFAULT 0,
  dimension_height NUMERIC NOT NULL DEFAULT 0,
  total_sqft NUMERIC NOT NULL DEFAULT 0,
  illumination_type TEXT,
  negotiated_rate NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  printing_charge NUMERIC NOT NULL DEFAULT 0,
  mounting_charge NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proforma_invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can manage proforma invoices"
  ON public.proforma_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage proforma invoice items"
  ON public.proforma_invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_proforma_invoices_updated_at
  BEFORE UPDATE ON public.proforma_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
