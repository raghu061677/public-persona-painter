/**
 * Core unified photo upload system
 * Consolidates duplicate logic from media-assets and operations modules
 */

import * as exifr from "exifr";
import { supabase } from "@/integrations/supabase/client";
import { validateProofPhoto } from "@/lib/photoValidation";
import { compressImage, getOptimalCompressionSettings } from "@/lib/imageCompression";
import type {
  PhotoTag,
  PhotoMetadata,
  PhotoUploadConfig,
  PhotoUploadResult,
  PhotoValidationResult,
  UploadProgress
} from "./types";

/**
 * Detect photo tag from filename and EXIF data
 */
export async function detectPhotoTag(file: File): Promise<{
  tag: PhotoTag;
  latitude?: number;
  longitude?: number;
}> {
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
      tag: 'Newspaper',
      latitude: hasGPS ? exifData.latitude : undefined,
      longitude: hasGPS ? exifData.longitude : undefined,
    };
  }
  
  if (fileName.includes('traffic') || fileName.includes('road')) {
    return {
      tag: 'Traffic',
      latitude: hasGPS ? exifData.latitude : undefined,
      longitude: hasGPS ? exifData.longitude : undefined,
    };
  }
  
  if (fileName.includes('geo') || fileName.includes('map') || fileName.includes('location') || hasGPS) {
    return {
      tag: 'Geo-Tagged',
      latitude: hasGPS ? exifData.latitude : undefined,
      longitude: hasGPS ? exifData.longitude : undefined,
    };
  }

  // Default fallback
  return {
    tag: 'Other',
    latitude: hasGPS ? exifData.latitude : undefined,
    longitude: hasGPS ? exifData.longitude : undefined,
  };
}

/**
 * Unified photo upload function
 * Used by both asset proofs and operations proofs
 */
export async function uploadPhoto(
  config: PhotoUploadConfig,
  file: File,
  metadata: PhotoMetadata,
  onProgress?: (progress: UploadProgress) => void
): Promise<PhotoUploadResult> {
  try {
    // Stage 1: Analyze image
    if (onProgress) {
      onProgress({ stage: 'analyzing', progress: 10, message: 'Analyzing image...' });
    }
    
    const { tag, latitude, longitude } = await detectPhotoTag(file);

    // Stage 2: Compress if enabled
    let fileToUpload: File = file;
    if (config.enableCompression) {
      if (onProgress) {
        onProgress({ stage: 'compressing', progress: 25, message: 'Compressing image...' });
      }
      
      try {
        const compressionSettings = getOptimalCompressionSettings(file);
        fileToUpload = await compressImage(file, compressionSettings);
      } catch (error) {
        console.warn('Compression failed, using original file:', error);
        // Continue with original file if compression fails
      }
    }

    // Stage 3: Generate unique filename and upload
    if (onProgress) {
      onProgress({ stage: 'uploading', progress: 40, message: 'Uploading to storage...' });
    }

    const timestamp = Date.now();
    const sanitizedTag = tag.toLowerCase().replace(/\s+/g, '_');
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${sanitizedTag}_${timestamp}.${extension}`;
    const filePath = `${config.basePath}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(config.bucket)
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(config.bucket)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    if (onProgress) {
      onProgress({ stage: 'uploading', progress: 60, message: 'Upload complete' });
    }

    // Stage 4: Validate photo quality using AI
    let validation: PhotoValidationResult | undefined;
    if (config.enableValidation) {
      try {
        if (onProgress) {
          onProgress({ stage: 'validating', progress: 70, message: 'Validating photo quality...' });
        }
        
        validation = await validateProofPhoto(urlData.publicUrl, tag as any);
      } catch (error) {
        console.error("Photo validation failed:", error);
        // Continue even if validation fails
      }
    }

    if (onProgress) {
      onProgress({ stage: 'saving', progress: 85, message: 'Saving to database...' });
    }

    // Stage 5: Save to database
    // Map PhotoTag to category (media_photos expects: Mounting, Display, Proof, Monitoring, General)
    const categoryMap: Record<PhotoTag, string> = {
      'Traffic': 'Proof',
      'Newspaper': 'Proof',
      'Geo-Tagged': 'Proof',
      'Other': 'General'
    };

    const { data: photoRecord, error: dbError } = await supabase
      .from('media_photos')
      .insert({
        asset_id: metadata.asset_id,
        campaign_id: metadata.campaign_id,
        client_id: metadata.client_id,
        photo_url: urlData.publicUrl,
        category: categoryMap[tag] || 'General',
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        metadata: {
          photo_tag: tag,
          photo_type: metadata.photo_type,
          latitude,
          longitude,
          validation_score: validation?.score,
          validation_issues: validation?.issues || [],
          validation_suggestions: validation?.suggestions || [],
          ...metadata
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Try to clean up uploaded file
      await supabase.storage.from(config.bucket).remove([filePath]);
      throw new Error(`Database save failed: ${dbError.message}`);
    }

    if (onProgress) {
      onProgress({ stage: 'complete', progress: 100, message: 'Upload complete!' });
    }

    return {
      id: photoRecord.id,
      url: urlData.publicUrl,
      tag,
      latitude,
      longitude,
      validation
    };
  } catch (error: any) {
    console.error("Error in uploadPhoto:", error);
    throw error;
  }
}

/**
 * Delete a photo from storage and database
 */
export async function deletePhoto(
  photoId: string,
  photoUrl: string,
  bucket: 'media-assets' | 'operations-photos'
): Promise<void> {
  try {
    // Extract file path from URL
    const urlParts = photoUrl.split(`/${bucket}/`);
    if (urlParts.length < 2) {
      throw new Error('Invalid photo URL format');
    }
    const filePath = urlParts[1];

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('media_photos')
      .delete()
      .eq('id', photoId);

    if (dbError) {
      throw new Error(`Database deletion failed: ${dbError.message}`);
    }
  } catch (error: any) {
    console.error("Error in deletePhoto:", error);
    throw error;
  }
}

/**
 * Batch upload multiple photos
 */
export async function uploadPhotoBatch(
  config: PhotoUploadConfig,
  files: File[],
  metadata: PhotoMetadata,
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<PhotoUploadResult[]> {
  const results: PhotoUploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      const result = await uploadPhoto(
        config,
        file,
        metadata,
        (progress) => {
          if (onProgress) {
            onProgress(i, progress);
          }
        }
      );
      
      results.push(result);
    } catch (error) {
      console.error(`Failed to upload file ${i + 1}:`, error);
      // Continue with next file even if one fails
    }
  }

  return results;
}
