-- Insert default approval settings for multi-level workflow
-- This will create approval workflows based on plan amounts

-- Delete any existing approval settings first
DELETE FROM approval_settings;

-- Level 1: Small Plans (0 - 100,000)
-- Only Sales approval required
INSERT INTO approval_settings (plan_type, min_amount, max_amount, approval_levels, is_active)
VALUES (
  'Quotation',
  0,
  100000,
  '[
    {"level": "L1", "role": "sales", "description": "Sales Manager Approval"}
  ]'::jsonb,
  true
);

-- Level 2: Medium Plans (100,000 - 500,000)
-- Sales + Finance approval required
INSERT INTO approval_settings (plan_type, min_amount, max_amount, approval_levels, is_active)
VALUES (
  'Quotation',
  100000,
  500000,
  '[
    {"level": "L1", "role": "sales", "description": "Sales Manager Approval"},
    {"level": "L2", "role": "finance", "description": "Finance Manager Approval"}
  ]'::jsonb,
  true
);

-- Level 3: Large Plans (500,000+)
-- Sales + Finance + Admin approval required
INSERT INTO approval_settings (plan_type, min_amount, max_amount, approval_levels, is_active)
VALUES (
  'Quotation',
  500000,
  NULL,
  '[
    {"level": "L1", "role": "sales", "description": "Sales Manager Approval"},
    {"level": "L2", "role": "finance", "description": "Finance Manager Approval"},
    {"level": "L3", "role": "admin", "description": "Management Approval"}
  ]'::jsonb,
  true
);