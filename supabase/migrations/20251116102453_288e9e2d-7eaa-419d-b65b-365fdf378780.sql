-- Campaign Creatives Table (for creative upload workflow)
CREATE TABLE IF NOT EXISTS campaign_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Operations Tasks Table (for auto-mounting assignment)
CREATE TABLE IF NOT EXISTS operations_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  asset_id text NOT NULL,
  task_type text NOT NULL DEFAULT 'mounting' CHECK (task_type IN ('mounting', 'installation', 'removal')),
  assigned_to uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  scheduled_date date,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payment Reminders Table (for automated reminder system)
CREATE TABLE IF NOT EXISTS payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text NOT NULL,
  reminder_number integer NOT NULL,
  sent_at timestamptz,
  method text NOT NULL CHECK (method IN ('email', 'sms', 'whatsapp')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE campaign_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_creatives
CREATE POLICY "Company users can view their campaign creatives"
  ON campaign_creatives FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE company_id = get_current_user_company_id()
    )
  );

CREATE POLICY "Admins can insert campaign creatives"
  ON campaign_creatives FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations')
  );

CREATE POLICY "Admins can update campaign creatives"
  ON campaign_creatives FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations')
  );

CREATE POLICY "Admins can delete campaign creatives"
  ON campaign_creatives FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for operations_tasks
CREATE POLICY "Company users can view their operations tasks"
  ON operations_tasks FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE company_id = get_current_user_company_id()
    )
  );

CREATE POLICY "Admins can manage operations tasks"
  ON operations_tasks FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operations')
  );

-- RLS Policies for payment_reminders
CREATE POLICY "Finance users can view payment reminders"
  ON payment_reminders FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'finance')
  );

CREATE POLICY "System can insert payment reminders"
  ON payment_reminders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update payment reminders"
  ON payment_reminders FOR UPDATE
  USING (true);

-- Indexes for performance
CREATE INDEX idx_campaign_creatives_campaign ON campaign_creatives(campaign_id);
CREATE INDEX idx_operations_tasks_campaign ON operations_tasks(campaign_id);
CREATE INDEX idx_operations_tasks_assigned ON operations_tasks(assigned_to);
CREATE INDEX idx_payment_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX idx_payment_reminders_status ON payment_reminders(status);

-- Triggers for updated_at
CREATE TRIGGER update_campaign_creatives_updated_at
  BEFORE UPDATE ON campaign_creatives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operations_tasks_updated_at
  BEFORE UPDATE ON operations_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();