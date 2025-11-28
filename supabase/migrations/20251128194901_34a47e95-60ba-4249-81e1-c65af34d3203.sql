-- Add duration_mode and months_count to plans table for professional OOH billing

-- Add duration_mode column (MONTH or DAYS billing mode)
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS duration_mode text DEFAULT 'MONTH';

-- Add months_count column (for MONTH mode billing)
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS months_count numeric DEFAULT 1.0;

-- Add check constraint for valid duration modes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'plans_duration_mode_check'
  ) THEN
    ALTER TABLE plans 
    ADD CONSTRAINT plans_duration_mode_check 
    CHECK (duration_mode IN ('MONTH', 'DAYS'));
  END IF;
END $$;

-- Add check constraint for positive months
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'plans_months_count_check'
  ) THEN
    ALTER TABLE plans 
    ADD CONSTRAINT plans_months_count_check 
    CHECK (months_count >= 0.5);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN plans.duration_mode IS 'Billing calculation mode: MONTH (month-wise) or DAYS (day-wise pro-rata)';
COMMENT ON COLUMN plans.months_count IS 'Number of months for billing when duration_mode=MONTH (minimum 0.5 for half month)';
