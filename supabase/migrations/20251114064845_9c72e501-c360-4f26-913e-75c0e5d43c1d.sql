-- Create AI assistant logs table
CREATE TABLE IF NOT EXISTS ai_assistant_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  company_id uuid REFERENCES companies(id),
  query_text text NOT NULL,
  intent text,
  response_type text,
  response_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_assistant_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company logs"
  ON ai_assistant_logs
  FOR SELECT
  USING (company_id = get_current_user_company_id() OR is_platform_admin(auth.uid()));

CREATE POLICY "System can insert logs"
  ON ai_assistant_logs
  FOR INSERT
  WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_ai_assistant_logs_company_id ON ai_assistant_logs(company_id);
CREATE INDEX idx_ai_assistant_logs_created_at ON ai_assistant_logs(created_at DESC);