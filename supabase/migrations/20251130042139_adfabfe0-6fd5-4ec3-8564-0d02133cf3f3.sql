-- MODULE 2: MEDIA ASSETS SCHEMA UPGRADE

-- Drop views
DROP VIEW IF EXISTS public_media_assets_safe CASCADE;

-- Remove redundant fields
ALTER TABLE media_assets DROP COLUMN IF EXISTS media_id;
ALTER TABLE media_assets DROP COLUMN IF EXISTS base_rent;
ALTER TABLE media_assets DROP COLUMN IF EXISTS printing_charges;
ALTER TABLE media_assets DROP COLUMN IF EXISTS mounting_charges;
ALTER TABLE media_assets DROP COLUMN IF EXISTS illumination;
ALTER TABLE media_assets DROP COLUMN IF EXISTS image_urls;
ALTER TABLE media_assets DROP COLUMN IF EXISTS images;
ALTER TABLE media_assets DROP COLUMN IF EXISTS location_url;

-- Add new fields
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS illumination_type TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS base_rate NUMERIC DEFAULT 0;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS printing_rate_default NUMERIC DEFAULT 0;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS mounting_rate_default NUMERIC DEFAULT 0;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS primary_photo_url TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS installation_type TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS structure_ownership TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS traffic_density TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS visibility_score NUMERIC(3,1);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS target_audience TEXT[];
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS monthly_land_rent NUMERIC DEFAULT 0;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS display_title TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS min_booking_days INTEGER DEFAULT 30;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS default_duration_mode TEXT DEFAULT 'Month';
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS last_maintenance_date DATE;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS next_maintenance_due DATE;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS municipal_id TEXT;

-- Create view
CREATE VIEW public_media_assets_safe AS
SELECT 
  id, company_id, state, district, city, area, location,
  media_type, category, direction, dimensions, total_sqft,
  illumination_type, latitude, longitude,
  base_rate, card_rate, printing_rate_default, mounting_rate_default,
  status, is_public, is_featured, is_active,
  primary_photo_url, google_street_view_url, qr_code_url,
  municipal_authority, municipal_id,
  display_title, tags, created_at, updated_at
FROM media_assets
WHERE is_public = true AND is_active = true;

-- Create asset_bookings
CREATE TABLE IF NOT EXISTS asset_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES plans(id) ON DELETE SET NULL,
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL CHECK (booking_type IN ('campaign', 'maintenance', 'block')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_asset_bookings_asset ON asset_bookings(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_bookings_dates ON asset_bookings(start_date, end_date);

ALTER TABLE asset_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company bookings" ON asset_bookings FOR SELECT USING (
  asset_id IN (SELECT id FROM media_assets WHERE company_id = get_current_user_company_id()) OR is_platform_admin(auth.uid())
);

CREATE POLICY "Users create company bookings" ON asset_bookings FOR INSERT WITH CHECK (
  asset_id IN (SELECT id FROM media_assets WHERE company_id = get_current_user_company_id()) OR is_platform_admin(auth.uid())
);

CREATE TRIGGER update_asset_bookings_updated_at BEFORE UPDATE ON asset_bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_company ON media_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets(status);
CREATE INDEX IF NOT EXISTS idx_media_assets_city ON media_assets(city);
CREATE INDEX IF NOT EXISTS idx_media_assets_area ON media_assets(area);
CREATE INDEX IF NOT EXISTS idx_media_assets_state ON media_assets(state);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(media_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_public ON media_assets(is_public);
CREATE INDEX IF NOT EXISTS idx_media_assets_city_status ON media_assets(city, status);

-- Availability function
CREATE OR REPLACE FUNCTION check_asset_availability(
  p_asset_id TEXT, p_start_date DATE, p_end_date DATE, p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conflicts INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_conflicts FROM asset_bookings
  WHERE asset_id = p_asset_id AND status IN ('reserved', 'confirmed')
    AND (start_date <= p_end_date AND end_date >= p_start_date)
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);
  RETURN v_conflicts = 0;
END; $$;