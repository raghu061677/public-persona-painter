-- Migration: Backfill plan_items snapshot fields
-- This migration populates missing snapshot fields in plan_items using data from media_assets

UPDATE plan_items pi
SET 
  media_type        = COALESCE(pi.media_type,        ma.media_type),
  state             = COALESCE(pi.state,             ma.state),
  district          = COALESCE(pi.district,          ma.district),
  city              = COALESCE(pi.city,              ma.city),
  area              = COALESCE(pi.area,              ma.area),
  location          = COALESCE(pi.location,          ma.location),
  direction         = COALESCE(pi.direction,         ma.direction),
  dimensions        = COALESCE(pi.dimensions,        ma.dimensions),
  total_sqft        = COALESCE(pi.total_sqft,        ma.total_sqft),
  illumination_type = COALESCE(pi.illumination_type, ma.illumination_type),
  latitude          = COALESCE(pi.latitude,          ma.latitude),
  longitude         = COALESCE(pi.longitude,         ma.longitude)
FROM media_assets ma
WHERE pi.asset_id = ma.id
  AND (
    pi.media_type IS NULL
    OR pi.state IS NULL
    OR pi.district IS NULL
    OR pi.total_sqft IS NULL
    OR pi.illumination_type IS NULL
  );