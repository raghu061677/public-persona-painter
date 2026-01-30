/**
 * AUTO-DERIVED LATEST PHOTOS (NO MANUAL SELECTION)
 * 
 * This module provides utilities to automatically derive the latest proof photos
 * for a campaign asset without requiring manual "latest" selection by field teams.
 * 
 * Priority order for each photo type:
 * 1. newspaper - publication proof
 * 2. geotag - GPS-tagged location photo
 * 3. traffic1 - traffic view left
 * 4. traffic2 - traffic view right
 */

import { supabase } from '@/integrations/supabase/client';

export interface LatestPhotos {
  newspaper: string | null;
  geotag: string | null;
  traffic1: string | null;
  traffic2: string | null;
}

export interface PhotoRecord {
  id: string;
  photo_url: string;
  category: string | null;
  uploaded_at: string | null;
}

/**
 * Map photo categories to standard types
 */
function normalizePhotoType(category: string | null): keyof LatestPhotos | null {
  const value = (category || '').toLowerCase();
  
  // Newspaper mappings
  if (value.includes('newspaper') || value === 'news') {
    return 'newspaper';
  }
  
  // Geo-tagged mappings
  if (value.includes('geo') || value.includes('geotag') || value === 'gps' || value === 'location') {
    return 'geotag';
  }
  
  // Traffic 1 mappings (left side)
  if (value.includes('traffic1') || value.includes('traffic_left') || value === 'traffic left' || value.includes('traffic-1')) {
    return 'traffic1';
  }
  
  // Traffic 2 mappings (right side)
  if (value.includes('traffic2') || value.includes('traffic_right') || value === 'traffic right' || value.includes('traffic-2')) {
    return 'traffic2';
  }
  
  // Generic "traffic" goes to traffic1 first
  if (value.includes('traffic') && !value.includes('1') && !value.includes('2')) {
    return 'traffic1';
  }
  
  return null;
}

/**
 * Derive latest photos from a list of photo records
 * For each photo type, selects the one with MAX(uploaded_at)
 */
export function deriveLatestPhotos(photos: PhotoRecord[]): LatestPhotos {
  const result: LatestPhotos = {
    newspaper: null,
    geotag: null,
    traffic1: null,
    traffic2: null,
  };
  
  // Track timestamps for each type
  const timestamps: Record<keyof LatestPhotos, Date | null> = {
    newspaper: null,
    geotag: null,
    traffic1: null,
    traffic2: null,
  };
  
  for (const photo of photos) {
    if (!photo.photo_url) continue;
    
    const photoType = normalizePhotoType(photo.category);
    if (!photoType) continue;
    
    const photoDate = photo.uploaded_at ? new Date(photo.uploaded_at) : new Date(0);
    const currentDate = timestamps[photoType];
    
    // Keep the latest (max uploaded_at) for each type
    if (!currentDate || photoDate > currentDate) {
      result[photoType] = photo.photo_url;
      timestamps[photoType] = photoDate;
    }
  }
  
  return result;
}

/**
 * Parse campaign_assets.photos JSONB field into LatestPhotos structure
 */
export function parsePhotosJsonb(photos: Record<string, any> | null): LatestPhotos {
  if (!photos || typeof photos !== 'object') {
    return { newspaper: null, geotag: null, traffic1: null, traffic2: null };
  }
  
  return {
    newspaper: photos.newspaper || photos.news || null,
    geotag: photos.geo || photos.geotag || photos.gps || null,
    traffic1: photos.traffic1 || photos.traffic_left || photos.trafficLeft || null,
    traffic2: photos.traffic2 || photos.traffic_right || photos.trafficRight || null,
  };
}

/**
 * Fetch latest photos for a campaign asset from media_photos table
 * Falls back to campaign_assets.photos JSONB if no media_photos records exist
 */
export async function fetchLatestPhotosForCampaignAsset(
  campaignId: string,
  assetId: string
): Promise<LatestPhotos> {
  // First try to get photos from media_photos table (operations proofs)
  const { data: photoRecords } = await supabase
    .from('media_photos')
    .select('id, photo_url, category, uploaded_at')
    .eq('campaign_id', campaignId)
    .eq('asset_id', assetId)
    .order('uploaded_at', { ascending: false })
    .limit(20);
  
  if (photoRecords && photoRecords.length > 0) {
    return deriveLatestPhotos(photoRecords as PhotoRecord[]);
  }
  
  // Fallback: Get photos from campaign_assets.photos JSONB
  const { data: campaignAsset } = await supabase
    .from('campaign_assets')
    .select('photos')
    .eq('campaign_id', campaignId)
    .eq('asset_id', assetId)
    .maybeSingle();
  
  if (campaignAsset?.photos) {
    return parsePhotosJsonb(campaignAsset.photos as Record<string, any>);
  }
  
  return { newspaper: null, geotag: null, traffic1: null, traffic2: null };
}

/**
 * Determine proof status based on available photos
 * 
 * Status rules:
 * - Pending: fewer than required photos
 * - Ready for QA: all required photo types exist (1 newspaper, 1 geotag, 1+ traffic)
 * - Verified: QA approved (external status)
 * - Failed: QA rejected (external status)
 */
export type ProofStatus = 'Pending' | 'Ready for QA' | 'Verified' | 'Failed';

export function calculateProofStatus(
  photos: LatestPhotos,
  currentStatus?: string
): ProofStatus {
  // If externally set to Verified or Failed, respect that
  if (currentStatus === 'Verified') return 'Verified';
  if (currentStatus === 'Failed') return 'Failed';
  
  // Minimum requirements: 1 newspaper, 1 geotag, 1 traffic
  const hasNewspaper = !!photos.newspaper;
  const hasGeotag = !!photos.geotag;
  const hasTraffic = !!photos.traffic1 || !!photos.traffic2;
  
  if (hasNewspaper && hasGeotag && hasTraffic) {
    return 'Ready for QA';
  }
  
  return 'Pending';
}

/**
 * Get photo count for display
 */
export function getPhotoCount(photos: LatestPhotos): { uploaded: number; total: number } {
  let count = 0;
  if (photos.newspaper) count++;
  if (photos.geotag) count++;
  if (photos.traffic1) count++;
  if (photos.traffic2) count++;
  
  return { uploaded: count, total: 4 };
}

/**
 * Get first available photo for thumbnail/preview
 * Priority: newspaper > geotag > traffic1 > traffic2
 */
export function getPreviewPhoto(photos: LatestPhotos): string | null {
  return photos.newspaper || photos.geotag || photos.traffic1 || photos.traffic2;
}

/**
 * Get photos array for PPT export in priority order
 * Returns array of { url, label } for slide generation
 */
export function getPhotosForExport(photos: LatestPhotos): Array<{ url: string; label: string }> {
  const result: Array<{ url: string; label: string }> = [];
  
  if (photos.newspaper) {
    result.push({ url: photos.newspaper, label: 'Newspaper Ad' });
  }
  if (photos.geotag) {
    result.push({ url: photos.geotag, label: 'Geo-tagged Photo' });
  }
  if (photos.traffic1) {
    result.push({ url: photos.traffic1, label: 'Traffic View 1' });
  }
  if (photos.traffic2) {
    result.push({ url: photos.traffic2, label: 'Traffic View 2' });
  }
  
  return result;
}
