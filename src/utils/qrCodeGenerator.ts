import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';

/**
 * Generate QR code for a media asset and upload to Supabase Storage
 * @param assetId - The media asset ID
 * @param companyId - The company ID for storage path
 * @returns The public URL of the generated QR code
 */
export async function generateAssetQRCode(assetId: string, companyId: string): Promise<string> {
  try {
    // Generate public URL for asset viewing
    const assetViewUrl = `${window.location.origin}/asset/${assetId}`;
    
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(assetViewUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    // Convert data URL to Blob
    const response = await fetch(qrDataUrl);
    const blob = await response.blob();
    
    // Upload to Supabase Storage
    const fileName = `${assetId}.png`;
    const filePath = `${companyId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('media_qr_codes')
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true,
      });
    
    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media_qr_codes')
      .getPublicUrl(filePath);
    
    // Update media_assets table with QR code URL
    await supabase
      .from('media_assets')
      .update({ qr_code_url: publicUrl })
      .eq('id', assetId);
    
    return publicUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Generate QR codes for multiple assets in batch
 * @param assetIds - Array of asset IDs
 * @param companyId - The company ID
 * @returns Array of results with asset ID and QR URL
 */
export async function generateBatchQRCodes(
  assetIds: string[],
  companyId: string
): Promise<Array<{ assetId: string; qrUrl: string; success: boolean }>> {
  const results = await Promise.allSettled(
    assetIds.map(async (assetId) => {
      const qrUrl = await generateAssetQRCode(assetId, companyId);
      return { assetId, qrUrl, success: true };
    })
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        assetId: assetIds[index],
        qrUrl: '',
        success: false,
      };
    }
  });
}
