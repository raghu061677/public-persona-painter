-- Add missing columns to organization_settings table for client portal
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS client_portal_settings jsonb DEFAULT '{}'::jsonb;

-- Create index for company_id lookups
CREATE INDEX IF NOT EXISTS idx_organization_settings_company_id ON organization_settings(company_id);

-- Update existing row to link to a company if there's only one company
DO $$
DECLARE
  single_company_id uuid;
  settings_count int;
BEGIN
  -- Check if there's exactly one company
  SELECT id INTO single_company_id FROM companies LIMIT 1;
  
  -- Check if there's an existing organization_settings row without company_id
  SELECT COUNT(*) INTO settings_count FROM organization_settings WHERE company_id IS NULL;
  
  -- If we have a single company and settings without company_id, link them
  IF single_company_id IS NOT NULL AND settings_count > 0 THEN
    UPDATE organization_settings 
    SET company_id = single_company_id 
    WHERE company_id IS NULL;
  END IF;
END $$;

-- Add RLS policies for organization_settings
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their company's settings
CREATE POLICY "Users can view their company settings"
ON organization_settings
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid()
  )
);

-- Policy: Admins can update their company's settings
CREATE POLICY "Admins can update their company settings"
ON organization_settings
FOR UPDATE
USING (
  company_id IN (
    SELECT cu.company_id 
    FROM company_users cu
    WHERE cu.user_id = auth.uid() AND cu.role = 'admin'
  )
);

-- Policy: Admins can insert settings for their company
CREATE POLICY "Admins can insert their company settings"
ON organization_settings
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT cu.company_id 
    FROM company_users cu
    WHERE cu.user_id = auth.uid() AND cu.role = 'admin'
  )
);