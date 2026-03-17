
-- 1) Add additional TDS fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tds_section text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tan_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS finance_contact text DEFAULT NULL;

-- 2) Create tds_ledger table for tracking TDS lifecycle
CREATE TABLE public.tds_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  client_id text NOT NULL,
  invoice_id text NOT NULL,
  payment_record_id uuid REFERENCES public.payment_records(id) ON DELETE SET NULL,
  financial_year text NOT NULL, -- e.g. 'FY2025-26'
  quarter text NOT NULL, -- 'Q1','Q2','Q3','Q4'
  tds_section text, -- e.g. '194C'
  tds_amount numeric(15,2) NOT NULL DEFAULT 0,
  invoice_amount numeric(15,2) DEFAULT 0,
  amount_received numeric(15,2) DEFAULT 0,
  tds_certificate_no text,
  form16a_received boolean NOT NULL DEFAULT false,
  reflected_in_26as boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Deducted', -- Deducted, Filed, Reflected, Verified
  followup_notes text,
  followup_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tds_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tds_ledger_company_access" ON public.tds_ledger
  FOR ALL USING (company_id = public.current_company_id());

-- Index for common queries
CREATE INDEX idx_tds_ledger_company_fy ON public.tds_ledger(company_id, financial_year);
CREATE INDEX idx_tds_ledger_client ON public.tds_ledger(client_id);
CREATE INDEX idx_tds_ledger_invoice ON public.tds_ledger(invoice_id);

-- 3) Auto-create tds_ledger entry when payment with TDS is recorded
CREATE OR REPLACE FUNCTION public.auto_create_tds_ledger_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_client_id text;
  v_total_amount numeric;
  v_fy text;
  v_quarter text;
  v_month int;
  v_year int;
  v_section text;
BEGIN
  -- Only process if tds_amount > 0
  IF COALESCE(NEW.tds_amount, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- Get invoice details
  SELECT company_id, client_id, total_amount
  INTO v_company_id, v_client_id, v_total_amount
  FROM public.invoices
  WHERE id = NEW.invoice_id;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate FY and Quarter from payment date
  v_month := EXTRACT(MONTH FROM NEW.payment_date::date);
  v_year := EXTRACT(YEAR FROM NEW.payment_date::date);
  
  IF v_month >= 4 THEN
    v_fy := 'FY' || v_year || '-' || RIGHT(CAST(v_year + 1 AS text), 2);
  ELSE
    v_fy := 'FY' || (v_year - 1) || '-' || RIGHT(CAST(v_year AS text), 2);
  END IF;

  IF v_month IN (4,5,6) THEN v_quarter := 'Q1';
  ELSIF v_month IN (7,8,9) THEN v_quarter := 'Q2';
  ELSIF v_month IN (10,11,12) THEN v_quarter := 'Q3';
  ELSE v_quarter := 'Q4';
  END IF;

  -- Get client TDS section
  SELECT tds_section INTO v_section FROM public.clients WHERE id = v_client_id;

  INSERT INTO public.tds_ledger (
    company_id, client_id, invoice_id, payment_record_id,
    financial_year, quarter, tds_section, tds_amount,
    invoice_amount, amount_received, tds_certificate_no, status
  ) VALUES (
    v_company_id, v_client_id, NEW.invoice_id, NEW.id,
    v_fy, v_quarter, v_section, NEW.tds_amount,
    v_total_amount, NEW.amount, NEW.tds_certificate_no, 'Deducted'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_tds_ledger ON public.payment_records;
CREATE TRIGGER trg_auto_tds_ledger
AFTER INSERT ON public.payment_records
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_tds_ledger_entry();

-- 4) Trigger for updated_at on tds_ledger
CREATE TRIGGER update_tds_ledger_updated_at
BEFORE UPDATE ON public.tds_ledger
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
