import * as exifr from "exifr";
import { supabase } from "@/integrations/supabase/client";
import { validateProofPhoto } from "@/lib/photoValidation";

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
 * Analyze image to detect tag and extract GPS data
 */
export async function analyzeImage(file: File): Promise<{
  tag: string;
  latitude: number | null;
  longitude: number | null;
}> {
  let exif: any = null;
  
  try {
    exif = await exifr.parse(file, {
      gps: true,
      pick: ['latitude', 'longitude']
    });
  } catch (error) {
    console.log('No EXIF data found:', error);
  }

  const originalName = file.name.toLowerCase();

  let tag = "Other";

  // Auto-detect tag based on filename
  if (originalName.includes("traffic") || originalName.includes("road")) {
    tag = "Traffic";
  } else if (originalName.includes("news") || originalName.includes("paper") || originalName.includes("newspaper")) {
    tag = "Newspaper";
  } else if (originalName.includes("geo") || originalName.includes("gps") || originalName.includes("location") || originalName.includes("map")) {
    tag = "Geo-Tagged";
  } else if (exif?.latitude) {
    // If GPS data exists, auto-tag as Geo-Tagged
    tag = "Geo-Tagged";
  }

  return {
    tag,
    latitude: exif?.latitude || null,
    longitude: exif?.longitude || null
  };
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
      // Step 1: Analyze image (10%)
      if (onProgress) onProgress(i, 10);
      const { tag, latitude, longitude } = await analyzeImage(file);

      // Step 2: Generate unique filename (20%)
      if (onProgress) onProgress(i, 20);
      const timestamp = Date.now();
      const sanitizedTag = tag.toLowerCase().replace(/\s+/g, '_');
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `${timestamp}_${sanitizedTag}.${extension}`;
      const filePath = `${campaignId}/${assetId}/${fileName}`;

      // Step 3: Upload to Supabase Storage (50%)
      if (onProgress) onProgress(i, 30);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('operations-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Step 4: Get public URL (60%)
      if (onProgress) onProgress(i, 60);
      const { data: urlData } = supabase.storage
        .from('operations-photos')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) throw new Error('Failed to get public URL');

      // Step 5: Validate photo with AI (80%)
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
        // Continue even if validation fails
      }

      if (onProgress) onProgress(i, 85);

      // Step 6: Save to database (95%)
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
        // Try to cleanup uploaded file
        await supabase.storage.from('operations-photos').remove([filePath]);
        throw dbError;
      }

      // Step 7: Complete (100%)
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
 * Delete an operations proof photo
 */
export async function deleteOperationsProof(
  photoId: string,
  photoUrl: string
): Promise<void> {
  // Extract file path from URL
  const urlParts = photoUrl.split('/operations-photos/');
  if (urlParts.length < 2) throw new Error('Invalid photo URL');
  
  const filePath = urlParts[1].split('?')[0]; // Remove query params

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('operations-photos')
    .remove([filePath]);

  if (storageError) throw storageError;

  // Delete from database
  const { error: dbError } = await supabase
    .from('operations_photos')
    .delete()
    .eq('id', photoId);

  if (dbError) throw dbError;
}
