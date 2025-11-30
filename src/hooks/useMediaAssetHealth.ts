import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AssetHealthStatus {
  id: string;
  has_coordinates: boolean;
  has_street_view: boolean;
  has_qr_code: boolean;
  photo_count: number;
  dimensions_valid: boolean;
  multi_face_consistent: boolean;
  sqft_calculated: boolean;
  issues: string[];
  severity: 'healthy' | 'warning' | 'critical';
}

export function useMediaAssetHealth(assetId?: string) {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<AssetHealthStatus | null>(null);

  const checkHealth = async (id: string) => {
    setLoading(true);
    try {
      // Fetch asset
      const { data: asset, error: assetError } = await supabase
        .from('media_assets')
        .select('id, latitude, longitude, google_street_view_url, qr_code_url, dimensions, is_multi_face, total_sqft')
        .eq('id', id)
        .single();

      if (assetError || !asset) throw assetError;

      // Fetch photo count
      const { data: photos } = await supabase
        .from('media_photos')
        .select('id')
        .eq('asset_id', id);

      const photo_count = photos?.length || 0;
      const issues: string[] = [];

      const has_coordinates = !!(asset.latitude && asset.longitude);
      const has_street_view = !!asset.google_street_view_url;
      const has_qr_code = !!asset.qr_code_url;
      const dimensions_valid = !!(asset.dimensions && asset.dimensions.match(/\d+\s*[xX×]\s*\d+/));
      const has_dash = asset.dimensions?.includes('-');
      const multi_face_consistent = asset.is_multi_face === has_dash;
      const sqft_calculated = asset.total_sqft > 0;

      if (!has_coordinates) issues.push("Missing GPS coordinates");
      if (has_coordinates && !has_street_view) issues.push("Street View URL not generated");
      if (!has_qr_code) issues.push("QR Code not generated");
      if (photo_count === 0) issues.push("No photos uploaded");
      if (photo_count < 2) issues.push("Less than 2 photos");
      if (!dimensions_valid) issues.push("Invalid dimensions format");
      if (!multi_face_consistent) issues.push("Multi-face flag mismatch");
      if (!sqft_calculated) issues.push("Total sqft not calculated");

      const severity = issues.length === 0 ? 'healthy' : issues.length < 3 ? 'warning' : 'critical';

      setHealth({
        id: asset.id,
        has_coordinates,
        has_street_view,
        has_qr_code,
        photo_count,
        dimensions_valid,
        multi_face_consistent,
        sqft_calculated,
        issues,
        severity,
      });
    } catch (error) {
      console.error('Health check error:', error);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      checkHealth(assetId);
    }
  }, [assetId]);

  return {
    health,
    loading,
    checkHealth,
  };
}
