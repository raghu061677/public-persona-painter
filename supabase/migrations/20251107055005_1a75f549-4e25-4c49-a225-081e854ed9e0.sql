-- Create approval levels enum
CREATE TYPE public.approval_level AS ENUM ('L1', 'L2', 'L3');

-- Create approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create plan approval workflow table
CREATE TABLE public.plan_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  approval_level approval_level NOT NULL,
  approver_id UUID REFERENCES auth.users(id),
  required_role app_role NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending',
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create approval settings table
CREATE TABLE public.approval_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type plan_type NOT NULL,
  min_amount NUMERIC NOT NULL DEFAULT 0,
  max_amount NUMERIC,
  approval_levels JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reminder settings table
CREATE TABLE public.reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type TEXT NOT NULL,
  days_before INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  email_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plan_approvals
CREATE POLICY "Admins can manage all approvals"
  ON public.plan_approvals
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view approvals for their plans"
  ON public.plan_approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plans
      WHERE plans.id = plan_approvals.plan_id
      AND plans.created_by = auth.uid()
    )
  );

CREATE POLICY "Approvers can view their pending approvals"
  ON public.plan_approvals
  FOR SELECT
  USING (
    status = 'pending' AND
    (
      (required_role = 'admin' AND has_role(auth.uid(), 'admin'::app_role)) OR
      (required_role = 'sales' AND has_role(auth.uid(), 'sales'::app_role)) OR
      (required_role = 'finance' AND has_role(auth.uid(), 'finance'::app_role))
    )
  );

CREATE POLICY "Approvers can update their pending approvals"
  ON public.plan_approvals
  FOR UPDATE
  USING (
    status = 'pending' AND
    (
      (required_role = 'admin' AND has_role(auth.uid(), 'admin'::app_role)) OR
      (required_role = 'sales' AND has_role(auth.uid(), 'sales'::app_role)) OR
      (required_role = 'finance' AND has_role(auth.uid(), 'finance'::app_role))
    )
  );

-- RLS Policies for approval_settings
CREATE POLICY "Admins can manage approval settings"
  ON public.approval_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view approval settings"
  ON public.approval_settings
  FOR SELECT
  USING (true);

-- RLS Policies for reminder_settings
CREATE POLICY "Admins can manage reminder settings"
  ON public.reminder_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view reminder settings"
  ON public.reminder_settings
  FOR SELECT
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_plan_approvals_updated_at
  BEFORE UPDATE ON public.plan_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_approval_settings_updated_at
  BEFORE UPDATE ON public.approval_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminder_settings_updated_at
  BEFORE UPDATE ON public.reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default approval settings
INSERT INTO public.approval_settings (plan_type, min_amount, max_amount, approval_levels) VALUES
('Quotation', 0, 100000, '[{"level": "L1", "role": "sales"}]'),
('Quotation', 100000, 500000, '[{"level": "L1", "role": "sales"}, {"level": "L2", "role": "finance"}]'),
('Quotation', 500000, NULL, '[{"level": "L1", "role": "sales"}, {"level": "L2", "role": "finance"}, {"level": "L3", "role": "admin"}]');

-- Insert default reminder settings
INSERT INTO public.reminder_settings (reminder_type, days_before, email_template) VALUES
('pending_approval', 3, 'You have a pending plan approval for {{plan_name}}. Please review and take action.'),
('expiring_quotation', 7, 'Quotation {{plan_id}} for {{client_name}} will expire in {{days}} days.');

-- Function to create approval workflow for a plan
CREATE OR REPLACE FUNCTION public.create_plan_approval_workflow(p_plan_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_record RECORD;
  v_approval_config RECORD;
  v_level JSONB;
BEGIN
  -- Get plan details
  SELECT * INTO v_plan_record FROM plans WHERE id = p_plan_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;
  
  -- Find matching approval configuration
  SELECT * INTO v_approval_config
  FROM approval_settings
  WHERE plan_type = v_plan_record.plan_type
    AND is_active = true
    AND min_amount <= v_plan_record.grand_total
    AND (max_amount IS NULL OR max_amount > v_plan_record.grand_total)
  ORDER BY min_amount DESC
  LIMIT 1;
  
  IF FOUND THEN
    -- Create approval records for each level
    FOR v_level IN SELECT * FROM jsonb_array_elements(v_approval_config.approval_levels)
    LOOP
      INSERT INTO plan_approvals (plan_id, approval_level, required_role, status)
      VALUES (
        p_plan_id,
        (v_level->>'level')::approval_level,
        (v_level->>'role')::app_role,
        'pending'
      );
    END LOOP;
  END IF;
END;
$$;

-- Function to process approval
CREATE OR REPLACE FUNCTION public.process_plan_approval(
  p_approval_id UUID,
  p_status approval_status,
  p_comments TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approval RECORD;
  v_next_pending INTEGER;
  v_result JSONB;
BEGIN
  -- Update the approval
  UPDATE plan_approvals
  SET status = p_status,
      comments = p_comments,
      approver_id = auth.uid(),
      approved_at = now(),
      updated_at = now()
  WHERE id = p_approval_id
  RETURNING * INTO v_approval;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval not found';
  END IF;
  
  -- If rejected, update plan status
  IF p_status = 'rejected' THEN
    UPDATE plans SET status = 'Rejected' WHERE id = v_approval.plan_id;
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Plan rejected',
      'plan_status', 'Rejected'
    );
  ELSE
    -- Check if there are more pending approvals
    SELECT COUNT(*) INTO v_next_pending
    FROM plan_approvals
    WHERE plan_id = v_approval.plan_id
      AND status = 'pending';
    
    -- If all approvals are complete, update plan status
    IF v_next_pending = 0 THEN
      UPDATE plans SET status = 'Approved' WHERE id = v_approval.plan_id;
      v_result := jsonb_build_object(
        'success', true,
        'message', 'All approvals complete. Plan approved.',
        'plan_status', 'Approved'
      );
    ELSE
      v_result := jsonb_build_object(
        'success', true,
        'message', 'Approval recorded. Waiting for additional approvals.',
        'plan_status', 'Sent',
        'pending_approvals', v_next_pending
      );
    END IF;
  END IF;
  
  RETURN v_result;
END;
$$;