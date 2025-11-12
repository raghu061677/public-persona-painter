-- Create approval delegations table
CREATE TABLE IF NOT EXISTS public.approval_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT different_users CHECK (delegator_id != delegate_id),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Enable RLS
ALTER TABLE public.approval_delegations ENABLE ROW LEVEL SECURITY;

-- Policies for approval delegations
CREATE POLICY "Users can view their own delegations"
ON public.approval_delegations
FOR SELECT
USING (auth.uid() = delegator_id OR auth.uid() = delegate_id);

CREATE POLICY "Users can create their own delegations"
ON public.approval_delegations
FOR INSERT
WITH CHECK (auth.uid() = delegator_id);

CREATE POLICY "Users can update their own delegations"
ON public.approval_delegations
FOR UPDATE
USING (auth.uid() = delegator_id);

CREATE POLICY "Admins can manage all delegations"
ON public.approval_delegations
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_approval_delegations_updated_at
BEFORE UPDATE ON public.approval_delegations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for active delegations lookup
CREATE INDEX idx_approval_delegations_delegate 
ON public.approval_delegations(delegate_id, role, is_active);

CREATE INDEX idx_approval_delegations_delegator
ON public.approval_delegations(delegator_id);