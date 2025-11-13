-- Create notifications tracking table
CREATE TABLE IF NOT EXISTS operations_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL,
  asset_id text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('email', 'whatsapp')),
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  subject text,
  message text,
  sent_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_operations_notifications_campaign ON operations_notifications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_operations_notifications_asset ON operations_notifications(asset_id);
CREATE INDEX IF NOT EXISTS idx_operations_notifications_status ON operations_notifications(status);
CREATE INDEX IF NOT EXISTS idx_operations_notifications_type ON operations_notifications(notification_type);

-- Enable RLS
ALTER TABLE operations_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view notifications"
ON operations_notifications
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert notifications"
ON operations_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update notifications"
ON operations_notifications
FOR UPDATE
TO authenticated
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_operations_notifications_updated_at
  BEFORE UPDATE ON operations_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add notification settings to campaigns table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'campaigns' AND column_name = 'notification_settings') THEN
    ALTER TABLE campaigns ADD COLUMN notification_settings jsonb DEFAULT '{
      "email_notifications": true,
      "whatsapp_notifications": true,
      "notify_on_upload": true,
      "notify_on_verification": true
    }'::jsonb;
  END IF;
END $$;