
-- Create collection_communications table
CREATE TABLE public.collection_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  campaign_id TEXT,
  message TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'call', 'note')),
  template_type TEXT NOT NULL,
  sent_by UUID NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'draft', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collection_communications ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view communications for their company
CREATE POLICY "Users can view own company communications"
ON public.collection_communications
FOR SELECT
TO authenticated
USING (company_id IN (
  SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
));

-- RLS: Users can insert communications for their company
CREATE POLICY "Users can create communications for own company"
ON public.collection_communications
FOR INSERT
TO authenticated
WITH CHECK (company_id IN (
  SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
));

-- Indexes
CREATE INDEX idx_collection_comms_company ON public.collection_communications(company_id);
CREATE INDEX idx_collection_comms_invoice ON public.collection_communications(invoice_id);
CREATE INDEX idx_collection_comms_client ON public.collection_communications(client_id);
CREATE INDEX idx_collection_comms_sent_at ON public.collection_communications(sent_at DESC);
