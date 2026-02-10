
-- ============================================================
-- SAFE CLEANUP: Reassign orphaned references from deleted duplicate campaigns to canonical ones
-- ============================================================

-- 1) Reassign campaign_assets from CAM-202602-0009 (deleted) to CAM-202602-0008 (canonical)
-- Only reassign rows where the asset_id doesn't already exist under the canonical
UPDATE campaign_assets 
SET campaign_id = 'CAM-202602-0008'
WHERE campaign_id = 'CAM-202602-0009'
AND asset_id NOT IN (
  SELECT asset_id FROM campaign_assets WHERE campaign_id = 'CAM-202602-0008'
);

-- Delete remaining duplicate campaign_assets rows that would cause collisions
DELETE FROM campaign_assets 
WHERE campaign_id = 'CAM-202602-0009';

-- 2) Reassign Draft invoice from deleted CAM-202602-0004 to canonical CAM-202602-0003
UPDATE invoices 
SET campaign_id = 'CAM-202602-0003'
WHERE id = 'INV/2025-26/0014' AND campaign_id = 'CAM-202602-0004';

-- 3) Reassign campaign_assets from CAM-202602-0004 to CAM-202602-0003
UPDATE campaign_assets 
SET campaign_id = 'CAM-202602-0003'
WHERE campaign_id = 'CAM-202602-0004'
AND asset_id NOT IN (
  SELECT asset_id FROM campaign_assets WHERE campaign_id = 'CAM-202602-0003'
);
DELETE FROM campaign_assets WHERE campaign_id = 'CAM-202602-0004';

-- 4) Clean up other deleted-duplicate campaign_assets (no canonical reassignment needed, just orphan cleanup)
-- CAM-2026-January-842 assets -> CAM-2026-January-841
UPDATE campaign_assets 
SET campaign_id = 'CAM-2026-January-841'
WHERE campaign_id = 'CAM-2026-January-842'
AND asset_id NOT IN (
  SELECT asset_id FROM campaign_assets WHERE campaign_id = 'CAM-2026-January-841'
);
DELETE FROM campaign_assets WHERE campaign_id = 'CAM-2026-January-842';

-- CAM-2026-January-856 assets -> CAM-2026-January-855
UPDATE campaign_assets 
SET campaign_id = 'CAM-2026-January-855'
WHERE campaign_id = 'CAM-2026-January-856'
AND asset_id NOT IN (
  SELECT asset_id FROM campaign_assets WHERE campaign_id = 'CAM-2026-January-855'
);
DELETE FROM campaign_assets WHERE campaign_id = 'CAM-2026-January-856';

-- CAM-2026-6379 (both deleted, just clean orphan assets)
UPDATE campaign_assets 
SET campaign_id = 'CAM-2026-1394'
WHERE campaign_id = 'CAM-2026-6379'
AND asset_id NOT IN (
  SELECT asset_id FROM campaign_assets WHERE campaign_id = 'CAM-2026-1394'
);
DELETE FROM campaign_assets WHERE campaign_id = 'CAM-2026-6379';

-- 5) Ensure all duplicate campaigns are properly marked deleted with reason
UPDATE campaigns 
SET is_deleted = true, 
    deletion_reason = COALESCE(deletion_reason, 'Duplicate campaign cleanup'),
    updated_at = now()
WHERE id IN (
  'CAM-202602-0009', 'CAM-202602-0004', 
  'CAM-2026-January-842', 'CAM-2026-January-856', 
  'CAM-2026-6379'
) AND (is_deleted IS NULL OR is_deleted = false);

-- 6) Also clean orphaned campaign_assets from other deleted campaigns without canonical counterparts
-- These are standalone deleted campaigns - their assets are truly orphaned
-- CAM-2026-January-838 (Ambitus, deleted, Completed) - 4 assets, keep as historical
-- CAM-2025-December-011 (MedPlus, deleted, Completed) - 2 assets + paid invoice, keep as historical
-- CAM-2026-January-835, CAM-2026-January-839 (RealPlus Renewal, deleted) - 1 asset each, keep

-- No deletion for historical completed campaigns, they serve as audit trail
