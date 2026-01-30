-- Create payment_records table
CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL,
  client_id TEXT,
  campaign_id TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL DEFAULT 'Bank Transfer',
  reference_no TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_records_invoice ON public.payment_records(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_client ON public.payment_records(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_company ON public.payment_records(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_date ON public.payment_records(payment_date);

-- Enable RLS
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view payment records" 
  ON public.payment_records FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert payment records" 
  ON public.payment_records FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update payment records" 
  ON public.payment_records FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete payment records" 
  ON public.payment_records FOR DELETE 
  USING (true);

-- Add paid_amount column to invoices if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'paid_amount') THEN
    ALTER TABLE public.invoices ADD COLUMN paid_amount NUMERIC(15,2) DEFAULT 0;
  END IF;
END $$;

-- Update balance_due for existing invoices where it's null
UPDATE public.invoices 
SET balance_due = COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)
WHERE balance_due IS NULL;

-- Update existing invoices to have paid_amount = 0 if null
UPDATE public.invoices 
SET paid_amount = 0
WHERE paid_amount IS NULL;