/**
 * Centralized base64 storage utilities
 * Replaces Supabase Storage with base64 encoding to avoid RLS issues
 */

/**
 * Convert a file to base64 data URL
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => file.type.startsWith(type));
}

/**
 * Validate file size (in MB)
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Upload file as base64 (replaces storage upload)
 */
export async function uploadAsBase64(
  file: File,
  options?: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  }
): Promise<{ data: string; error: null } | { data: null; error: Error }> {
  try {
    // Validate file size
    const maxSize = options?.maxSizeMB || 5;
    if (!validateFileSize(file, maxSize)) {
      throw new Error(`File size must be less than ${maxSize}MB`);
    }

    // Validate file type
    if (options?.allowedTypes) {
      if (!validateFileType(file, options.allowedTypes)) {
        throw new Error(`File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}`);
      }
    }

    const base64 = await fileToBase64(file);
    return { data: base64, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get file extension from base64 data URL
 */
export function getExtensionFromBase64(base64: string): string | null {
  const match = base64.match(/^data:image\/(\w+);base64,/);
  return match ? match[1] : null;
}

/**
 * Check if string is a base64 data URL
 */
export function isBase64DataUrl(str: string): boolean {
  return str.startsWith('data:');
}
