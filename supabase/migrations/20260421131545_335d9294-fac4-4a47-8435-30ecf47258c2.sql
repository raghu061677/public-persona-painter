-- Add monthly assignment to campaign_charge_items so the same
-- one-time-charge concept can be reused for Calendar Monthly billing.
-- Existing asset-cycle rows continue to use billing_cycle_no.

ALTER TABLE public.campaign_charge_items
  ADD COLUMN IF NOT EXISTS billing_month_key TEXT;

COMMENT ON COLUMN public.campaign_charge_items.billing_month_key IS
  'YYYY-MM key when this charge is assigned to a calendar-monthly invoice. Mutually exclusive with billing_cycle_no.';

-- Helpful indexes for monthly lookups
CREATE INDEX IF NOT EXISTS idx_charge_items_month
  ON public.campaign_charge_items (campaign_id, billing_month_key);

CREATE INDEX IF NOT EXISTS idx_charge_items_month_pending
  ON public.campaign_charge_items (campaign_id, billing_month_key)
  WHERE is_invoiced = false AND billing_month_key IS NOT NULL;