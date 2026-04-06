
-- Auto-generated reminders table
CREATE TABLE public.collection_auto_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('soft','overdue','final','promise_broken')),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  overdue_days INTEGER NOT NULL DEFAULT 0,
  balance_at_trigger NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collection_auto_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company reminders"
  ON public.collection_auto_reminders FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create own company reminders"
  ON public.collection_auto_reminders FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE INDEX idx_auto_reminders_invoice ON public.collection_auto_reminders(invoice_id);
CREATE INDEX idx_auto_reminders_company ON public.collection_auto_reminders(company_id);

-- Client risk scores table
CREATE TABLE public.client_risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW','MEDIUM','HIGH')),
  avg_delay_days NUMERIC NOT NULL DEFAULT 0,
  overdue_frequency INTEGER NOT NULL DEFAULT 0,
  total_outstanding NUMERIC NOT NULL DEFAULT 0,
  payment_consistency_score NUMERIC NOT NULL DEFAULT 100,
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, client_id)
);

ALTER TABLE public.client_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company risk scores"
  ON public.client_risk_scores FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own company risk scores"
  ON public.client_risk_scores FOR ALL
  USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE INDEX idx_risk_scores_client ON public.client_risk_scores(client_id);
CREATE INDEX idx_risk_scores_company ON public.client_risk_scores(company_id);
