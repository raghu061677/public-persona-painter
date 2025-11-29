-- ============================================================
-- COMPREHENSIVE WORKFLOW STANDARDIZATION MIGRATION
-- Fixes Plan → Campaign → Operations → Finance pipeline
-- ============================================================

-- 1. Add missing media asset snapshot fields to plan_items
ALTER TABLE plan_items 
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS illumination_type TEXT,
ADD COLUMN IF NOT EXISTS direction TEXT,
ADD COLUMN IF NOT EXISTS total_sqft NUMERIC;

-- 2. Fix operations_tasks schema
-- Rename task_type to job_type if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'operations_tasks' AND column_name = 'task_type'
  ) THEN
    ALTER TABLE operations_tasks RENAME COLUMN task_type TO job_type;
  END IF;
END $$;

-- Add job_type if it doesn't exist
ALTER TABLE operations_tasks 
ADD COLUMN IF NOT EXISTS job_type TEXT;

-- Add company_id for multi-tenancy
ALTER TABLE operations_tasks 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add location fields for operations display
ALTER TABLE operations_tasks
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;

-- 3. Remove 'active' from campaign_status enum (revert to PascalCase only)
-- Note: Cannot directly remove enum value, so we'll rely on code to never use it

-- 4. Set campaigns.status default to 'Planned' (PascalCase)
ALTER TABLE campaigns ALTER COLUMN status DROP DEFAULT;
ALTER TABLE campaigns ALTER COLUMN status SET DEFAULT 'Planned'::campaign_status;

-- 5. Create export field settings table for configurable exports
CREATE TABLE IF NOT EXISTS export_field_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type TEXT NOT NULL, -- 'EstimatePDF', 'WorkOrderPDF', 'InvoicePDF', 'PlanPPT', 'ProofPPT', 'PlanExcel', 'WorkOrderExcel', 'InvoiceExcel'
  module TEXT NOT NULL, -- 'media_assets', 'plan', 'campaign', 'client', 'operations', 'finance'
  field_key TEXT NOT NULL, -- 'media_type', 'state', 'district', 'city', 'area', 'location', etc.
  label TEXT NOT NULL, -- Friendly display name
  is_visible BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(export_type, module, field_key)
);

-- 6. Seed default export field settings
INSERT INTO export_field_settings (export_type, module, field_key, label, is_visible, order_index) VALUES
-- EstimatePDF fields
('EstimatePDF', 'media_assets', 'asset_id', 'Asset ID', true, 1),
('EstimatePDF', 'media_assets', 'media_type', 'Media Type', true, 2),
('EstimatePDF', 'media_assets', 'state', 'State', false, 3),
('EstimatePDF', 'media_assets', 'district', 'District', false, 4),
('EstimatePDF', 'media_assets', 'city', 'City', true, 5),
('EstimatePDF', 'media_assets', 'area', 'Area', true, 6),
('EstimatePDF', 'media_assets', 'location', 'Location', true, 7),
('EstimatePDF', 'media_assets', 'direction', 'Direction', false, 8),
('EstimatePDF', 'media_assets', 'dimensions', 'Dimensions', true, 9),
('EstimatePDF', 'media_assets', 'total_sqft', 'Total Sq.Ft', true, 10),
('EstimatePDF', 'media_assets', 'illumination_type', 'Illumination', true, 11),
('EstimatePDF', 'plan', 'start_date', 'Start Date', true, 20),
('EstimatePDF', 'plan', 'end_date', 'End Date', true, 21),
('EstimatePDF', 'plan', 'duration_days', 'Duration (Days)', true, 22),
('EstimatePDF', 'finance', 'card_rate', 'Card Rate', true, 30),
('EstimatePDF', 'finance', 'sales_price', 'Sales Price', true, 31),
('EstimatePDF', 'finance', 'printing_charges', 'Printing', true, 32),
('EstimatePDF', 'finance', 'mounting_charges', 'Mounting', true, 33),

-- WorkOrderPDF fields (same as Estimate)
('WorkOrderPDF', 'media_assets', 'asset_id', 'Asset ID', true, 1),
('WorkOrderPDF', 'media_assets', 'media_type', 'Media Type', true, 2),
('WorkOrderPDF', 'media_assets', 'state', 'State', false, 3),
('WorkOrderPDF', 'media_assets', 'district', 'District', false, 4),
('WorkOrderPDF', 'media_assets', 'city', 'City', true, 5),
('WorkOrderPDF', 'media_assets', 'area', 'Area', true, 6),
('WorkOrderPDF', 'media_assets', 'location', 'Location', true, 7),
('WorkOrderPDF', 'media_assets', 'direction', 'Direction', true, 8),
('WorkOrderPDF', 'media_assets', 'dimensions', 'Dimensions', true, 9),
('WorkOrderPDF', 'media_assets', 'total_sqft', 'Total Sq.Ft', true, 10),
('WorkOrderPDF', 'media_assets', 'illumination_type', 'Illumination', true, 11),

-- PlanPPT fields
('PlanPPT', 'media_assets', 'asset_id', 'Asset ID', true, 1),
('PlanPPT', 'media_assets', 'media_type', 'Media Type', true, 2),
('PlanPPT', 'media_assets', 'city', 'City', true, 3),
('PlanPPT', 'media_assets', 'area', 'Area', true, 4),
('PlanPPT', 'media_assets', 'location', 'Location', true, 5),
('PlanPPT', 'media_assets', 'dimensions', 'Dimensions', true, 6),
('PlanPPT', 'media_assets', 'illumination_type', 'Illumination', true, 7),
('PlanPPT', 'media_assets', 'direction', 'Direction', true, 8),
('PlanPPT', 'media_assets', 'total_sqft', 'Total Sq.Ft', true, 9),

-- PlanExcel fields
('PlanExcel', 'media_assets', 'asset_id', 'Asset ID', true, 1),
('PlanExcel', 'media_assets', 'media_type', 'Media Type', true, 2),
('PlanExcel', 'media_assets', 'city', 'City', true, 3),
('PlanExcel', 'media_assets', 'area', 'Area', true, 4),
('PlanExcel', 'media_assets', 'location', 'Location', true, 5),
('PlanExcel', 'media_assets', 'dimensions', 'Dimensions', true, 6),
('PlanExcel', 'finance', 'card_rate', 'Card Rate', true, 10),
('PlanExcel', 'finance', 'sales_price', 'Sales Price', true, 11),
('PlanExcel', 'finance', 'printing_charges', 'Printing', true, 12),
('PlanExcel', 'finance', 'mounting_charges', 'Mounting', true, 13)
ON CONFLICT (export_type, module, field_key) DO NOTHING;

-- 7. Add RLS policies for export_field_settings
ALTER TABLE export_field_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage export field settings"
ON export_field_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view export field settings"
ON export_field_settings FOR SELECT
USING (auth.role() = 'authenticated');

-- 8. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_export_field_settings_type ON export_field_settings(export_type);
CREATE INDEX IF NOT EXISTS idx_operations_tasks_company ON operations_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_operations_tasks_campaign ON operations_tasks(campaign_id);