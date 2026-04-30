-- Step 1: For campaigns that have month-assigned seeded rows, remove uninvoiced cycle-seeded rows
-- (those should have been migrated to billing_month_key but old runs left them behind).
DELETE FROM public.campaign_charge_items c
WHERE c.created_from = 'auto_seed_cycle1'
  AND c.is_invoiced = false
  AND c.billing_month_key IS NULL
  AND EXISTS (
    SELECT 1 FROM public.campaign_charge_items m
    WHERE m.campaign_id = c.campaign_id
      AND m.created_from = 'auto_seed_month1'
      AND m.billing_month_key IS NOT NULL
  );

-- Step 2: Within the same (campaign, asset, charge_type, billing slot), keep one row only.
WITH ranked AS (
  SELECT
    id,
    is_invoiced,
    ROW_NUMBER() OVER (
      PARTITION BY campaign_id, campaign_asset_id, charge_type,
                   COALESCE(billing_month_key, ''),
                   COALESCE(billing_cycle_no, -1)
      ORDER BY
        (CASE WHEN is_invoiced THEN 0 ELSE 1 END),
        created_at ASC,
        id ASC
    ) AS rn
  FROM public.campaign_charge_items
  WHERE created_from IN ('auto_seed_cycle1', 'auto_seed_month1')
)
DELETE FROM public.campaign_charge_items
WHERE id IN (SELECT id FROM ranked WHERE rn > 1 AND is_invoiced = false);