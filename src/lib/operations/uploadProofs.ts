import * as exifr from "exifr";
import { supabase } from "@/integrations/supabase/client";
import { validateProofPhoto } from "@/lib/photoValidation";
import { compressImage, getOptimalCompressionSettings } from "@/lib/imageCompression";

export interface ProofPhoto {
  tag: "Traffic" | "Newspaper" | "Geo-Tagged" | "Other";
  latitude: number | null;
  longitude: number | null;
  validation?: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
}

export interface ProofPhotoResult {
  url: string;
  tag: string;
  latitude?: number;
  longitude?: number;
  validationScore?: number;
  validationIssues?: string[];
  validationSuggestions?: string[];
}

/**
 * Analyze image file to detect tag and extract GPS data
 */
export async function analyzeImage(file: File): Promise<ProofPhoto> {
  try {
    // Extract EXIF data
    const exif = await exifr.parse(file).catch(() => null);
    
    // Get filename for keyword detection
    const originalName = file.name.toLowerCase();
    
    // Determine tag based on filename or EXIF GPS
    let tag: ProofPhoto["tag"] = "Other";
    
    if (originalName.includes("traffic")) {
      tag = "Traffic";
    } else if (originalName.includes("news") || originalName.includes("paper")) {
      tag = "Newspaper";
    } else if (originalName.includes("geo") || originalName.includes("gps") || originalName.includes("location")) {
      tag = "Geo-Tagged";
    } else if (exif?.latitude && exif?.longitude) {
      tag = "Geo-Tagged";
    }
    
    return {
      tag,
      latitude: exif?.latitude || null,
      longitude: exif?.longitude || null,
    };
  } catch (error) {
    console.error("Error analyzing image:", error);
    return {
      tag: "Other",
      latitude: null,
      longitude: null,
    };
  }
}

/**
 * Upload proof photo to Supabase Storage and save metadata to database
 */
