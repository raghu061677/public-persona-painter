-- Phase 2: Critical Database Fixes for Clients Module

-- Step 1: Fix duplicate GST entries by keeping the oldest record and nullifying duplicates
WITH ranked_clients AS (
  SELECT id, gst_number, 
         ROW_NUMBER() OVER (PARTITION BY gst_number ORDER BY created_at ASC) as rn
  FROM clients
  WHERE gst_number IS NOT NULL
)
UPDATE clients
SET gst_number = NULL
FROM ranked_clients
WHERE clients.id = ranked_clients.id 
  AND ranked_clients.rn > 1;

-- Step 2: Add unique constraint on GST (where not null)
CREATE UNIQUE INDEX idx_clients_gst_unique ON clients (gst_number) WHERE gst_number IS NOT NULL;

-- Step 3: Set default company_id for any orphaned clients (using first active company)
UPDATE clients
SET company_id = (
  SELECT id FROM companies 
  WHERE status = 'active' 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE company_id IS NULL;

-- Step 4: Make company_id NOT NULL
ALTER TABLE clients 
ALTER COLUMN company_id SET NOT NULL;

-- Step 5: Add client_id to leads table for conversion tracking
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS client_id TEXT REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);

-- Step 6: Add performance indexes on clients table
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

-- Step 7: Add performance indexes on client_documents
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded_at ON client_documents(uploaded_at DESC);

-- Step 8: Add performance indexes on client_portal_users
CREATE INDEX IF NOT EXISTS idx_client_portal_users_client_id ON client_portal_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_users_email ON client_portal_users(email);

-- Step 9: Add comment to track audit
COMMENT ON COLUMN clients.company_id IS 'Required tenant isolation field - every client must belong to a company';
COMMENT ON COLUMN leads.client_id IS 'Links converted lead to the created client record';