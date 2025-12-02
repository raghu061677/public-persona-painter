-- Create mounters table
CREATE TABLE IF NOT EXISTS mounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid UNIQUE,
  name text NOT NULL,
  phone text,
  zone text,
  sub_zone text,
  area text,
  capacity_per_day int DEFAULT 8,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add zone metadata to media_assets
ALTER TABLE media_assets 
ADD COLUMN IF NOT EXISTS zone text,
ADD COLUMN IF NOT EXISTS sub_zone text,
ADD COLUMN IF NOT EXISTS area text;

-- Create operations master table
CREATE TABLE IF NOT EXISTS operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  asset_id text NOT NULL REFERENCES media_assets(id),
  mounter_id uuid REFERENCES mounters(id),
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now(),
  deadline date,
  status text DEFAULT 'Assigned',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operations_campaign_id_idx ON operations (campaign_id);
CREATE INDEX IF NOT EXISTS operations_mounter_id_idx ON operations (mounter_id);

-- Create operation_photos table
CREATE TABLE IF NOT EXISTS operation_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  photo_type text,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operation_photos_operation_id_idx ON operation_photos (operation_id);

-- Extend campaign_assets
ALTER TABLE campaign_assets
ADD COLUMN IF NOT EXISTS installation_status text DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS assigned_mounter_id uuid REFERENCES mounters(id);

-- Enable RLS
ALTER TABLE mounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_photos ENABLE ROW LEVEL SECURITY;

-- Policies (company_id–scoped)
CREATE POLICY "mounters_select_own_company"
ON mounters FOR SELECT
USING (company_id = get_current_user_company_id());

CREATE POLICY "mounters_modify_own_company"
ON mounters FOR ALL
USING (company_id = get_current_user_company_id())
WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "operations_select_own_company"
ON operations FOR SELECT
USING (company_id = get_current_user_company_id());

CREATE POLICY "operations_modify_own_company"
ON operations FOR ALL
USING (company_id = get_current_user_company_id())
WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "operation_photos_select_own_company"
ON operation_photos FOR SELECT
USING (
  operation_id IN (
    SELECT id FROM operations
    WHERE company_id = get_current_user_company_id()
  )
);

CREATE POLICY "operation_photos_modify_own_company"
ON operation_photos FOR ALL
USING (
  operation_id IN (
    SELECT id FROM operations
    WHERE company_id = get_current_user_company_id()
  )
)
WITH CHECK (
  operation_id IN (
    SELECT id FROM operations
    WHERE company_id = get_current_user_company_id()
  )
);

-- RPC function: get_mounter_workload
CREATE OR REPLACE FUNCTION get_mounter_workload(p_company_id uuid)
RETURNS TABLE(mounter_id uuid, count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT mounter_id, COUNT(*)::bigint
  FROM operations
  WHERE company_id = p_company_id
    AND status IN ('Assigned', 'In Progress')
  GROUP BY mounter_id;
$$;