export async function uploadProofPhoto(
  campaignId: string,
  assetId: string,
  file: File,
  uploadedBy: string
): Promise<{ success: boolean; error?: string; photoId?: string }> {
  try {
    // Analyze the image first
    const analysis = await analyzeImage(file);
    
    // Generate unique filename with timestamp and tag
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}_${analysis.tag}.${fileExt}`;
    const filePath = `${campaignId}/${assetId}/${fileName}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('operations-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('operations-photos')
      .getPublicUrl(filePath);
    
    // Save metadata to database
    const { data: photoRecord, error: dbError } = await supabase
      .from('operations_photos')
      .insert({
        campaign_id: campaignId,
        asset_id: assetId,
        tag: analysis.tag,
        photo_url: publicUrl,
        latitude: analysis.latitude,
        longitude: analysis.longitude,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();
    
    if (dbError) {
      console.error("Database error:", dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('operations-photos').remove([filePath]);
      return { success: false, error: dbError.message };
    }
    
    console.log("Photo uploaded successfully:", photoRecord);
    
    // Also save to media_photos for centralized gallery
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('client_id')
      .eq('id', campaignId)
      .single();

    await supabase.from('media_photos').insert({
      asset_id: assetId,
      campaign_id: campaignId,
      client_id: campaignData?.client_id,
      photo_url: publicUrl,
      category: analysis.tag.toLowerCase() === 'newspaper' ? 'Proof' : 'Mounting',
      uploaded_by: uploadedBy,
    });
    
    // Note: Notifications disabled for now
    
    return { 
      success: true, 
      photoId: photoRecord.id 
    };
    
  } catch (error: any) {
    console.error("Error in uploadProofPhoto:", error);
    return { 
      success: false, 
      error: error.message || "Unknown error occurred" 
    };
  }
}

/**
 * Upload multiple proof photos for an operations asset
 */
export async function uploadOperationsProofs(
  campaignId: string,
  assetId: string,
  files: File[],
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<ProofPhotoResult[]> {
  const results: ProofPhotoResult[] = [];
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      // Step 1: Compress image
      if (onProgress) onProgress(i, 5);
      const compressionSettings = getOptimalCompressionSettings(file);
      const compressedFile = await compressImage(file, compressionSettings);
      
      // Step 2: Analyze image
      if (onProgress) onProgress(i, 15);
      const { tag, latitude, longitude } = await analyzeImage(compressedFile);

      // Step 3: Generate filename
      if (onProgress) onProgress(i, 25);
      const timestamp = Date.now();
      const sanitizedTag = tag.toLowerCase().replace(/\s+/g, '_');
      const extension = compressedFile.name.split('.').pop() || 'jpg';
      const fileName = `${timestamp}_${sanitizedTag}.${extension}`;
      const filePath = `${campaignId}/${assetId}/${fileName}`;

      // Step 4: Upload to storage
      if (onProgress) onProgress(i, 35);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('operations-photos')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Step 4: Get public URL
      if (onProgress) onProgress(i, 60);
      const { data: urlData } = supabase.storage
        .from('operations-photos')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) throw new Error('Failed to get public URL');

      // Step 5: Validate photo with AI (optional)
      if (onProgress) onProgress(i, 70);
      let validationScore: number | undefined;
      let validationIssues: string[] = [];
      let validationSuggestions: string[] = [];

      try {
        const validation = await validateProofPhoto(urlData.publicUrl, tag as any);
        validationScore = validation.score;
        validationIssues = validation.issues;
        validationSuggestions = validation.suggestions;
      } catch (error) {
        console.error("Photo validation failed:", error);
      }

      if (onProgress) onProgress(i, 85);

      // Step 6: Save to database
      const { error: dbError } = await supabase
        .from('operations_photos')
        .insert({
          campaign_id: campaignId,
          asset_id: assetId,
          tag,
          photo_url: urlData.publicUrl,
          latitude,
          longitude,
          uploaded_by: user.id,
          validation_score: validationScore,
          validation_issues: validationIssues,
          validation_suggestions: validationSuggestions,
        });

      if (dbError) {
        await supabase.storage.from('operations-photos').remove([filePath]);
        throw dbError;
      }

      if (onProgress) onProgress(i, 100);

      results.push({
        url: urlData.publicUrl,
        tag,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        validationScore,
        validationIssues,
        validationSuggestions,
      });

    } catch (error) {
      console.error(`Failed to upload file ${file.name}:`, error);
      throw error;
    }
  }

  return results;
}

/**
 * Delete a proof photo (admin only)
 */
export async function deleteProofPhoto(
  photoId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: photo, error: fetchError } = await supabase
      .from('operations_photos')
      .select('photo_url, campaign_id, asset_id')
      .eq('id', photoId)
      .single();
    
    if (fetchError || !photo) {
      return { success: false, error: "Photo not found" };
    }
    
    const urlParts = photo.photo_url.split('/operations-photos/');
    const filePath = urlParts[1];
    
    const { error: storageError } = await supabase.storage
      .from('operations-photos')
      .remove([filePath]);
    
    if (storageError) {
      console.error("Storage deletion error:", storageError);
    }
    
    const { error: dbError } = await supabase
      .from('operations_photos')
      .delete()
      .eq('id', photoId);
    
    if (dbError) {
      return { success: false, error: dbError.message };
    }
    
    return { success: true };
    
  } catch (error: any) {
    console.error("Error in deleteProofPhoto:", error);
    return { 
      success: false, 
      error: error.message || "Unknown error occurred" 
    };
  }
}

/**
 * Delete an operations proof photo
 */
export async function deleteOperationsProof(
  photoId: string,
  photoUrl: string
): Promise<void> {
  const urlParts = photoUrl.split('/operations-photos/');
  if (urlParts.length < 2) throw new Error('Invalid photo URL');
  
  const filePath = urlParts[1].split('?')[0];

  const { error: storageError } = await supabase.storage
    .from('operations-photos')
    .remove([filePath]);

  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from('operations_photos')
    .delete()
    .eq('id', photoId);

  if (dbError) throw dbError;
}