-- Drop existing operations_tasks table if it exists
DROP TABLE IF EXISTS public.operations_tasks CASCADE;

-- Create operations_tasks table for automatic task generation
CREATE TABLE public.operations_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL,
  asset_id text NOT NULL,
  job_type text NOT NULL,
  start_date date,
  end_date date,
  deadline_date date,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  location text NOT NULL,
  area text NOT NULL,
  city text NOT NULL,
  media_type text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key
ALTER TABLE public.operations_tasks 
  ADD CONSTRAINT fk_operations_tasks_campaign 
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_operations_tasks_campaign_id ON public.operations_tasks(campaign_id);
CREATE INDEX idx_operations_tasks_asset_id ON public.operations_tasks(asset_id);
CREATE INDEX idx_operations_tasks_status ON public.operations_tasks(status);
CREATE INDEX idx_operations_tasks_job_type ON public.operations_tasks(job_type);

-- Enable RLS
ALTER TABLE public.operations_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company users can view their operations tasks"
  ON public.operations_tasks FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE company_id = get_current_user_company_id()
    ) OR is_platform_admin(auth.uid())
  );

CREATE POLICY "Admins and operations can insert operations tasks"
  ON public.operations_tasks FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
    AND campaign_id IN (
      SELECT id FROM campaigns WHERE company_id = get_current_user_company_id()
    )
  );

CREATE POLICY "Admins and operations can update operations tasks"
  ON public.operations_tasks FOR UPDATE
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role))
    AND campaign_id IN (
      SELECT id FROM campaigns WHERE company_id = get_current_user_company_id()
    )
  );

CREATE POLICY "Admins can delete operations tasks"
  ON public.operations_tasks FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND campaign_id IN (
      SELECT id FROM campaigns WHERE company_id = get_current_user_company_id()
    )
  );