-- Create access_requests table for permission requests
CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role app_role NOT NULL,
  requested_module text NOT NULL,
  requested_action text NOT NULL,
  current_roles jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  denial_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own access requests"
  ON access_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create access requests
CREATE POLICY "Users can create access requests"
  ON access_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can view all requests
CREATE POLICY "Admins can view all access requests"
  ON access_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can update requests (approve/deny)
CREATE POLICY "Admins can update access requests"
  ON access_requests
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Create default_role_settings table
CREATE TABLE IF NOT EXISTS default_role_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  default_role app_role NOT NULL DEFAULT 'user',
  require_admin_approval boolean NOT NULL DEFAULT true,
  notify_admins_on_signup boolean NOT NULL DEFAULT true,
  auto_assign_role boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE default_role_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage default role settings
CREATE POLICY "Admins can manage default role settings"
  ON default_role_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Insert default settings for auto-assignment
INSERT INTO default_role_settings (default_role, require_admin_approval, notify_admins_on_signup, auto_assign_role)
VALUES ('user', true, true, true)
ON CONFLICT DO NOTHING;

-- Create trigger to auto-assign default role on new user signup
CREATE OR REPLACE FUNCTION auto_assign_default_role()
RETURNS TRIGGER AS $$
DECLARE
  settings_record RECORD;
BEGIN
  -- Get default role settings
  SELECT * INTO settings_record
  FROM default_role_settings
  LIMIT 1;

  -- If auto-assign is enabled, assign the default role
  IF settings_record.auto_assign_role THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, settings_record.default_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users (only if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_default_role();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_created_at ON access_requests(created_at DESC);