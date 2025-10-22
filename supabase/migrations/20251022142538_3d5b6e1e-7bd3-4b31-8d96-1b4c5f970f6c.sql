-- Create client audit log table
CREATE TABLE IF NOT EXISTS public.client_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  changed_fields jsonb,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.client_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.client_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON public.client_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Update clients RLS policies to allow sales role
DROP POLICY IF EXISTS "Only admins can view clients" ON public.clients;

CREATE POLICY "Admin and sales can view clients"
  ON public.clients
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'sales'::app_role)
  );

-- Sales can only update their assigned clients, admins can update all
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;

CREATE POLICY "Admin can update all clients"
  ON public.clients
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sales can update assigned clients"
  ON public.clients
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'sales'::app_role) AND
    created_by = auth.uid()
  );

-- Create masked client view for operations/finance roles
CREATE OR REPLACE VIEW public.clients_basic AS
SELECT 
  id,
  name,
  company,
  city,
  state,
  created_at
FROM public.clients;

-- Grant access to masked view
GRANT SELECT ON public.clients_basic TO authenticated;

-- Create function to log client changes
CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.client_audit_log (client_id, user_id, action, new_values)
    VALUES (NEW.id, auth.uid(), 'insert', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.client_audit_log (client_id, user_id, action, old_values, new_values, changed_fields)
    VALUES (
      NEW.id, 
      auth.uid(), 
      'update', 
      to_jsonb(OLD),
      to_jsonb(NEW),
      (
        SELECT jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val))
        FROM (
          SELECT o.key, o.value as old_val, n.value as new_val
          FROM jsonb_each(to_jsonb(OLD)) AS o(key, value)
          JOIN jsonb_each(to_jsonb(NEW)) AS n(key, value) ON o.key = n.key
          WHERE o.value IS DISTINCT FROM n.value
        ) changes
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.client_audit_log (client_id, user_id, action, old_values)
    VALUES (OLD.id, auth.uid(), 'delete', to_jsonb(OLD));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS client_audit_trigger ON public.clients;

CREATE TRIGGER client_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.log_client_changes();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_audit_log_client_id ON public.client_audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_client_audit_log_created_at ON public.client_audit_log(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE public.client_audit_log IS 'Audit trail for all client data changes - tracks who changed what and when';
COMMENT ON VIEW public.clients_basic IS 'Masked view of clients showing only basic info for operations/finance roles';