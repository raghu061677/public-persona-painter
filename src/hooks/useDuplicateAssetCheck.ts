import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DuplicateAsset {
  id: string;
  media_asset_code: string | null;
  location: string;
  created_at: string;
}

interface DuplicateCheckParams {
  companyId: string;
  mediaType: string;
  city: string;
  area: string;
  location: string;
  direction?: string;
  dimensions?: string;
  latitude?: number;
  longitude?: number;
  excludeId?: string;
}

export function useDuplicateAssetCheck() {
  const [duplicates, setDuplicates] = useState<DuplicateAsset[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkForDuplicates = useCallback(async (params: DuplicateCheckParams) => {
    if (!params.companyId || !params.mediaType || !params.city || !params.area || !params.location) {
      setDuplicates([]);
      return [];
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase.rpc('check_media_asset_duplicate', {
        p_company_id: params.companyId,
        p_media_type: params.mediaType,
        p_city: params.city,
        p_area: params.area,
        p_location: params.location,
        p_direction: params.direction || null,
        p_dimensions: params.dimensions || null,
        p_latitude: params.latitude || null,
        p_longitude: params.longitude || null,
        p_exclude_id: params.excludeId || null,
      });

      if (error) {
        console.error('Error checking duplicates:', error);
        setDuplicates([]);
        return [];
      }

      const results = (data || []) as DuplicateAsset[];
      setDuplicates(results);
      return results;
    } catch (err) {
      console.error('Error checking duplicates:', err);
      setDuplicates([]);
      return [];
    } finally {
      setIsChecking(false);
    }
  }, []);

  const clearDuplicates = useCallback(() => {
    setDuplicates([]);
  }, []);

  return {
    duplicates,
    isChecking,
    checkForDuplicates,
    clearDuplicates,
    hasDuplicates: duplicates.length > 0,
  };
}
