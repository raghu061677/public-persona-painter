-- Add "Business" and "Individual" to client_type enum
-- Must be done in separate transaction from usage
ALTER TYPE client_type ADD VALUE IF NOT EXISTS 'Business';
ALTER TYPE client_type ADD VALUE IF NOT EXISTS 'Individual';