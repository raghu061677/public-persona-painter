-- Update app_role enum to include new roles
-- First, we need to add the new roles to the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'installation';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'monitoring';

-- Note: We cannot remove 'finance', 'user', 'viewer' values from enum directly
-- as they might be in use. If you want to clean them up later, you'll need to
-- recreate the enum with a new name and migrate data.

-- Create payment_transactions table to track bill payments
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES public.asset_power_bills(id) ON DELETE CASCADE NOT NULL,
  asset_id text NOT NULL,
  transaction_id text,
  payment_method text NOT NULL CHECK (payment_method IN ('UPI', 'Net Banking', 'Debit Card', 'Credit Card')),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Success', 'Failed', 'Cancelled')),
  payment_gateway text DEFAULT 'TGSPDCL BillDesk',
  upi_id text,
  bank_name text,
  initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  initiated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  failure_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_transactions
CREATE POLICY "Admins can manage all payment transactions"
  ON public.payment_transactions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Finance can view payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Users can view their own payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (initiated_by = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_bill_id ON public.payment_transactions(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_initiated_by ON public.payment_transactions(initiated_by);

-- Add comment
COMMENT ON TABLE public.payment_transactions IS 'Tracks all payment transactions for power bills';