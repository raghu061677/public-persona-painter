-- Fix security warnings from Phase 3 migration

-- Fix search_path for update_clients_search_vector function
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp;

-- Fix search_path for log_client_changes function
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp;