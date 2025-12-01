-- STEP 2: Enhance existing client_contacts table + Lead conversion support

-- Add company_id to client_contacts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_contacts' 
    AND column_name = 'company_id'
  ) THEN
    -- Get company_id from clients table for existing contacts
    ALTER TABLE client_contacts 
    ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
    
    -- Populate company_id from clients
    UPDATE client_contacts cc
    SET company_id = c.company_id
    FROM clients c
    WHERE cc.client_id = c.id;
    
    -- Make it NOT NULL after population
    ALTER TABLE client_contacts 
    ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;

-- Add additional contact fields if they don't exist
ALTER TABLE client_contacts 
ADD COLUMN IF NOT EXISTS salutation text,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS work_phone text,
ADD COLUMN IF NOT EXISTS mobile text;

-- Indexes for client_contacts
CREATE INDEX IF NOT EXISTS idx_client_contacts_company_id 
  ON client_contacts(company_id);

-- RLS policies for client_contacts (recreate if needed)
DROP POLICY IF EXISTS "Company users can view client contacts" ON client_contacts;
DROP POLICY IF EXISTS "Company admins/sales can insert client contacts" ON client_contacts;
DROP POLICY IF EXISTS "Company admins/sales can update client contacts" ON client_contacts;
DROP POLICY IF EXISTS "Company admins/sales can delete client contacts" ON client_contacts;
DROP POLICY IF EXISTS "Admins and sales can manage client contacts" ON client_contacts;
DROP POLICY IF EXISTS "Company users can view their client contacts" ON client_contacts;

CREATE POLICY "Company users can view client contacts"
ON client_contacts FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM company_users 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Company admins/sales can manage client contacts"
ON client_contacts FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM company_users 
    WHERE user_id = auth.uid() 
      AND status = 'active' 
      AND role IN ('admin', 'sales')
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM company_users 
    WHERE user_id = auth.uid() 
      AND status = 'active' 
      AND role IN ('admin', 'sales')
  )
);