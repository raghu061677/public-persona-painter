-- =============================================
-- PHASE-1: Aging-Based Auto Followups
-- =============================================

-- Invoice Reminders tracking table
CREATE TABLE public.invoice_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('whatsapp', 'email')),
  aging_bucket INTEGER NOT NULL CHECK (aging_bucket IN (7, 15, 30, 45)),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  message_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_reminder_per_bucket UNIQUE (invoice_id, reminder_type, aging_bucket)
);

-- Auto-reminder settings table
CREATE TABLE public.auto_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  buckets_enabled INTEGER[] NOT NULL DEFAULT ARRAY[7, 15, 30, 45],
  last_run_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_settings_per_company UNIQUE (company_id)
);

-- Enable RLS
ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_reminder_settings ENABLE ROW LEVEL SECURITY;

-- RLS for invoice_reminders (join through invoices)
CREATE POLICY "Users can view reminders for their company invoices"
ON public.invoice_reminders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM invoices i 
  WHERE i.id = invoice_reminders.invoice_id 
  AND (i.company_id::TEXT = get_current_user_company_id()::TEXT OR is_platform_admin(auth.uid()))
));

CREATE POLICY "System can insert reminders"
ON public.invoice_reminders FOR INSERT
WITH CHECK (true);

-- RLS for auto_reminder_settings
CREATE POLICY "Users can view their company settings"
ON public.auto_reminder_settings FOR SELECT
USING (company_id::TEXT = get_current_user_company_id()::TEXT OR is_platform_admin(auth.uid()));

CREATE POLICY "Admins can manage their company settings"
ON public.auto_reminder_settings FOR ALL
USING (company_id::TEXT = get_current_user_company_id()::TEXT OR is_platform_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_invoice_reminders_invoice_id ON invoice_reminders(invoice_id);
CREATE INDEX idx_invoice_reminders_sent_at ON invoice_reminders(sent_at);
CREATE INDEX idx_auto_reminder_settings_company ON auto_reminder_settings(company_id);

-- Function to get invoices needing reminders
CREATE OR REPLACE FUNCTION public.get_invoices_for_reminders(p_company_id UUID)
RETURNS TABLE (
  invoice_id TEXT,
  invoice_no TEXT,
  client_id TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  invoice_date DATE,
  due_date DATE,
  balance_due NUMERIC,
  days_overdue INTEGER,
  aging_bucket INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id AS invoice_id,
    i.invoice_no,
    i.client_id,
    COALESCE(c.name, i.client_name) AS client_name,
    c.email AS client_email,
    c.phone AS client_phone,
    i.invoice_date::DATE,
    i.due_date::DATE,
    i.balance_due,
    (CURRENT_DATE - i.due_date::DATE) AS days_overdue,
    CASE 
      WHEN (CURRENT_DATE - i.due_date::DATE) >= 45 THEN 45
      WHEN (CURRENT_DATE - i.due_date::DATE) >= 30 THEN 30
      WHEN (CURRENT_DATE - i.due_date::DATE) >= 15 THEN 15
      WHEN (CURRENT_DATE - i.due_date::DATE) >= 7 THEN 7
      ELSE NULL
    END AS aging_bucket
  FROM invoices i
  LEFT JOIN clients c ON i.client_id = c.id
  WHERE i.company_id = p_company_id
    AND i.status IN ('Sent', 'Partial', 'Overdue')
    AND COALESCE(i.balance_due, 0) > 0
    AND i.due_date IS NOT NULL
    AND (CURRENT_DATE - i.due_date::DATE) >= 7;
END;
$$;