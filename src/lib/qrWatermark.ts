/**
 * QR Watermark utilities for adding existing QR codes as watermarks to images
 * Reuses existing QR codes stored in media_assets table
 */

export interface QRWatermarkOptions {
  qrCodeUrl: string;
  streetViewUrl: string;
  size?: number; // Default 70px
  padding?: number; // Default 12px
  opacity?: number; // Default 0.9
}

export interface WatermarkedImage {
  dataUrl: string;
  streetViewUrl: string;
}

/**
 * Build Street View URL from latitude/longitude for QR hyperlink
 */
export function buildStreetViewUrlFromCoords(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): string | null {
  if (!latitude || !longitude) return null;
  
  const params = new URLSearchParams({
    api: '1',
    map_action: 'pano',
    viewpoint: `${latitude},${longitude}`,
    heading: '90',
    pitch: '0',
    fov: '80',
  });

  return `https://www.google.com/maps/@?${params.toString()}`;
}

/**
 * Fetch image and convert to base64 data URL
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to fetch image as base64:', error);
    throw error;
  }
}

/**
 * Add QR watermark to an image using canvas
 * Returns base64 data URL of the watermarked image
 */
export async function addQRWatermarkToImage(
  imageUrl: string,
  options: QRWatermarkOptions
): Promise<WatermarkedImage> {
  const {
    qrCodeUrl,
    streetViewUrl,
    size = 70,
    padding = 12,
    opacity = 0.9,
  } = options;

  return new Promise(async (resolve, reject) => {
    try {
      // Create main image
      const mainImage = new Image();
      mainImage.crossOrigin = 'anonymous';
      
      // Create QR image
      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';

      // Load both images
      const loadImage = (img: HTMLImageElement, src: string): Promise<void> => {
        return new Promise((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error(`Failed to load image: ${src}`));
          img.src = src;
        });
      };

      await Promise.all([
        loadImage(mainImage, imageUrl),
        loadImage(qrImage, qrCodeUrl),
      ]);

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = mainImage.naturalWidth;
      canvas.height = mainImage.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      // Draw main image
      ctx.drawImage(mainImage, 0, 0);

      // Calculate QR position (bottom-right with padding)
      const qrX = canvas.width - size - padding;
      const qrY = canvas.height - size - padding;

      // Draw white background for QR (for better scanning)
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fillRect(qrX - 4, qrY - 4, size + 8, size + 8);

      // Draw QR code
      ctx.globalAlpha = opacity;
      ctx.drawImage(qrImage, qrX, qrY, size, size);
      ctx.globalAlpha = 1;

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      resolve({
        dataUrl,
        streetViewUrl,
      });
    } catch (error) {
      console.error('Failed to add QR watermark:', error);
      reject(error);
    }
  });
}

/**
 * Add QR watermark to an image for server-side (Deno/Edge Functions)
 * Uses fetch and returns base64 instead of canvas
 * Note: This requires server-side image processing library
 */
export async function addQRWatermarkServer(
  imageUrl: string,
  qrCodeUrl: string
): Promise<{ mainBase64: string; qrBase64: string }> {
  // Fetch both images as base64
  const [mainBase64, qrBase64] = await Promise.all([
    fetchImageAsBase64(imageUrl),
    fetchImageAsBase64(qrCodeUrl),
  ]);

  return { mainBase64, qrBase64 };
}

/**
 * Cache for QR code data to avoid refetching
 */
const qrCache = new Map<string, { base64: string; streetViewUrl: string }>();

/**
 * Get cached QR data or fetch and cache it
 */
export async function getCachedQRData(
  assetId: string,
  qrCodeUrl: string,
  latitude: number | null | undefined,
  longitude: number | null | undefined
): Promise<{ qrBase64: string; streetViewUrl: string } | null> {
  if (!qrCodeUrl) return null;

  const cacheKey = assetId;
  
  if (qrCache.has(cacheKey)) {
    const cached = qrCache.get(cacheKey)!;
    return { qrBase64: cached.base64, streetViewUrl: cached.streetViewUrl };
  }

  try {
    const streetViewUrl = buildStreetViewUrlFromCoords(latitude, longitude);
    if (!streetViewUrl) return null;

    const qrBase64 = await fetchImageAsBase64(qrCodeUrl);
    
    qrCache.set(cacheKey, { base64: qrBase64, streetViewUrl });
    
    return { qrBase64, streetViewUrl };
  } catch (error) {
    console.warn(`Failed to fetch QR for asset ${assetId}:`, error);
    return null;
  }
}

/**
 * Clear QR cache
 */
export function clearQRCache(): void {
  qrCache.clear();
}
