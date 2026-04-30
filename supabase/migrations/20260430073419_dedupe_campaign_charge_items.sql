-- Dedupe duplicate auto-seeded campaign_charge_items.
-- Keeps the earliest non-invoiced seeded row per (campaign_id, campaign_asset_id, charge_type, billing_month_key, billing_cycle_no)
-- when none of the duplicates have been invoiced yet.
WITH ranked AS (
  SELECT
    id,
    invoice_id,
    is_invoiced,
    ROW_NUMBER() OVER (
      PARTITION BY campaign_id, campaign_asset_id, charge_type,
                   COALESCE(billing_month_key, ''),
                   COALESCE(billing_cycle_no, -1)
      ORDER BY
        (CASE WHEN is_invoiced THEN 0 ELSE 1 END), -- keep invoiced first if any
        created_at ASC,
        id ASC
    ) AS rn,
    COUNT(*) FILTER (WHERE is_invoiced) OVER (
      PARTITION BY campaign_id, campaign_asset_id, charge_type,
                   COALESCE(billing_month_key, ''),
                   COALESCE(billing_cycle_no, -1)
    ) AS invoiced_in_group
  FROM public.campaign_charge_items
  WHERE created_from IN ('auto_seed_cycle1', 'auto_seed_month1')
)
DELETE FROM public.campaign_charge_items
WHERE id IN (
  SELECT id FROM ranked
  WHERE rn > 1
    AND is_invoiced = false  -- never delete invoiced rows
);
