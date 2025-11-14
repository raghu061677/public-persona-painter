-- Create dashboard configurations table
CREATE TABLE IF NOT EXISTS dashboard_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean DEFAULT false,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE dashboard_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own dashboards"
  ON dashboard_configurations
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own dashboards"
  ON dashboard_configurations
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND company_id = get_current_user_company_id());

CREATE POLICY "Users can update their own dashboards"
  ON dashboard_configurations
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own dashboards"
  ON dashboard_configurations
  FOR DELETE
  USING (user_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_dashboard_configurations_user_id ON dashboard_configurations(user_id);
CREATE INDEX idx_dashboard_configurations_company_id ON dashboard_configurations(company_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_dashboard_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
CREATE TRIGGER update_dashboard_configurations_updated_at
  BEFORE UPDATE ON dashboard_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_configurations_updated_at();