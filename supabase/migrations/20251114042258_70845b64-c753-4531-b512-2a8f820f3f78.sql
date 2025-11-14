-- Create booking status enum
CREATE TYPE booking_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'completed'
);

-- Create booking_requests table
CREATE TABLE IF NOT EXISTS booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  requester_company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  
  -- Booking details
  start_date date NOT NULL,
  end_date date NOT NULL,
  proposed_rate numeric NOT NULL,
  campaign_name text,
  client_name text,
  notes text,
  
  -- Approval workflow
  status booking_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create index for faster queries
CREATE INDEX idx_booking_requests_asset ON booking_requests(asset_id);
CREATE INDEX idx_booking_requests_requester ON booking_requests(requester_company_id);
CREATE INDEX idx_booking_requests_owner ON booking_requests(owner_company_id);
CREATE INDEX idx_booking_requests_status ON booking_requests(status);

-- Enable RLS
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Agencies can view their own requests
CREATE POLICY "Agencies can view their booking requests"
ON booking_requests FOR SELECT
USING (requester_company_id = get_user_company_id(auth.uid()));

-- Agencies can create booking requests
CREATE POLICY "Agencies can create booking requests"
ON booking_requests FOR INSERT
WITH CHECK (requester_company_id = get_user_company_id(auth.uid()));

-- Agencies can cancel their pending requests
CREATE POLICY "Agencies can cancel their requests"
ON booking_requests FOR UPDATE
USING (
  requester_company_id = get_user_company_id(auth.uid())
  AND status = 'pending'
);

-- Media owners can view requests for their assets
CREATE POLICY "Media owners can view booking requests for their assets"
ON booking_requests FOR SELECT
USING (owner_company_id = get_user_company_id(auth.uid()));

-- Media owners can approve/reject requests
CREATE POLICY "Media owners can update booking requests"
ON booking_requests FOR UPDATE
USING (
  owner_company_id = get_user_company_id(auth.uid())
  AND status = 'pending'
);

-- Platform admins can view all
CREATE POLICY "Platform admins can view all booking requests"
ON booking_requests FOR SELECT
USING (is_platform_admin(auth.uid()));

-- Updated at trigger
CREATE TRIGGER set_booking_requests_updated_at
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();