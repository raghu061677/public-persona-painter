import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a signed URL for private storage objects
 * @param bucket - Storage bucket name
 * @param path - Path to the file in the bucket
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL or null if failed
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Failed to generate signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error generating signed URL:', err);
    return null;
  }
}

/**
 * Generate multiple signed URLs at once
 * @param bucket - Storage bucket name
 * @param paths - Array of file paths
 * @param expiresIn - Expiration time in seconds
 * @returns Array of signed URLs (null for failed ones)
 */
export async function getSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn: number = 3600
): Promise<(string | null)[]> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(paths, expiresIn);

    if (error) {
      console.error('Failed to generate signed URLs:', error);
      return paths.map(() => null);
    }

    return data.map(item => item.signedUrl);
  } catch (err) {
    console.error('Error generating signed URLs:', err);
    return paths.map(() => null);
  }
}

/**
 * Get public URL for public storage objects
 * @param bucket - Storage bucket name
 * @param path - Path to the file in the bucket
 * @returns Public URL
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
