
CREATE TABLE public.invoice_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  contact_type TEXT NOT NULL DEFAULT 'Call',
  follow_up_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_follow_up_date DATE,
  promised_payment_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_followups_invoice_id ON public.invoice_followups(invoice_id);
CREATE INDEX idx_invoice_followups_company_id ON public.invoice_followups(company_id);
CREATE INDEX idx_invoice_followups_next_date ON public.invoice_followups(next_follow_up_date);

ALTER TABLE public.invoice_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company followups"
ON public.invoice_followups FOR SELECT TO authenticated
USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Users can create own company followups"
ON public.invoice_followups FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_current_user_company_id());

CREATE POLICY "Users can update own company followups"
ON public.invoice_followups FOR UPDATE TO authenticated
USING (company_id = public.get_current_user_company_id());

CREATE TRIGGER update_invoice_followups_updated_at
BEFORE UPDATE ON public.invoice_followups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
