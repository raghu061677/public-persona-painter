-- =============================================
-- PHASE-2: Receipts Table & Auto-Generation (Fixed)
-- =============================================

-- 1) Create receipts table
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  client_id TEXT,
  invoice_id TEXT REFERENCES public.invoices(id),
  payment_record_id UUID REFERENCES public.payment_records(id) UNIQUE,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_received NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  reference_no TEXT,
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- 2) Create receipt_sequences table for RCT-YYYYMM-#### numbering
CREATE TABLE IF NOT EXISTS public.receipt_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  year_month TEXT NOT NULL,
  next_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, year_month)
);

-- 3) Function to generate receipt number
CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_company_id UUID, p_receipt_date DATE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year_month TEXT;
  v_next_number INTEGER;
  v_receipt_no TEXT;
BEGIN
  -- Get YYYYMM from receipt date
  v_year_month := to_char(p_receipt_date, 'YYYYMM');
  
  -- Upsert sequence and get next number
  INSERT INTO public.receipt_sequences (company_id, year_month, next_number)
  VALUES (p_company_id, v_year_month, 1)
  ON CONFLICT (company_id, year_month)
  DO UPDATE SET next_number = receipt_sequences.next_number + 1, updated_at = now()
  RETURNING next_number INTO v_next_number;
  
  -- Format: RCT-YYYYMM-####
  v_receipt_no := 'RCT-' || v_year_month || '-' || LPAD(v_next_number::TEXT, 4, '0');
  
  RETURN v_receipt_no;
END;
$$;

-- 4) Trigger function to auto-create receipt when payment_record is inserted
CREATE OR REPLACE FUNCTION public.create_receipt_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_receipt_no TEXT;
  v_company_id UUID;
  v_client_id TEXT;
BEGIN
  -- Get company_id and client_id from the invoice
  SELECT company_id, client_id INTO v_company_id, v_client_id
  FROM public.invoices
  WHERE id = NEW.invoice_id;
  
  -- Use payment record's company_id if available, otherwise use invoice's
  v_company_id := COALESCE(NEW.company_id, v_company_id);
  
  -- Generate receipt number
  v_receipt_no := public.generate_receipt_number(v_company_id, NEW.payment_date);
  
  -- Insert receipt
  INSERT INTO public.receipts (
    receipt_no,
    company_id,
    client_id,
    invoice_id,
    payment_record_id,
    receipt_date,
    amount_received,
    payment_method,
    reference_no,
    notes,
    created_by
  ) VALUES (
    v_receipt_no,
    v_company_id,
    v_client_id,
    NEW.invoice_id,
    NEW.id,
    NEW.payment_date,
    NEW.amount,
    NEW.method,
    NEW.reference_no,
    NEW.notes,
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$;

-- 5) Create trigger on payment_records
CREATE TRIGGER trigger_create_receipt_on_payment
AFTER INSERT ON public.payment_records
FOR EACH ROW
EXECUTE FUNCTION public.create_receipt_on_payment();

-- 6) Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_sequences ENABLE ROW LEVEL SECURITY;

-- 7) RLS policies for receipts (using valid roles: admin, finance)
CREATE POLICY "receipts_select_policy" ON public.receipts
FOR SELECT USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "receipts_insert_policy" ON public.receipts
FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "receipts_update_policy" ON public.receipts
FOR UPDATE USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 8) RLS policies for receipt_sequences  
CREATE POLICY "receipt_sequences_all_policy" ON public.receipt_sequences
FOR ALL USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 9) Index for performance
CREATE INDEX idx_receipts_invoice_id ON public.receipts(invoice_id);
CREATE INDEX idx_receipts_payment_record_id ON public.receipts(payment_record_id);
CREATE INDEX idx_receipts_company_id ON public.receipts(company_id);
CREATE INDEX idx_receipts_receipt_date ON public.receipts(receipt_date);
CREATE INDEX idx_receipts_client_id ON public.receipts(client_id);

-- 10) Create receipts for existing payment_records (backfill)
INSERT INTO public.receipts (
  receipt_no,
  company_id,
  client_id,
  invoice_id,
  payment_record_id,
  receipt_date,
  amount_received,
  payment_method,
  reference_no,
  notes,
  created_by,
  created_at
)
SELECT 
  'RCT-' || to_char(pr.payment_date, 'YYYYMM') || '-' || LPAD(
    ROW_NUMBER() OVER (PARTITION BY COALESCE(pr.company_id, i.company_id), to_char(pr.payment_date, 'YYYYMM') ORDER BY pr.created_at)::TEXT, 
    4, '0'
  ),
  COALESCE(pr.company_id, i.company_id),
  i.client_id,
  pr.invoice_id,
  pr.id,
  pr.payment_date,
  pr.amount,
  pr.method,
  pr.reference_no,
  pr.notes,
  pr.created_by,
  pr.created_at
FROM public.payment_records pr
LEFT JOIN public.invoices i ON i.id = pr.invoice_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.receipts r WHERE r.payment_record_id = pr.id
);