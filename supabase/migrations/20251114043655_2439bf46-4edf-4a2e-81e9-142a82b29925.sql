-- Create client portal access logs table for security auditing
CREATE TABLE IF NOT EXISTS public.client_portal_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_portal_access_logs_client ON public.client_portal_access_logs(client_id);
CREATE INDEX idx_portal_access_logs_created_at ON public.client_portal_access_logs(created_at DESC);
CREATE INDEX idx_portal_access_logs_action ON public.client_portal_access_logs(action);

-- Enable RLS
ALTER TABLE public.client_portal_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all access logs"
  ON public.client_portal_access_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert access logs"
  ON public.client_portal_access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);