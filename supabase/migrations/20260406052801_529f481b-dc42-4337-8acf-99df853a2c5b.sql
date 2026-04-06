
-- Add TDS calculation fields to payment_records
ALTER TABLE public.payment_records
  ADD COLUMN IF NOT EXISTS tds_rate numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_base_amount numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_certificate_date date DEFAULT NULL;

-- Add TDS deduction basis to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tds_deduction_basis text DEFAULT 'taxable_value';

-- Add comment for clarity
COMMENT ON COLUMN public.payment_records.tds_rate IS 'TDS rate percentage applied';
COMMENT ON COLUMN public.payment_records.tds_base_amount IS 'Base amount on which TDS was calculated (typically sub_total before GST)';
COMMENT ON COLUMN public.payment_records.tds_certificate_date IS 'Date TDS certificate (Form 16A) was received';
COMMENT ON COLUMN public.clients.tds_deduction_basis IS 'Basis for TDS calculation: taxable_value (before GST) or custom';
