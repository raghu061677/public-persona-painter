-- Add manual discount fields to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS manual_discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_discount_reason text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.manual_discount_amount IS 'Client discount applied before GST calculation (round figure billing)';
COMMENT ON COLUMN public.campaigns.manual_discount_reason IS 'Reason for the manual discount (optional)';