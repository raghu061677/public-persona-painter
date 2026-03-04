ALTER TABLE concession_contracts
  ADD COLUMN fee_type text NOT NULL DEFAULT 'concession',
  ADD COLUMN annual_escalation_percent numeric DEFAULT 0,
  ADD COLUMN advertisement_fee numeric DEFAULT 0,
  ADD COLUMN base_year_fee numeric;

COMMENT ON COLUMN concession_contracts.fee_type IS 'concession or advertisement';
COMMENT ON COLUMN concession_contracts.annual_escalation_percent IS 'Annual % increase per FY (e.g. 5 for 5%)';
COMMENT ON COLUMN concession_contracts.advertisement_fee IS 'Separate advertisement fee amount per cycle';
COMMENT ON COLUMN concession_contracts.base_year_fee IS 'Original fee in first year before escalation';