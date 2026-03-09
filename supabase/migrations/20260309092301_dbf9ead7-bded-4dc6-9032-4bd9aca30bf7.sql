
-- Marketplace Requests: agencies submit booking requests on listings
CREATE TABLE public.marketplace_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  requesting_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by uuid,
  offer_price numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  campaign_name text,
  client_name text,
  notes text,
  counter_offer_price numeric,
  counter_notes text,
  rejection_reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired')),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_campaign_id text REFERENCES public.campaigns(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_requests ENABLE ROW LEVEL SECURITY;

-- Requesting company can view/create their own requests
CREATE POLICY "requester_manage_requests" ON public.marketplace_requests
  FOR ALL USING (requesting_company_id = public.current_company_id());

-- Listing owner can view requests on their listings
CREATE POLICY "owner_view_requests" ON public.marketplace_requests
  FOR SELECT USING (
    listing_id IN (
      SELECT id FROM public.marketplace_listings WHERE company_id = public.current_company_id()
    )
  );

-- Listing owner can update request status (accept/reject/counter)
CREATE POLICY "owner_update_requests" ON public.marketplace_requests
  FOR UPDATE USING (
    listing_id IN (
      SELECT id FROM public.marketplace_listings WHERE company_id = public.current_company_id()
    )
  );

-- Add platform_fee_type to marketplace_transactions for percentage vs fixed support
ALTER TABLE public.marketplace_transactions
  ADD COLUMN IF NOT EXISTS platform_fee_type text NOT NULL DEFAULT 'percentage' CHECK (platform_fee_type IN ('percentage', 'fixed'));
