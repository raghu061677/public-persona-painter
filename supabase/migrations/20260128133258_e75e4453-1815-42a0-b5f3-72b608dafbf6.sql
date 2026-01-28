-- Add per-asset duration columns to plan_items table
ALTER TABLE public.plan_items
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS booked_days integer,
ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'PRORATA_30' CHECK (billing_mode IN ('FULL_MONTH', 'PRORATA_30', 'DAILY')),
ADD COLUMN IF NOT EXISTS daily_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS rent_amount numeric DEFAULT 0;

-- Add billing_mode and calculated fields to campaign_assets table
ALTER TABLE public.campaign_assets
ADD COLUMN IF NOT EXISTS booked_days integer,
ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'PRORATA_30' CHECK (billing_mode IN ('FULL_MONTH', 'PRORATA_30', 'DAILY')),
ADD COLUMN IF NOT EXISTS daily_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS rent_amount numeric DEFAULT 0;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_plan_items_date_range ON public.plan_items(plan_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_date_range ON public.campaign_assets(campaign_id, booking_start_date, booking_end_date);

-- Backfill plan_items: set start_date and end_date from parent plan
UPDATE public.plan_items pi
SET 
  start_date = p.start_date,
  end_date = p.end_date,
  booked_days = CASE 
    WHEN p.start_date IS NOT NULL AND p.end_date IS NOT NULL 
    THEN GREATEST(1, (p.end_date - p.start_date) + 1)
    ELSE 30
  END,
  daily_rate = CASE 
    WHEN COALESCE(pi.sales_price, pi.card_rate, 0) > 0 
    THEN ROUND((COALESCE(pi.sales_price, pi.card_rate, 0) / 30.0)::numeric, 2)
    ELSE 0
  END,
  rent_amount = CASE 
    WHEN p.start_date IS NOT NULL AND p.end_date IS NOT NULL AND COALESCE(pi.sales_price, pi.card_rate, 0) > 0
    THEN ROUND(((COALESCE(pi.sales_price, pi.card_rate, 0) / 30.0) * GREATEST(1, (p.end_date - p.start_date) + 1))::numeric, 2)
    ELSE 0
  END
FROM public.plans p
WHERE pi.plan_id = p.id
  AND pi.start_date IS NULL;

-- Backfill campaign_assets: calculate booked_days, daily_rate, rent_amount from booking dates
UPDATE public.campaign_assets ca
SET 
  booked_days = CASE 
    WHEN ca.booking_start_date IS NOT NULL AND ca.booking_end_date IS NOT NULL 
    THEN GREATEST(1, (ca.booking_end_date::date - ca.booking_start_date::date) + 1)
    ELSE CASE 
      WHEN c.start_date IS NOT NULL AND c.end_date IS NOT NULL 
      THEN GREATEST(1, (c.end_date::date - c.start_date::date) + 1)
      ELSE 30
    END
  END,
  daily_rate = CASE 
    WHEN COALESCE(ca.negotiated_rate, ca.card_rate, 0) > 0 
    THEN ROUND((COALESCE(ca.negotiated_rate, ca.card_rate, 0) / 30.0)::numeric, 2)
    ELSE 0
  END,
  rent_amount = CASE 
    WHEN ca.booking_start_date IS NOT NULL AND ca.booking_end_date IS NOT NULL AND COALESCE(ca.negotiated_rate, ca.card_rate, 0) > 0
    THEN ROUND(((COALESCE(ca.negotiated_rate, ca.card_rate, 0) / 30.0) * GREATEST(1, (ca.booking_end_date::date - ca.booking_start_date::date) + 1))::numeric, 2)
    WHEN c.start_date IS NOT NULL AND c.end_date IS NOT NULL AND COALESCE(ca.negotiated_rate, ca.card_rate, 0) > 0
    THEN ROUND(((COALESCE(ca.negotiated_rate, ca.card_rate, 0) / 30.0) * GREATEST(1, (c.end_date::date - c.start_date::date) + 1))::numeric, 2)
    ELSE 0
  END
FROM public.campaigns c
WHERE ca.campaign_id = c.id
  AND ca.booked_days IS NULL;

-- For campaign_assets without booking dates, backfill from campaign header
UPDATE public.campaign_assets ca
SET 
  booking_start_date = c.start_date,
  booking_end_date = c.end_date
FROM public.campaigns c
WHERE ca.campaign_id = c.id
  AND ca.booking_start_date IS NULL;