
-- ====================================================
-- PHASE-2: PAYMENT CONFIRMATIONS WITH AUTO-SEND TRACKING
-- ====================================================

-- Add whatsapp field to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Create payment_confirmations table
CREATE TABLE IF NOT EXISTS public.payment_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  invoice_id TEXT REFERENCES public.invoices(id) ON DELETE CASCADE,
  
  -- WhatsApp submission details
  whatsapp_message TEXT,
  whatsapp_media_url TEXT,
  whatsapp_from TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  
  -- Claimed payment info (from WhatsApp message)
  claimed_amount NUMERIC(15,2) NOT NULL,
  claimed_method TEXT,
  claimed_reference TEXT,
  claimed_date DATE,
  
  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  approved_amount NUMERIC(15,2),
  approved_method TEXT,
  approved_reference TEXT,
  approved_date DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Linked records after approval
  payment_record_id UUID REFERENCES public.payment_records(id) ON DELETE SET NULL,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
  
  -- WhatsApp send status
  whatsapp_send_status TEXT DEFAULT 'not_sent' CHECK (whatsapp_send_status IN ('not_sent', 'pending', 'sent', 'failed')),
  whatsapp_send_error TEXT,
  whatsapp_sent_at TIMESTAMPTZ,
  
  -- Email send status
  email_send_status TEXT DEFAULT 'not_sent' CHECK (email_send_status IN ('not_sent', 'pending', 'sent', 'failed')),
  email_send_error TEXT,
  email_sent_at TIMESTAMPTZ,
  
  -- Send preferences (set during approval)
  send_whatsapp BOOLEAN DEFAULT true,
  send_email BOOLEAN DEFAULT true,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_company ON public.payment_confirmations(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_client ON public.payment_confirmations(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_invoice ON public.payment_confirmations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_status ON public.payment_confirmations(status);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_submitted ON public.payment_confirmations(submitted_at DESC);

-- Ensure receipt has pdf_url for auto-send
ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Enable RLS
ALTER TABLE public.payment_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view payment confirmations for their company"
ON public.payment_confirmations FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert payment confirmations for their company"
ON public.payment_confirmations FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update payment confirmations for their company"
ON public.payment_confirmations FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_payment_confirmation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_confirmations_updated_at
  BEFORE UPDATE ON public.payment_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_confirmation_timestamp();

-- Add comments
COMMENT ON TABLE public.payment_confirmations IS 'WhatsApp payment confirmations pending approval';
COMMENT ON COLUMN public.payment_confirmations.status IS 'Pending = awaiting review, Approved = payment recorded, Rejected = declined';
COMMENT ON COLUMN public.payment_confirmations.whatsapp_send_status IS 'Receipt delivery status via WhatsApp';
COMMENT ON COLUMN public.payment_confirmations.email_send_status IS 'Receipt delivery status via Email';
