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
 * Fetch QR code URL and coordinates for an asset
 * Used for applying QR watermark at upload time
 */
async function fetchAssetQRInfo(assetId: string): Promise<{
  qrCodeUrl: string | null;
  latitude: number | null;
  longitude: number | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from('media_assets')
      .select('qr_code_url, latitude, longitude')
      .eq('id', assetId)
      .single();

    if (error || !data) {
      console.warn('Could not fetch QR info for asset:', assetId);
      return null;
    }

    return {
      qrCodeUrl: data.qr_code_url,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    console.warn('Error fetching asset QR info:', error);
    return null;
  }
}

/**
 * Apply QR code watermark to a file
 * Returns a new File with the QR watermark applied
 */
async function applyQRWatermarkToFile(
  file: File,
  qrCodeUrl: string
): Promise<File> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create object URL for the file
      const fileUrl = URL.createObjectURL(file);
      
      // Create main image
      const mainImage = new Image();
      mainImage.crossOrigin = 'anonymous';
      
      // Create QR image
      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';

      const loadImage = (img: HTMLImageElement, src: string): Promise<void> => {
        return new Promise((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error(`Failed to load image: ${src}`));
          img.src = src;
        });
      };

      // Load both images in parallel
      await Promise.all([
        loadImage(mainImage, fileUrl),
        loadImage(qrImage, qrCodeUrl),
      ]);

      // Clean up object URL
      URL.revokeObjectURL(fileUrl);

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = mainImage.naturalWidth;
      canvas.height = mainImage.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      // Draw main image
      ctx.drawImage(mainImage, 0, 0);

      // QR watermark settings
      const qrSize = 80;
      const padding = 12;
      const opacity = 0.9;

      // Calculate QR position (bottom-right with padding)
      const qrX = canvas.width - qrSize - padding;
      const qrY = canvas.height - qrSize - padding;

      // Draw white background for QR (for better scanning)
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);

      // Draw QR code
      ctx.globalAlpha = opacity;
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
      ctx.globalAlpha = 1;

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from canvas'));
          return;
        }

        // Create new file with watermark
        const watermarkedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        resolve(watermarkedFile);
      }, 'image/jpeg', 0.92);
    } catch (error) {
      console.warn('QR watermark failed, using original file:', error);
      // Return original file if watermarking fails
      resolve(file);
    }
  });
}

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
 * Now applies QR watermark at upload time
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
        onProgress({ stage: 'compressing', progress: 20, message: 'Compressing image...' });
      }
      
      try {
        const compressionSettings = getOptimalCompressionSettings(file);
        fileToUpload = await compressImage(file, compressionSettings);
      } catch (error) {
        console.warn('Compression failed, using original file:', error);
        // Continue with original file if compression fails
      }
    }

    // Stage 3: Apply QR watermark if asset_id is provided
    if (metadata.asset_id) {
      if (onProgress) {
        onProgress({ stage: 'watermarking', progress: 30, message: 'Adding QR watermark...' });
      }
      
      try {
        const qrInfo = await fetchAssetQRInfo(metadata.asset_id);
        if (qrInfo?.qrCodeUrl) {
          fileToUpload = await applyQRWatermarkToFile(fileToUpload, qrInfo.qrCodeUrl);
          console.log('QR watermark applied successfully');
        } else {
          console.log('No QR code found for asset, skipping watermark');
        }
      } catch (error) {
        console.warn('QR watermark failed, continuing without watermark:', error);
        // Continue without watermark if it fails
      }
    }

    // Stage 4: Generate unique filename and upload with company isolation
    if (onProgress) {
      onProgress({ stage: 'uploading', progress: 45, message: 'Uploading to storage...' });
    }

    const timestamp = Date.now();
    const sanitizedTag = tag.toLowerCase().replace(/\s+/g, '_');
    const extension = 'jpg'; // Always save as JPEG since watermarking converts to JPEG
    const fileName = `${sanitizedTag}_${timestamp}.${extension}`;
    // Include company_id in storage path for proper multi-tenant isolation
    const filePath = `${metadata.company_id}/${config.basePath}/${fileName}`;

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

    // Stage 5: Validate photo quality using AI
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

    // Stage 6: Save to database
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
        company_id: metadata.company_id,
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

    // Add timeline entry for campaign photo uploads
    if (metadata.campaign_id && metadata.company_id) {
      try {
        await supabase
          .from('campaign_timeline')
          .insert({
            campaign_id: metadata.campaign_id,
            company_id: metadata.company_id,
            event_type: 'photo_uploaded',
            event_title: `Photo Uploaded: ${tag}`,
            event_description: `Proof photo uploaded for asset ${metadata.asset_id}`,
            event_time: new Date().toISOString(),
            created_by: (await supabase.auth.getUser()).data.user?.id,
            metadata: {
              asset_id: metadata.asset_id,
              photo_tag: tag,
              photo_url: urlData.publicUrl,
              latitude,
              longitude
            }
          });
      } catch (timelineError) {
        console.warn('Failed to create timeline entry:', timelineError);
        // Don't fail the upload if timeline entry fails
      }
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
  bucket: 'media-assets' | 'operations-photos' | 'campaign-proofs'
): Promise<void> {
  try {
    // Try to extract file path from URL - support multiple bucket formats
    let filePath: string | null = null;
    let actualBucket: string = bucket;

    // List of possible buckets to check in order
    const bucketsToCheck = [bucket, 'media-assets', 'campaign-proofs', 'operations-photos'];
    
    for (const b of bucketsToCheck) {
      const pattern = `/${b}/`;
      if (photoUrl.includes(pattern)) {
        const parts = photoUrl.split(pattern);
        if (parts.length >= 2) {
          filePath = parts[1];
          actualBucket = b;
          break;
        }
      }
    }

    // If still no match, try to extract path after /object/public/ or /object/sign/
    if (!filePath) {
      const publicMatch = photoUrl.match(/\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
      if (publicMatch) {
        actualBucket = publicMatch[1];
        filePath = publicMatch[2];
      }
    }

    // Delete from storage if we have a valid path
    if (filePath && actualBucket) {
      const { error: storageError } = await supabase.storage
        .from(actualBucket)
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue to delete from database even if storage deletion fails
      }
    } else {
      console.warn('Could not extract file path from URL, skipping storage deletion:', photoUrl);
    }

    // Always delete from database
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
