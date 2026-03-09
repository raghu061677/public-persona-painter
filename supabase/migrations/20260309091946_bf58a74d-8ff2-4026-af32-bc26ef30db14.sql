
-- Marketplace Listings: media owners publish inventory for agencies to discover
CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id text NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  availability_start date NOT NULL,
  availability_end date NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  min_booking_days integer DEFAULT 30,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'booked', 'expired')),
  views_count integer DEFAULT 0,
  inquiries_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own listings; agencies can view active listings
CREATE POLICY "owners_manage_listings" ON public.marketplace_listings
  FOR ALL USING (company_id = public.current_company_id());

CREATE POLICY "agencies_view_active_listings" ON public.marketplace_listings
  FOR SELECT USING (status = 'active');

-- Marketplace Transactions: tracks completed bookings and platform fees
CREATE TABLE public.marketplace_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  booking_request_id uuid REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  campaign_id text REFERENCES public.campaigns(id) ON DELETE SET NULL,
  seller_company_id uuid NOT NULL REFERENCES public.companies(id),
  buyer_company_id uuid NOT NULL REFERENCES public.companies(id),
  transaction_value numeric NOT NULL DEFAULT 0,
  platform_fee_percent numeric NOT NULL DEFAULT 2.0,
  platform_fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;

-- Both buyer and seller can see their transactions
CREATE POLICY "parties_view_transactions" ON public.marketplace_transactions
  FOR SELECT USING (
    seller_company_id = public.current_company_id()
    OR buyer_company_id = public.current_company_id()
  );

CREATE POLICY "system_manage_transactions" ON public.marketplace_transactions
  FOR ALL USING (
    seller_company_id = public.current_company_id()
    OR buyer_company_id = public.current_company_id()
  );
