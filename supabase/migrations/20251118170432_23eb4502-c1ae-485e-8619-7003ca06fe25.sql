-- Create rate_limits table for API rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  requests integer[] DEFAULT ARRAY[]::integer[],
  blocked_until timestamptz,
  last_request timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON public.rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- Create csrf_tokens table for CSRF protection
CREATE TABLE IF NOT EXISTS public.csrf_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_token ON public.csrf_tokens(token) WHERE NOT used;
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires ON public.csrf_tokens(expires_at) WHERE NOT used;

-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  company_id uuid REFERENCES public.companies(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON public.admin_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_company ON public.admin_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs(created_at DESC);

-- RLS policies for rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- RLS policies for csrf_tokens
ALTER TABLE public.csrf_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own CSRF tokens" ON public.csrf_tokens;
CREATE POLICY "Users can view their own CSRF tokens"
  ON public.csrf_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage CSRF tokens" ON public.csrf_tokens;
CREATE POLICY "Service role can manage CSRF tokens"
  ON public.csrf_tokens FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- RLS policies for admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view all audit logs" ON public.admin_audit_logs;
CREATE POLICY "Platform admins can view all audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (
    is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM company_users
      WHERE user_id = auth.uid()
      AND company_id = admin_audit_logs.company_id
      AND role = 'admin'
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Service role can insert audit logs"
  ON public.admin_audit_logs FOR INSERT TO service_role
  WITH CHECK (true);

-- Function to generate CSRF token
CREATE OR REPLACE FUNCTION public.generate_csrf_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_token text;
  token_expiry timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  new_token := encode(gen_random_bytes(32), 'hex');
  token_expiry := now() + interval '1 hour';
  
  INSERT INTO public.csrf_tokens (token, user_id, expires_at)
  VALUES (new_token, auth.uid(), token_expiry);
  
  DELETE FROM public.csrf_tokens
  WHERE user_id = auth.uid()
  AND (expires_at < now() OR used = true);
  
  RETURN new_token;
END;
$$;

-- Function to validate CSRF token
CREATE OR REPLACE FUNCTION public.validate_csrf_token(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  token_valid boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM public.csrf_tokens
    WHERE token = p_token
    AND user_id = auth.uid()
    AND expires_at > now()
    AND used = false
  ) INTO token_valid;
  
  IF token_valid THEN
    UPDATE public.csrf_tokens
    SET used = true
    WHERE token = p_token AND user_id = auth.uid();
  END IF;
  
  RETURN token_valid;
END;
$$;

-- Function to log admin operations
CREATE OR REPLACE FUNCTION public.log_admin_operation(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_log_id uuid;
  v_user_company_id uuid;
BEGIN
  SELECT company_id INTO v_user_company_id
  FROM company_users
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
  
  INSERT INTO public.admin_audit_logs (
    user_id, company_id, action, resource_type, resource_id,
    details, ip_address, user_agent
  ) VALUES (
    auth.uid(), v_user_company_id, p_action, p_resource_type,
    p_resource_id, p_details, p_ip_address, p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Trigger function to auto-log admin operations
CREATE OR REPLACE FUNCTION public.auto_log_admin_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = auth.uid()
    AND role IN ('admin')
    AND status = 'active'
  ) OR is_platform_admin(auth.uid()) INTO v_is_admin;
  
  IF v_is_admin THEN
    PERFORM log_admin_operation(
      TG_OP, TG_TABLE_NAME,
      COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(OLD)->>'id')),
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add triggers for critical admin operations
DROP TRIGGER IF EXISTS log_company_users_changes ON public.company_users;
CREATE TRIGGER log_company_users_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.company_users
  FOR EACH ROW EXECUTE FUNCTION auto_log_admin_changes();

DROP TRIGGER IF EXISTS log_companies_changes ON public.companies;
CREATE TRIGGER log_companies_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION auto_log_admin_changes();

DROP TRIGGER IF EXISTS log_subscription_changes ON public.subscriptions;
CREATE TRIGGER log_subscription_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION auto_log_admin_changes();

-- Cleanup function for security tables
CREATE OR REPLACE FUNCTION public.cleanup_security_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE last_request < now() - interval '7 days';
  
  DELETE FROM public.csrf_tokens
  WHERE expires_at < now() OR used = true;
  
  DELETE FROM public.admin_audit_logs
  WHERE created_at < now() - interval '1 year';
END;
$$;