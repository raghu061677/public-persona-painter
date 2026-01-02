-- Add payment terms and invoice type fields to invoices table

-- Add invoice_type field (TAX_INVOICE or PROFORMA)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'invoice_type') THEN
    ALTER TABLE public.invoices ADD COLUMN invoice_type text NOT NULL DEFAULT 'TAX_INVOICE' CHECK (invoice_type IN ('TAX_INVOICE', 'PROFORMA'));
  END IF;
END $$;

-- Add payment terms fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'terms_mode') THEN
    ALTER TABLE public.invoices ADD COLUMN terms_mode text NOT NULL DEFAULT 'DUE_ON_RECEIPT' CHECK (terms_mode IN ('DUE_ON_RECEIPT', 'NET_30', 'NET_45', 'CUSTOM'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'terms_days') THEN
    ALTER TABLE public.invoices ADD COLUMN terms_days integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'reference_plan_id') THEN
    ALTER TABLE public.invoices ADD COLUMN reference_plan_id text NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'template_style') THEN
    ALTER TABLE public.invoices ADD COLUMN template_style text NOT NULL DEFAULT 'PLAN_EXPORT';
  END IF;
END $$;

-- Create invoice_sequences table for invoice numbering
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fy_key text NOT NULL,
  next_number integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT invoice_sequences_company_fy_unique UNIQUE (company_id, fy_key)
);

-- Enable RLS on invoice_sequences
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

-- RLS policy for invoice_sequences
DROP POLICY IF EXISTS "invoice_sequences_company_isolation" ON public.invoice_sequences;
CREATE POLICY "invoice_sequences_company_isolation" ON public.invoice_sequences
  FOR ALL USING (
    company_id = public.get_current_user_company_id()
    OR public.is_platform_admin(auth.uid())
  );

-- Create function to calculate due date from terms
CREATE OR REPLACE FUNCTION public.recalculate_invoice_due_date(p_invoice_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_terms_days integer;
  v_due_date date;
  v_terms_label text;
BEGIN
  -- Fetch invoice
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;
  
  -- Calculate terms_days based on terms_mode
  v_terms_days := CASE v_invoice.terms_mode
    WHEN 'DUE_ON_RECEIPT' THEN 0
    WHEN 'NET_30' THEN 30
    WHEN 'NET_45' THEN 45
    WHEN 'CUSTOM' THEN COALESCE(v_invoice.terms_days, 0)
    ELSE 0
  END;
  
  -- Calculate due_date
  v_due_date := v_invoice.invoice_date + v_terms_days;
  
  -- Generate terms label
  v_terms_label := CASE v_invoice.terms_mode
    WHEN 'DUE_ON_RECEIPT' THEN 'Due on Receipt'
    WHEN 'NET_30' THEN '30 Net Days'
    WHEN 'NET_45' THEN '45 Net Days'
    WHEN 'CUSTOM' THEN v_terms_days || ' Net Days'
    ELSE 'Due on Receipt'
  END;
  
  -- Update invoice
  UPDATE invoices
  SET 
    terms_days = v_terms_days,
    due_date = v_due_date,
    updated_at = now()
  WHERE id = p_invoice_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'terms_mode', v_invoice.terms_mode,
    'terms_days', v_terms_days,
    'due_date', v_due_date,
    'terms_label', v_terms_label
  );
END;
$$;

-- Create function to get terms label for PDF display
CREATE OR REPLACE FUNCTION public.get_invoice_terms_label(p_terms_mode text, p_terms_days integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_terms_mode
    WHEN 'DUE_ON_RECEIPT' THEN 'Due on Receipt'
    WHEN 'NET_30' THEN '30 Net Days'
    WHEN 'NET_45' THEN '45 Net Days'
    WHEN 'CUSTOM' THEN COALESCE(p_terms_days, 0) || ' Net Days'
    ELSE 'Due on Receipt'
  END;
END;
$$;

-- Create function to generate invoice number (Zoho style: INV-MNS-FYXX-XX-####)
CREATE OR REPLACE FUNCTION public.generate_invoice_number_zoho(p_company_id uuid, p_invoice_date date)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fy_key text;
  v_next_number integer;
  v_company_code text;
  v_invoice_no text;
  v_year integer;
  v_month integer;
BEGIN
  -- Determine fiscal year key (April to March in India)
  v_year := EXTRACT(YEAR FROM p_invoice_date);
  v_month := EXTRACT(MONTH FROM p_invoice_date);
  
  IF v_month >= 4 THEN
    v_fy_key := 'FY' || (v_year % 100)::text || '-' || ((v_year + 1) % 100)::text;
  ELSE
    v_fy_key := 'FY' || ((v_year - 1) % 100)::text || '-' || (v_year % 100)::text;
  END IF;
  
  -- Get company code (default to MNS)
  SELECT COALESCE(code, 'MNS') INTO v_company_code
  FROM companies WHERE id = p_company_id;
  
  IF v_company_code IS NULL THEN
    v_company_code := 'MNS';
  END IF;
  
  -- Get and increment sequence atomically
  INSERT INTO invoice_sequences (company_id, fy_key, next_number)
  VALUES (p_company_id, v_fy_key, 2)
  ON CONFLICT (company_id, fy_key)
  DO UPDATE SET 
    next_number = invoice_sequences.next_number + 1,
    updated_at = now()
  RETURNING next_number - 1 INTO v_next_number;
  
  -- Format: INV-MNS-FY25-26-0001
  v_invoice_no := 'INV-' || v_company_code || '-' || v_fy_key || '-' || LPAD(v_next_number::text, 4, '0');
  
  RETURN v_invoice_no;
END;
$$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON public.invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_terms_mode ON public.invoices(terms_mode);
CREATE INDEX IF NOT EXISTS idx_invoices_reference_plan_id ON public.invoices(reference_plan_id);