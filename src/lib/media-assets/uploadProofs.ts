import * as exifr from "exifr";
import { supabase } from "@/integrations/supabase/client";
import { validateProofPhoto, PhotoValidationResult } from "@/lib/photoValidation";

interface ProofPhoto {
  url: string;
  tag: string;
  uploaded_at: string;
  latitude?: number;
  longitude?: number;
  validation?: PhotoValidationResult;
}

interface UploadResult {
  url: string;
  tag: string;
  latitude?: number;
  longitude?: number;
  validation?: PhotoValidationResult;
}

/**
 * Detect photo tag from filename and EXIF data
 */
async function detectPhotoTag(file: File): Promise<{ tag: string; latitude?: number; longitude?: number }> {
  const fileName = file.name.toLowerCase();
  
  // Try to extract EXIF data
  let exifData: any = null;
  try {
    exifData = await exifr.parse(file, {
      gps: true,
      pick: ['latitude', 'longitude']
    });
  } catch (error) {
    console.log('No EXIF data found:', error);
  }

  // Check for GPS coordinates in EXIF
  const hasGPS = exifData?.latitude && exifData?.longitude;

  // Detect tag based on filename keywords
  if (fileName.includes('news') || fileName.includes('paper') || fileName.includes('newspaper')) {
    return {
      tag: 'Newspaper Photo',
      latitude: hasGPS ? exifData.latitude : undefined,
      longitude: hasGPS ? exifData.longitude : undefined,
    };
  }
  
  if (fileName.includes('traffic') || fileName.includes('road')) {
    return {
      tag: 'Traffic Photo',
      latitude: hasGPS ? exifData.latitude : undefined,
      longitude: hasGPS ? exifData.longitude : undefined,
    };
  }
  
  if (fileName.includes('geo') || fileName.includes('map') || fileName.includes('location') || hasGPS) {
    return {
      tag: 'Geo-Tagged Photo',
      latitude: hasGPS ? exifData.latitude : undefined,
      longitude: hasGPS ? exifData.longitude : undefined,
    };
  }

  // Default fallback
  return {
    tag: 'Other Photo',
    latitude: hasGPS ? exifData.latitude : undefined,
    longitude: hasGPS ? exifData.longitude : undefined,
  };
}

/**
 * Upload a proof photo to Supabase Storage and update database
 */
export async function uploadProofPhoto(
  assetId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // Detect tag and extract EXIF
  if (onProgress) onProgress(0.1);
  const { tag, latitude, longitude } = await detectPhotoTag(file);

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedTag = tag.toLowerCase().replace(/\s+/g, '_');
  const extension = file.name.split('.').pop() || 'jpg';
  const fileName = `proof_${sanitizedTag}_${timestamp}.${extension}`;
  const filePath = `${assetId}/proofs/${fileName}`;

  // Upload to Supabase Storage
  if (onProgress) onProgress(0.3);
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('media-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('media-assets')
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL');
  }

  if (onProgress) onProgress(0.7);

  // Validate photo quality using AI
  let validation: PhotoValidationResult | undefined;
  try {
    validation = await validateProofPhoto(urlData.publicUrl, tag as any);
    if (onProgress) onProgress(0.85);
  } catch (error) {
    console.error("Photo validation failed:", error);
    // Continue even if validation fails
  }

  // Prepare photo metadata
  const photoMetadata: ProofPhoto = {
    url: urlData.publicUrl,
    tag,
    uploaded_at: new Date().toISOString(),
    ...(latitude && longitude ? { latitude, longitude } : {}),
    ...(validation ? { validation } : {}),
  };

  // Update database - append to photos array in images field
  const { data: currentAsset, error: fetchError } = await supabase
    .from('media_assets')
    .select('images')
    .eq('id', assetId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch asset: ${fetchError.message}`);
  }

  const currentImages = (currentAsset.images as any) || {};
  const currentPhotos = currentImages.photos || [];
  const updatedPhotos = [...currentPhotos, photoMetadata];

  const { error: updateError } = await supabase
    .from('media_assets')
    .update({
      images: {
        ...currentImages,
        photos: updatedPhotos,
      },
    })
    .eq('id', assetId);

  if (updateError) {
    // Try to cleanup uploaded file
    await supabase.storage.from('media-assets').remove([filePath]);
    throw new Error(`Database update failed: ${updateError.message}`);
  }

  if (onProgress) onProgress(1);

  return {
    url: urlData.publicUrl,
    tag,
    latitude,
    longitude,
    validation,
  };
}
