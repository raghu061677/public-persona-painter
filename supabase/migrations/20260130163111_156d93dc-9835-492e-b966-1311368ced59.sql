-- Add UPI payment settings to organization_settings
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS upi_id TEXT,
ADD COLUMN IF NOT EXISTS upi_name TEXT;

-- Add comments for clarity
COMMENT ON COLUMN organization_settings.upi_id IS 'UPI ID for payment QR codes (e.g., company@bank)';
COMMENT ON COLUMN organization_settings.upi_name IS 'Payee name displayed in UPI payment';