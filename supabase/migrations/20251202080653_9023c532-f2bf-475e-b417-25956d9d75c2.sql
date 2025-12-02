-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text,
  phone text,
  email text,
  company text,
  location text,
  source text NOT NULL DEFAULT 'Manual',
  requirement text,
  status text NOT NULL DEFAULT 'New',
  assigned_to uuid REFERENCES company_users(user_id),
  client_id text REFERENCES clients(id),
  converted_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lead_followups table
CREATE TABLE IF NOT EXISTS lead_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note text NOT NULL,
  followup_date timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_followups_lead_id ON lead_followups(lead_id);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_followups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Users can view leads in their company"
  ON leads FOR SELECT
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can insert leads in their company"
  ON leads FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "Users can update leads in their company"
  ON leads FOR UPDATE
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can delete leads in their company"
  ON leads FOR DELETE
  USING (company_id = get_current_user_company_id());

-- RLS Policies for lead_followups
CREATE POLICY "Users can view followups for their company leads"
  ON lead_followups FOR SELECT
  USING (lead_id IN (SELECT id FROM leads WHERE company_id = get_current_user_company_id()));

CREATE POLICY "Users can insert followups for their company leads"
  ON lead_followups FOR INSERT
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE company_id = get_current_user_company_id()));

CREATE POLICY "Users can update followups for their company leads"
  ON lead_followups FOR UPDATE
  USING (lead_id IN (SELECT id FROM leads WHERE company_id = get_current_user_company_id()));

CREATE POLICY "Users can delete followups for their company leads"
  ON lead_followups FOR DELETE
  USING (lead_id IN (SELECT id FROM leads WHERE company_id = get_current_user_company_id()));

-- Function to check asset conflicts
CREATE OR REPLACE FUNCTION check_asset_conflict(
  p_asset_id text,
  p_start_date date,
  p_end_date date,
  p_exclude_campaign_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict jsonb;
BEGIN
  SELECT jsonb_build_object(
    'has_conflict', EXISTS (
      SELECT 1 
      FROM campaign_assets ca 
      JOIN campaigns c ON ca.campaign_id = c.id
      WHERE ca.asset_id = p_asset_id
      AND daterange(c.start_date, c.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
      AND c.status NOT IN ('Completed', 'Cancelled', 'Archived')
      AND (p_exclude_campaign_id IS NULL OR c.id != p_exclude_campaign_id)
    ),
    'conflicting_campaigns', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'campaign_id', c.id,
        'campaign_name', c.campaign_name,
        'client_name', c.client_name,
        'start_date', c.start_date,
        'end_date', c.end_date,
        'status', c.status
      ))
      FROM campaign_assets ca 
      JOIN campaigns c ON ca.campaign_id = c.id
      WHERE ca.asset_id = p_asset_id
      AND daterange(c.start_date, c.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
      AND c.status NOT IN ('Completed', 'Cancelled', 'Archived')
      AND (p_exclude_campaign_id IS NULL OR c.id != p_exclude_campaign_id)
    ), '[]'::jsonb)
  ) INTO v_conflict;
  
  RETURN v_conflict;
END;
$$;