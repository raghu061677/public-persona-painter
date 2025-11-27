/**
 * QR Code Generator for Media Assets
 * Generates QR codes linking to asset locations
 */

import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';

export interface QRCodeOptions {
  assetId: string;
  latitude?: number | null;
  longitude?: number | null;
  googleStreetViewUrl?: string | null;
  locationUrl?: string | null;
}

/**
 * Determine the best URL to encode in the QR code
 */
export function getLocationUrl(options: QRCodeOptions): string {
  const { googleStreetViewUrl, locationUrl, latitude, longitude } = options;

  // Priority 1: Google Street View URL
  if (googleStreetViewUrl) {
    return googleStreetViewUrl;
  }

  // Priority 2: Custom location URL
  if (locationUrl) {
    return locationUrl;
  }

  // Priority 3: Generate Google Maps URL from coordinates
  if (latitude && longitude) {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  // Fallback: Empty string (should not happen if data is validated)
  return '';
}

/**
 * Generate QR code as PNG data URL
 */
export async function generateQRCodeDataUrl(url: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code and upload to Supabase storage
 */
export async function generateAndUploadQRCode(
  options: QRCodeOptions
): Promise<string> {
  const locationUrl = getLocationUrl(options);

  if (!locationUrl) {
    throw new Error('No valid location data available for QR code generation');
  }

  // Generate QR code as data URL
  const qrDataUrl = await generateQRCodeDataUrl(locationUrl);

  // Convert data URL to blob
  const response = await fetch(qrDataUrl);
  const blob = await response.blob();

  // Upload to Supabase storage
  const filePath = `${options.assetId}/qr.png`;
  const { data, error } = await supabase.storage
    .from('media-qr-codes')
    .upload(filePath, blob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading QR code:', error);
    throw new Error('Failed to upload QR code to storage');
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('media-qr-codes')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Update media asset with QR code URL
 */
export async function updateAssetQRCode(
  assetId: string,
  qrCodeUrl: string
): Promise<void> {
  const { error } = await supabase
    .from('media_assets')
    .update({ qr_code_url: qrCodeUrl })
    .eq('id', assetId);

  if (error) {
    console.error('Error updating asset QR code:', error);
    throw new Error('Failed to update asset with QR code URL');
  }
}

/**
 * Generate QR code for a media asset (complete flow)
 */
export async function generateAssetQRCode(
  options: QRCodeOptions
): Promise<string> {
  try {
    // Generate and upload QR code
    const qrCodeUrl = await generateAndUploadQRCode(options);

    // Update asset record
    await updateAssetQRCode(options.assetId, qrCodeUrl);

    return qrCodeUrl;
  } catch (error) {
    console.error('Error in QR code generation flow:', error);
    throw error;
  }
}

/**
 * Delete QR code from storage
 */
export async function deleteAssetQRCode(assetId: string): Promise<void> {
  const filePath = `${assetId}/qr.png`;
  
  const { error } = await supabase.storage
    .from('media-qr-codes')
    .remove([filePath]);

  if (error) {
    console.error('Error deleting QR code:', error);
    throw new Error('Failed to delete QR code');
  }
}
