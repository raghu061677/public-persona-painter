-- Create rate_limits table for API security
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  requests bigint[] DEFAULT '{}',
  last_request timestamptz,
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until ON rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- Add trigger to update updated_at
CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only (used by edge functions)
CREATE POLICY "Service role can manage rate limits"
ON rate_limits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE rate_limits IS 'Stores rate limiting data for API security';

-- Create function for GDPR account deletion
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Delete user roles
  DELETE FROM user_roles WHERE user_id = v_user_id;
  
  -- Delete user profile
  DELETE FROM profiles WHERE id = v_user_id;
  
  -- Delete from company_users
  DELETE FROM company_users WHERE user_id = v_user_id;
  
  -- Note: Actual auth.users deletion requires admin privileges
  -- This marks the account for deletion and removes all associated data
  -- The actual user deletion should be handled by a scheduled job or admin action
END;
$$;