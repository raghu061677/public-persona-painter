-- Migration: Plan Templates System v3 (Fixed RLS)

DROP TABLE IF EXISTS plan_template_usage CASCADE;
DROP TABLE IF EXISTS plan_template_items CASCADE;
DROP TABLE IF EXISTS plan_templates CASCADE;

-- 1. Plan Templates Table
CREATE TABLE plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  default_client_id TEXT REFERENCES clients(id),
  tags TEXT[] DEFAULT '{}'::TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plan_templates_company ON plan_templates(company_id);
CREATE INDEX idx_plan_templates_company_active ON plan_templates(company_id, is_active);

ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;

-- 2. Plan Template Items Table
CREATE TABLE plan_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  position_index INTEGER DEFAULT 0,
  default_base_rent NUMERIC DEFAULT 0,
  default_printing_charges NUMERIC DEFAULT 0,
  default_mounting_charges NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plan_template_items_template ON plan_template_items(template_id);
CREATE INDEX idx_plan_template_items_company ON plan_template_items(company_id);

ALTER TABLE plan_template_items ENABLE ROW LEVEL SECURITY;

-- 3. Plan Template Usage Table
CREATE TABLE plan_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES plans(id) ON DELETE SET NULL,
  used_by UUID,
  used_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plan_template_usage_template ON plan_template_usage(template_id);
CREATE INDEX idx_plan_template_usage_company ON plan_template_usage(company_id);

ALTER TABLE plan_template_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company users view templates"
ON plan_templates FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Company admins manage templates"
ON plan_templates FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'::app_role
  )
);

CREATE POLICY "Company users view template items"
ON plan_template_items FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Company admins manage template items"
ON plan_template_items FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'::app_role
  )
);

CREATE POLICY "Company users view template usage"
ON plan_template_usage FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Users insert template usage"
ON plan_template_usage FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active'
  )
);