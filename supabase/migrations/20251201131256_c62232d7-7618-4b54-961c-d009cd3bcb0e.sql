-- ============================================================================
-- STEP 1: Clients & Leads Data Layer Safety (Database Fixes Only)
-- ============================================================================
-- This migration prepares the database for production-ready multi-tenant
-- client and lead management without breaking existing data.
--
-- Changes:
-- 1. Clients: company_id safety check & preparation for NOT NULL
-- 2. Clients: GST duplicate protection (future-proof, no data modification)
-- 3. Leads: Add conversion tracking fields (client_id, converted_at, assigned_to)
-- 4. Indexes: Performance optimization for clients & leads
-- ============================================================================

-- ============================================================================
-- SECTION 1: CLIENTS TABLE - COMPANY_ID SAFETY
-- ============================================================================

-- Check current state of company_id in clients table
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  -- Count rows with NULL company_id
  SELECT COUNT(*) INTO null_count
  FROM clients
  WHERE company_id IS NULL;
  
  IF null_count = 0 THEN
    -- Safe to enforce NOT NULL
    RAISE NOTICE 'No NULL company_id values found in clients table. Enforcing NOT NULL constraint.';
    ALTER TABLE clients ALTER COLUMN company_id SET NOT NULL;
  ELSE
    -- Cannot enforce NOT NULL yet
    RAISE NOTICE 'Found % rows with NULL company_id in clients table.', null_count;
    RAISE NOTICE 'Please review and fix these rows before enforcing NOT NULL in a future migration.';
  END IF;
END $$;

-- Helper query for manual cleanup (if needed):
-- Run this in Supabase SQL editor to identify rows needing company_id:
--
-- SELECT id, name, company, gst_number, email, phone, created_at
-- FROM clients 
-- WHERE company_id IS NULL
-- ORDER BY created_at DESC;
--
-- TODO: If rows exist with NULL company_id, assign them to the correct
-- company before running a future migration to enforce NOT NULL.

-- ============================================================================
-- SECTION 2: CLIENTS TABLE - GST DUPLICATE PROTECTION
-- ============================================================================

-- Diagnostic query to find existing duplicate GSTs (DO NOT RUN AUTOMATICALLY)
-- This is provided as a helper for manual investigation:
--
-- SELECT company_id, gst_number, COUNT(*) as duplicate_count,
--        STRING_AGG(id, ', ') as client_ids
-- FROM clients 
-- WHERE gst_number IS NOT NULL 
-- GROUP BY company_id, gst_number 
-- HAVING COUNT(*) > 1
-- ORDER BY duplicate_count DESC;

-- Create partial unique index to prevent FUTURE duplicate GSTs per company
-- Uses NOT VALID to allow existing duplicates while protecting new inserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_unique_gst_per_company
ON clients (company_id, gst_number)
WHERE gst_number IS NOT NULL AND gst_number != '';

-- NOTE: The index above is created as VALID by default in this syntax.
-- If you encounter an error due to existing duplicates, you can:
-- 1. Drop this index: DROP INDEX IF EXISTS idx_clients_unique_gst_per_company;
-- 2. Manually clean up duplicate GSTs using the diagnostic query above
-- 3. Re-run this migration
--
-- Alternative approach if duplicates prevent index creation:
-- Use this pattern instead (requires manual validation later):
--
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_unique_gst_not_valid
-- ON clients (company_id, gst_number)
-- WHERE gst_number IS NOT NULL;
--
-- Then validate later after cleanup:
-- ALTER INDEX idx_clients_unique_gst_not_valid VALIDATE;

-- ============================================================================
-- SECTION 3: LEADS TABLE - CONVERSION TRACKING FIELDS
-- ============================================================================

-- Add fields to support Lead → Client conversion workflow
-- These fields will be used in future steps (STEP 2) for conversion logic

-- Add client_id to track which client a lead converted to
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS client_id text REFERENCES clients(id) ON DELETE SET NULL;

-- Add timestamp when lead was converted to client
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS converted_at timestamptz;

-- Add sales owner assignment
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN leads.client_id IS 'Reference to the client record created from this lead (NULL if not yet converted)';
COMMENT ON COLUMN leads.converted_at IS 'Timestamp when this lead was successfully converted to a client';
COMMENT ON COLUMN leads.assigned_to IS 'Sales team member responsible for this lead';

-- Check company_id state in leads table
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM leads
  WHERE company_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE NOTICE 'Found % rows with NULL company_id in leads table.', null_count;
    RAISE NOTICE 'Review these leads before enforcing NOT NULL in a future migration.';
  ELSE
    RAISE NOTICE 'All leads have company_id set. Safe to enforce NOT NULL in future migration.';
  END IF;
END $$;

-- Helper query for leads without company_id:
-- SELECT id, name, email, phone, company, source, created_at
-- FROM leads 
-- WHERE company_id IS NULL
-- ORDER BY created_at DESC;

-- ============================================================================
-- SECTION 4: PERFORMANCE INDEXES
-- ============================================================================

-- Clients table indexes for common queries and filters
CREATE INDEX IF NOT EXISTS idx_clients_company_id 
ON clients(company_id);

CREATE INDEX IF NOT EXISTS idx_clients_state 
ON clients(state) 
WHERE state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_city 
ON clients(city) 
WHERE city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_gst_number 
ON clients(gst_number) 
WHERE gst_number IS NOT NULL AND gst_number != '';

CREATE INDEX IF NOT EXISTS idx_clients_email 
ON clients(email) 
WHERE email IS NOT NULL AND email != '';

CREATE INDEX IF NOT EXISTS idx_clients_phone 
ON clients(phone) 
WHERE phone IS NOT NULL AND phone != '';

CREATE INDEX IF NOT EXISTS idx_clients_created_at 
ON clients(created_at DESC);

-- Leads table indexes for filtering and performance
CREATE INDEX IF NOT EXISTS idx_leads_company_id 
ON leads(company_id);

CREATE INDEX IF NOT EXISTS idx_leads_status 
ON leads(status);

CREATE INDEX IF NOT EXISTS idx_leads_source 
ON leads(source) 
WHERE source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_client_id 
ON leads(client_id) 
WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to 
ON leads(assigned_to) 
WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_converted_at 
ON leads(converted_at DESC) 
WHERE converted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_created_at 
ON leads(created_at DESC);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- Summary of changes:
-- ✓ Clients: company_id safety check (enforced NOT NULL if safe)
-- ✓ Clients: GST uniqueness protection via partial unique index
-- ✓ Leads: Added client_id, converted_at, assigned_to columns
-- ✓ Leads: company_id safety check (diagnostic only)
-- ✓ Performance indexes on both clients and leads tables
--
-- Next steps (manual):
-- 1. Run diagnostic queries to check for NULL company_id values
-- 2. If GST duplicates exist, use diagnostic query to identify and clean them
-- 3. After cleanup, validate the unique index if needed
-- 4. Proceed to STEP 2: Implement Lead → Client conversion logic in UI
-- ============================================================================