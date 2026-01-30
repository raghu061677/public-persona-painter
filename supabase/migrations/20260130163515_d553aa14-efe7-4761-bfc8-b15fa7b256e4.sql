-- =============================================
-- PHASE-2: Credit Notes & Adjustments (GST-Safe)
-- =============================================

-- Credit Notes table
CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  gst_mode TEXT DEFAULT 'CGST_SGST',
  cgst_amount NUMERIC(15,2) DEFAULT 0,
  sgst_amount NUMERIC(15,2) DEFAULT 0,
  igst_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Issued', 'Cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT credit_notes_credit_note_id_unique UNIQUE (credit_note_id)
);

-- Credit Note Items table
CREATE TABLE public.credit_note_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  campaign_asset_id UUID REFERENCES campaign_assets(id),
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_notes (with proper type casting)
CREATE POLICY "Users can view credit notes in their company"
ON public.credit_notes FOR SELECT
USING (company_id::TEXT = get_current_user_company_id()::TEXT OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can insert credit notes in their company"
ON public.credit_notes FOR INSERT
WITH CHECK (company_id::TEXT = get_current_user_company_id()::TEXT OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can update credit notes in their company"
ON public.credit_notes FOR UPDATE
USING (company_id::TEXT = get_current_user_company_id()::TEXT OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can delete draft credit notes"
ON public.credit_notes FOR DELETE
USING ((company_id::TEXT = get_current_user_company_id()::TEXT OR is_platform_admin(auth.uid())) AND status = 'Draft');

-- RLS Policies for credit_note_items
CREATE POLICY "Users can view credit note items"
ON public.credit_note_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM credit_notes cn 
  WHERE cn.id = credit_note_items.credit_note_id 
  AND (cn.company_id::TEXT = get_current_user_company_id()::TEXT OR is_platform_admin(auth.uid()))
));

CREATE POLICY "Users can manage credit note items"
ON public.credit_note_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM credit_notes cn 
  WHERE cn.id = credit_note_items.credit_note_id 
  AND (cn.company_id::TEXT = get_current_user_company_id()::TEXT OR is_platform_admin(auth.uid()))
));

-- Function to generate credit note ID: CN-YYYYMM-####
CREATE OR REPLACE FUNCTION public.generate_credit_note_id(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year_month TEXT;
  v_counter_key TEXT;
  v_next_val INTEGER;
  v_credit_note_id TEXT;
BEGIN
  v_year_month := to_char(CURRENT_DATE, 'YYYYMM');
  v_counter_key := 'CN-' || v_year_month || '-' || p_company_id::TEXT;
  
  INSERT INTO public.code_counters (counter_key, counter_value)
  VALUES (v_counter_key, 1)
  ON CONFLICT (counter_key)
  DO UPDATE SET counter_value = code_counters.counter_value + 1
  RETURNING counter_value INTO v_next_val;
  
  v_credit_note_id := 'CN-' || v_year_month || '-' || LPAD(v_next_val::TEXT, 4, '0');
  
  RETURN v_credit_note_id;
END;
$$;

-- Trigger function to update invoice balance when credit note is issued
CREATE OR REPLACE FUNCTION public.apply_credit_note_to_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance NUMERIC(15,2);
  v_new_balance NUMERIC(15,2);
  v_new_status TEXT;
BEGIN
  IF NEW.status = 'Issued' AND (OLD.status IS NULL OR OLD.status != 'Issued') THEN
    SELECT COALESCE(balance_due, total_amount, 0)
    INTO v_current_balance
    FROM invoices
    WHERE id = NEW.invoice_id;
    
    v_new_balance := GREATEST(0, v_current_balance - NEW.total_amount);
    
    IF v_new_balance <= 0 THEN
      v_new_status := 'Paid';
    ELSE
      v_new_status := 'Partial';
    END IF;
    
    UPDATE invoices
    SET 
      balance_due = v_new_balance,
      status = v_new_status,
      updated_at = now()
    WHERE id = NEW.invoice_id
      AND status NOT IN ('Draft', 'Cancelled');
  END IF;
  
  IF NEW.status = 'Cancelled' AND OLD.status = 'Issued' THEN
    UPDATE invoices
    SET 
      balance_due = COALESCE(balance_due, 0) + OLD.total_amount,
      status = CASE 
        WHEN COALESCE(balance_due, 0) + OLD.total_amount >= total_amount THEN 'Sent'
        ELSE 'Partial'
      END,
      updated_at = now()
    WHERE id = NEW.invoice_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER credit_note_apply_to_invoice
AFTER INSERT OR UPDATE OF status ON public.credit_notes
FOR EACH ROW
EXECUTE FUNCTION apply_credit_note_to_invoice();

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_credit_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_status TEXT;
  v_invoice_total NUMERIC(15,2);
  v_existing_credits NUMERIC(15,2);
  v_max_credit NUMERIC(15,2);
BEGIN
  SELECT status, COALESCE(total_amount, 0)
  INTO v_invoice_status, v_invoice_total
  FROM invoices
  WHERE id = NEW.invoice_id;
  
  IF v_invoice_status IS NULL THEN
    RAISE EXCEPTION 'Invoice not found: %', NEW.invoice_id;
  END IF;
  
  IF v_invoice_status = 'Draft' THEN
    RAISE EXCEPTION 'Cannot create credit note for draft invoice';
  END IF;
  
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_existing_credits
  FROM credit_notes
  WHERE invoice_id = NEW.invoice_id
    AND status = 'Issued'
    AND id != NEW.id;
  
  v_max_credit := v_invoice_total - v_existing_credits;
  
  IF NEW.status = 'Issued' AND NEW.total_amount > v_max_credit THEN
    RAISE EXCEPTION 'Credit note amount (%) exceeds maximum allowed (%)', NEW.total_amount, v_max_credit;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_credit_note_trigger
BEFORE INSERT OR UPDATE ON public.credit_notes
FOR EACH ROW
EXECUTE FUNCTION validate_credit_note();

-- Indexes
CREATE INDEX idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX idx_credit_notes_company_id ON credit_notes(company_id);
CREATE INDEX idx_credit_notes_status ON credit_notes(status);
CREATE INDEX idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);