-- Add watermark settings to organization_settings
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS watermark_position text DEFAULT 'bottom-left',
ADD COLUMN IF NOT EXISTS watermark_opacity numeric DEFAULT 0.6,
ADD COLUMN IF NOT EXISTS watermark_text text DEFAULT 'PROOF OF INSTALLATION',
ADD COLUMN IF NOT EXISTS watermark_include_logo boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS watermark_include_timestamp boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS watermark_font_size integer DEFAULT 14;

-- Create activity_logs table for comprehensive tracking
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  resource_name text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view all activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_resource_name text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_user_name text;
BEGIN
  -- Get user name from profiles
  SELECT username INTO v_user_name
  FROM profiles
  WHERE id = auth.uid();
  
  INSERT INTO activity_logs (
    user_id,
    user_name,
    action,
    resource_type,
    resource_id,
    resource_name,
    details
  ) VALUES (
    auth.uid(),
    v_user_name,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;