-- Create campaign templates table
CREATE TABLE IF NOT EXISTS campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER,
  client_type TEXT,
  asset_preferences JSONB DEFAULT '{}'::jsonb,
  default_status TEXT DEFAULT 'Planned',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage templates"
  ON campaign_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view templates"
  ON campaign_templates
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own templates"
  ON campaign_templates
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Add indexes
CREATE INDEX idx_campaign_templates_created_by ON campaign_templates(created_by);
CREATE INDEX idx_campaign_templates_active ON campaign_templates(is_active) WHERE is_active = true;