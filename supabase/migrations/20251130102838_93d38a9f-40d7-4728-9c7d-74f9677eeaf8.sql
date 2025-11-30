-- Create approval_rules table for conditional approval workflow
CREATE TABLE IF NOT EXISTS approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Conditions
  min_amount NUMERIC,
  max_amount NUMERIC,
  min_discount_percent NUMERIC,
  client_type TEXT,
  plan_type TEXT,

  -- Required levels (booleans map to roles/approval levels)
  require_sales_approval BOOLEAN DEFAULT TRUE,
  require_finance_approval BOOLEAN DEFAULT FALSE,
  require_operations_approval BOOLEAN DEFAULT FALSE,
  require_director_approval BOOLEAN DEFAULT FALSE,

  priority INTEGER DEFAULT 100,

  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_rules_company
  ON approval_rules(company_id);

CREATE INDEX IF NOT EXISTS idx_approval_rules_company_active
  ON approval_rules(company_id, is_active, priority);

COMMENT ON TABLE approval_rules IS 'Conditional approval rules that determine which approval levels are required based on plan attributes';
COMMENT ON COLUMN approval_rules.priority IS 'Lower priority values are evaluated first when matching rules';
COMMENT ON COLUMN approval_rules.min_amount IS 'Minimum plan amount for this rule to apply (NULL = no lower bound)';
COMMENT ON COLUMN approval_rules.max_amount IS 'Maximum plan amount for this rule to apply (NULL = no upper bound)';

ALTER TABLE approval_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view approval rules"
ON approval_rules FOR SELECT
USING (
  company_id = get_current_user_company_id()
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Company admins can manage approval rules"
ON approval_rules FOR ALL
USING (
  (company_id = get_current_user_company_id() AND has_role(auth.uid(), 'admin'::app_role))
  OR is_platform_admin(auth.uid())
)
WITH CHECK (
  (company_id = get_current_user_company_id() AND has_role(auth.uid(), 'admin'::app_role))
  OR is_platform_admin(auth.uid())
);