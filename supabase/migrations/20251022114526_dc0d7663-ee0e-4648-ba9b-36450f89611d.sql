-- Create leads table for WhatsApp and Email lead capture
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  email text,
  phone text,
  requirement text,
  location text,
  source text NOT NULL CHECK (source IN ('whatsapp', 'email', 'manual', 'web')),
  status text NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Qualified', 'Converted', 'Lost')),
  synced_to_zoho boolean DEFAULT false,
  zoho_lead_id text,
  raw_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create whatsapp_logs table for tracking WhatsApp communications
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('incoming', 'outgoing')),
  content_type text CHECK (content_type IN ('text', 'image', 'document', 'template')),
  message_body text,
  media_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  campaign_id text,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create email_logs table for tracking email parsing
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id text UNIQUE NOT NULL,
  sender_email text NOT NULL,
  subject text,
  body_preview text,
  ai_parsed_data jsonb,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  parsing_status text DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'success', 'failed')),
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Authenticated users can view leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage leads"
  ON public.leads FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for whatsapp_logs
CREATE POLICY "Authenticated users can view whatsapp logs"
  ON public.whatsapp_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage whatsapp logs"
  ON public.whatsapp_logs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for email_logs
CREATE POLICY "Authenticated users can view email logs"
  ON public.email_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage email logs"
  ON public.email_logs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger for leads
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_leads_source ON public.leads(source);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_phone ON public.leads(phone);
CREATE INDEX idx_whatsapp_logs_phone ON public.whatsapp_logs(phone_number);
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);
CREATE INDEX idx_email_logs_gmail_id ON public.email_logs(gmail_message_id);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);