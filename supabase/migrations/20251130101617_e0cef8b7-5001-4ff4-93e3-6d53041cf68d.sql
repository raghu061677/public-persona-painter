-- Fix Plan Templates Schema and RLS Issues

-- 1. Add missing columns to plan_templates
ALTER TABLE plan_templates
ADD COLUMN IF NOT EXISTS plan_type TEXT,
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS gst_percent NUMERIC DEFAULT 18,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Enable RLS on tables without it
ALTER TABLE campaign_item_faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_item_faces ENABLE ROW LEVEL SECURITY;

-- 3. Add RLS policies for campaign_item_faces
CREATE POLICY "Users can view campaign item faces"
ON campaign_item_faces FOR SELECT
USING (
  campaign_item_id IN (
    SELECT id FROM campaign_items WHERE campaign_id IN (
      SELECT id FROM campaigns WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  )
);

CREATE POLICY "Admins can manage campaign item faces"
ON campaign_item_faces FOR ALL
USING (
  campaign_item_id IN (
    SELECT id FROM campaign_items WHERE campaign_id IN (
      SELECT id FROM campaigns WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'::app_role
      )
    )
  )
);

-- 4. Add RLS policies for plan_item_faces
CREATE POLICY "Users can view plan item faces"
ON plan_item_faces FOR SELECT
USING (
  plan_item_id IN (
    SELECT id FROM plan_items WHERE plan_id IN (
      SELECT id FROM plans WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  )
);

CREATE POLICY "Admins can manage plan item faces"
ON plan_item_faces FOR ALL
USING (
  plan_item_id IN (
    SELECT id FROM plan_items WHERE plan_id IN (
      SELECT id FROM plans WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid() AND status = 'active' AND role = 'admin'::app_role
      )
    )
  )
);