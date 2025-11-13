-- Add bill_id to expenses table for power bill tracking
ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS bill_id uuid REFERENCES public.asset_power_bills(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expenses_bill_id ON public.expenses(bill_id);

-- Create power_bill_jobs table for automation tracking
CREATE TABLE IF NOT EXISTS public.power_bill_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL,
  job_type text NOT NULL DEFAULT 'monthly_fetch', -- 'monthly_fetch', 'reconciliation', 'reminder'
  job_status text NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  run_date timestamptz NOT NULL DEFAULT now(),
  result jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_power_bill_jobs_asset_id ON public.power_bill_jobs(asset_id);
CREATE INDEX IF NOT EXISTS idx_power_bill_jobs_status ON public.power_bill_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_power_bill_jobs_date ON public.power_bill_jobs(run_date);

-- Create bill_reminders table for tracking WhatsApp/email reminders
CREATE TABLE IF NOT EXISTS public.bill_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES public.asset_power_bills(id) ON DELETE CASCADE,
  reminder_type text NOT NULL, -- 'whatsapp', 'email', 'sms'
  recipient text NOT NULL, -- phone number or email
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at timestamptz,
  scheduled_for timestamptz NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bill_reminders_bill_id ON public.bill_reminders(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_status ON public.bill_reminders(status);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_scheduled ON public.bill_reminders(scheduled_for);

-- Add anomaly detection fields to asset_power_bills
ALTER TABLE public.asset_power_bills
  ADD COLUMN IF NOT EXISTS is_anomaly boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS anomaly_type text, -- 'high_spike', 'sudden_drop', 'irregular_pattern'
  ADD COLUMN IF NOT EXISTS anomaly_details jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_reconciled_at timestamptz;

-- Create storage bucket for power bill receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('power-receipts', 'power-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for power_bill_jobs
ALTER TABLE public.power_bill_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and operations can view jobs"
  ON public.power_bill_jobs FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'operations'::app_role) OR
    has_role(auth.uid(), 'finance'::app_role)
  );

CREATE POLICY "System can insert jobs"
  ON public.power_bill_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update jobs"
  ON public.power_bill_jobs FOR UPDATE
  USING (true);

-- RLS policies for bill_reminders
ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reminders"
  ON public.bill_reminders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage reminders"
  ON public.bill_reminders FOR ALL
  USING (true);

-- RLS policies for power-receipts bucket
CREATE POLICY "Admins and finance can read receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'power-receipts' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role))
  );

CREATE POLICY "Admins and finance can upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'power-receipts' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role))
  );

CREATE POLICY "Admins can delete receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'power-receipts' AND
    has_role(auth.uid(), 'admin'::app_role)
  );