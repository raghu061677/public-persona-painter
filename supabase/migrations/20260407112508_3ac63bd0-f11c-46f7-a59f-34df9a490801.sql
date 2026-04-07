
-- Finance Corrections & Audit Log
CREATE TABLE public.finance_corrections_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  action_type text NOT NULL, -- 'invoice_number_correction', 'legacy_campaign_close', 'receivables_exclusion'
  entity_type text NOT NULL, -- 'invoice', 'campaign'
  entity_id text NOT NULL,
  old_value jsonb DEFAULT '{}',
  new_value jsonb DEFAULT '{}',
  reason text,
  conflict_status text DEFAULT 'none', -- 'none', 'conflict_detected', 'resolved'
  status text NOT NULL DEFAULT 'applied', -- 'preview', 'applied', 'rejected'
  performed_by uuid,
  performed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.finance_corrections_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company corrections"
ON public.finance_corrections_log FOR SELECT
TO authenticated
USING (company_id = (SELECT public.get_user_company_id(auth.uid())));

CREATE POLICY "Users can insert their company corrections"
ON public.finance_corrections_log FOR INSERT
TO authenticated
WITH CHECK (company_id = (SELECT public.get_user_company_id(auth.uid())));

-- Legacy close columns on campaigns
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS legacy_close_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS legacy_close_notes text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS legacy_close_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS legacy_close_by uuid DEFAULT NULL;

COMMENT ON COLUMN public.campaigns.legacy_close_status IS 'Values: legacy_closed, legacy_invoicing_reviewed, legacy_settlement_reviewed';
