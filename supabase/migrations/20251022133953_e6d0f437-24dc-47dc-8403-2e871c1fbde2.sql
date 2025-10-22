-- Delete all campaign assets first (to avoid orphaned references)
DELETE FROM campaign_assets;

-- Delete all plan items (to avoid orphaned references)
DELETE FROM plan_items;

-- Delete all media assets
DELETE FROM media_assets;

-- Add comment to document the cleanup
COMMENT ON TABLE media_assets IS 'Media assets inventory - cleaned and ready for fresh import';