/**
 * Google Street View URL utilities
 * Builds reliable Street View URLs and handles fallbacks
 */

export interface StreetViewOptions {
  latitude: number;
  longitude: number;
  heading?: number;
  pitch?: number;
  fov?: number;
}

export const DEFAULT_STREET_VIEW_CONFIG = {
  heading: 90, // East-facing / traffic direction
  pitch: 0,
  fov: 80,
};

/**
 * Build a Google Maps Street View URL using latitude and longitude
 * This URL format works reliably across all browsers and mobile devices
 * 
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate
 * @param heading - Camera heading (0-360, default 90 = east)
 * @param pitch - Camera pitch (-90 to 90, default 0 = level)
 * @param fov - Field of view (10-100, default 80)
 * @returns Properly formatted Google Maps Street View URL
 */
export function buildStreetViewUrl(
  lat: number,
  lng: number,
  heading: number = DEFAULT_STREET_VIEW_CONFIG.heading,
  pitch: number = DEFAULT_STREET_VIEW_CONFIG.pitch,
  fov: number = DEFAULT_STREET_VIEW_CONFIG.fov
): string {
  // Validate inputs
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    throw new Error('Invalid coordinates provided');
  }

  // Clamp values to valid ranges
  const clampedHeading = Math.max(0, Math.min(360, heading));
  const clampedPitch = Math.max(-90, Math.min(90, pitch));
  const clampedFov = Math.max(10, Math.min(100, fov));

  // Build the URL using Google Maps embed API format
  const params = new URLSearchParams({
    api: '1',
    map_action: 'pano',
    viewpoint: `${lat},${lng}`,
    heading: clampedHeading.toString(),
    pitch: clampedPitch.toString(),
    fov: clampedFov.toString(),
  });

  return `https://www.google.com/maps/@?${params.toString()}`;
}

/**
 * Calculate bearing/heading between two coordinates
 * Useful for determining traffic direction or front-facing direction
 * 
 * @param lat1 - Starting latitude
 * @param lon1 - Starting longitude
 * @param lat2 - Ending latitude
 * @param lon2 - Ending longitude
 * @returns Bearing in degrees (0-360)
 */
export function calculateHeading(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;

  return Math.round(bearing);
}

/**
 * Validate and fix a Street View URL
 * Returns a properly formatted URL or generates a new one from coordinates
 * 
 * @param existingUrl - Existing Street View URL (may be broken)
 * @param latitude - Asset latitude
 * @param longitude - Asset longitude
 * @param heading - Optional heading override
 * @returns Fixed or newly generated Street View URL
 */
export function validateAndFixStreetViewUrl(
  existingUrl: string | null | undefined,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  heading?: number
): string | null {
  // If no coordinates, can't generate URL
  if (!latitude || !longitude) {
    return null;
  }

  // Check if existing URL is valid and uses the correct format
  if (existingUrl && isValidStreetViewUrl(existingUrl)) {
    return existingUrl;
  }

  // Generate new URL from coordinates
  return buildStreetViewUrl(latitude, longitude, heading);
}

/**
 * Check if a URL is a valid Google Maps Street View URL
 * 
 * @param url - URL to validate
 * @returns True if valid Street View URL
 */
export function isValidStreetViewUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    
    // Check if it's a Google Maps URL
    if (!urlObj.hostname.includes('google.com')) {
      return false;
    }

    // Check if it has Street View parameters
    const hasMapAction = urlObj.searchParams.get('map_action') === 'pano';
    const hasViewpoint = !!urlObj.searchParams.get('viewpoint');
    const hasCoordinates = url.includes('/@');

    return hasMapAction || hasViewpoint || hasCoordinates;
  } catch {
    return false;
  }
}

/**
 * Extract coordinates from a Street View URL if possible
 * 
 * @param url - Street View URL
 * @returns Coordinates or null
 */
export function extractCoordinatesFromUrl(url: string): { lat: number; lng: number } | null {
  try {
    const urlObj = new URL(url);
    
    // Try to get from viewpoint parameter
    const viewpoint = urlObj.searchParams.get('viewpoint');
    if (viewpoint) {
      const [lat, lng] = viewpoint.split(',').map(parseFloat);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    // Try to extract from @ format
    const match = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get a fallback Street View URL by searching nearby
 * This is useful when Street View is not available at exact coordinates
 * 
 * @param latitude - Asset latitude
 * @param longitude - Asset longitude
 * @param radiusMeters - Search radius (default 50m)
 * @returns Promise with Street View URL or null
 */
export async function getStreetViewWithFallback(
  latitude: number,
  longitude: number,
  radiusMeters: number = 50
): Promise<string | null> {
  // First try the exact location
  const exactUrl = buildStreetViewUrl(latitude, longitude);
  
  // In a real implementation with API key, you would:
  // 1. Query Street View metadata API
  // 2. Check if status is OK
  // 3. If not, search in expanding radius (20m, 50m, 100m)
  // 4. Return nearest available pano
  
  // For now, return the exact location URL
  // The actual validation would need to be done server-side with API key
  return exactUrl;
}
