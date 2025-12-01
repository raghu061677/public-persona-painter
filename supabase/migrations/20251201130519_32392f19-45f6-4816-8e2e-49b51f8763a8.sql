-- Phase 3: Client Module Enhancements

-- Step 1: Create client_type enum
DO $$ BEGIN
  CREATE TYPE client_type AS ENUM ('Agency', 'Direct', 'Government', 'Corporate', 'Other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add client_type column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS client_type client_type DEFAULT 'Direct';

CREATE INDEX IF NOT EXISTS idx_clients_client_type ON clients(client_type);

-- Step 3: Create client_contacts table for multiple contacts per client
CREATE TABLE IF NOT EXISTS client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  designation text,
  email text,
  phone text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_email ON client_contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_contacts_is_primary ON client_contacts(client_id, is_primary) WHERE is_primary = true;

-- Step 4: Create client_tags table for categorization
CREATE TABLE IF NOT EXISTS client_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tag_name text NOT NULL,
  tag_color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(client_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_client_tags_client_id ON client_tags(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tags_tag_name ON client_tags(tag_name);

-- Step 5: Add full-text search support for clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_clients_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.company, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.gst_number, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector updates
DROP TRIGGER IF EXISTS clients_search_vector_update ON clients;
CREATE TRIGGER clients_search_vector_update
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_search_vector();

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_clients_search_vector ON clients USING GIN(search_vector);

-- Update existing records with search vectors
UPDATE clients SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(company, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(phone, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(gst_number, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(notes, '')), 'D')
WHERE search_vector IS NULL;

-- Step 6: Create audit logging trigger for clients
CREATE OR REPLACE FUNCTION log_client_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields jsonb := '{}'::jsonb;
  field_name text;
BEGIN
  -- Determine action
  IF TG_OP = 'DELETE' THEN
    INSERT INTO client_audit_log (client_id, user_id, action, old_values, created_at)
    VALUES (OLD.id, auth.uid(), 'DELETE', row_to_json(OLD)::jsonb, now());
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO client_audit_log (client_id, user_id, action, new_values, created_at)
    VALUES (NEW.id, auth.uid(), 'CREATE', row_to_json(NEW)::jsonb, now());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Track changed fields
    FOR field_name IN 
      SELECT jsonb_object_keys(to_jsonb(NEW))
    LOOP
      IF to_jsonb(NEW)->>field_name IS DISTINCT FROM to_jsonb(OLD)->>field_name THEN
        changed_fields := changed_fields || jsonb_build_object(field_name, true);
      END IF;
    END LOOP;
    
    IF changed_fields != '{}'::jsonb THEN
      INSERT INTO client_audit_log (
        client_id, user_id, action, 
        old_values, new_values, changed_fields, 
        created_at
      )
      VALUES (
        NEW.id, auth.uid(), 'UPDATE',
        row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, changed_fields,
        now()
      );
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger
DROP TRIGGER IF EXISTS clients_audit_trigger ON clients;
CREATE TRIGGER clients_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION log_client_changes();

-- Step 7: Add RLS policies for new tables

-- RLS for client_contacts
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view their client contacts"
  ON client_contacts FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE company_id = get_current_user_company_id()
    )
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Admins and sales can manage client contacts"
  ON client_contacts FOR ALL
  USING (
    (
      client_id IN (
        SELECT id FROM clients 
        WHERE company_id = get_current_user_company_id()
      )
      AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales'))
    )
    OR is_platform_admin(auth.uid())
  )
  WITH CHECK (
    (
      client_id IN (
        SELECT id FROM clients 
        WHERE company_id = get_current_user_company_id()
      )
      AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales'))
    )
    OR is_platform_admin(auth.uid())
  );

-- RLS for client_tags
ALTER TABLE client_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view their client tags"
  ON client_tags FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE company_id = get_current_user_company_id()
    )
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Admins and sales can manage client tags"
  ON client_tags FOR ALL
  USING (
    (
      client_id IN (
        SELECT id FROM clients 
        WHERE company_id = get_current_user_company_id()
      )
      AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales'))
    )
    OR is_platform_admin(auth.uid())
  )
  WITH CHECK (
    (
      client_id IN (
        SELECT id FROM clients 
        WHERE company_id = get_current_user_company_id()
      )
      AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales'))
    )
    OR is_platform_admin(auth.uid())
  );

-- Step 8: Add helpful comments
COMMENT ON COLUMN clients.client_type IS 'Type of client: Agency, Direct, Government, Corporate, Other';
COMMENT ON COLUMN clients.search_vector IS 'Full-text search vector for fast client search';
COMMENT ON TABLE client_contacts IS 'Multiple contact persons per client';
COMMENT ON TABLE client_tags IS 'Tags/labels for client categorization and filtering';
COMMENT ON FUNCTION log_client_changes() IS 'Audit trigger that logs all changes to clients table';