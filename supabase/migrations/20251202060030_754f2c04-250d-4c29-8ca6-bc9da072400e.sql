-- Create campaign timeline table for tracking all events
CREATE TABLE IF NOT EXISTS campaign_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id),
  event_type text NOT NULL,
  event_title text,
  event_description text,
  event_time timestamptz DEFAULT now(),
  created_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_campaign_timeline_campaign_id ON campaign_timeline(campaign_id);
CREATE INDEX idx_campaign_timeline_event_time ON campaign_timeline(event_time DESC);

-- Add RLS policies
ALTER TABLE campaign_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view timeline for their company campaigns"
  ON campaign_timeline FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "System can insert timeline events"
  ON campaign_timeline FOR INSERT
  WITH CHECK (true);

-- Add optional QR verification fields to operations table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operations' AND column_name = 'qr_verified') THEN
    ALTER TABLE operations ADD COLUMN qr_verified boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operations' AND column_name = 'qr_verified_at') THEN
    ALTER TABLE operations ADD COLUMN qr_verified_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operations' AND column_name = 'qr_location_lat') THEN
    ALTER TABLE operations ADD COLUMN qr_location_lat numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operations' AND column_name = 'qr_location_lng') THEN
    ALTER TABLE operations ADD COLUMN qr_location_lng numeric;
  END IF;
END $$;