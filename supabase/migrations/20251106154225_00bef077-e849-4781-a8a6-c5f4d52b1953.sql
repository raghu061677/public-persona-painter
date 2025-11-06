-- Create plan_templates table
CREATE TABLE IF NOT EXISTS public.plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  description text,
  plan_type plan_type NOT NULL DEFAULT 'Quotation',
  duration_days integer,
  gst_percent numeric NOT NULL DEFAULT 18,
  notes text,
  
  -- Template asset configurations (stores asset selection and pricing)
  template_items jsonb NOT NULL DEFAULT '[]',
  
  -- Metadata
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  
  -- Audit fields
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT template_name_unique UNIQUE(template_name, created_by)
);

-- Enable RLS
ALTER TABLE public.plan_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plan_templates
CREATE POLICY "Admins can manage all templates"
  ON public.plan_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view templates"
  ON public.plan_templates
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own templates"
  ON public.plan_templates
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
  ON public.plan_templates
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_plan_templates_updated_at
  BEFORE UPDATE ON public.plan_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_plan_templates_created_by ON public.plan_templates(created_by);
CREATE INDEX idx_plan_templates_active ON public.plan_templates(is_active) WHERE is_active = true;

-- Comment
COMMENT ON TABLE public.plan_templates IS 'Stores reusable plan templates with asset configurations';