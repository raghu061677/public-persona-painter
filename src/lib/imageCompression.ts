import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  preserveExif?: boolean;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  quality: 0.8,
  preserveExif: true,
};

/**
 * Compress an image file to reduce size while maintaining quality
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  try {
    console.log(`Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    const compressedFile = await imageCompression(file, {
      maxSizeMB: mergedOptions.maxSizeMB!,
      maxWidthOrHeight: mergedOptions.maxWidthOrHeight!,
      useWebWorker: true,
      initialQuality: mergedOptions.quality!,
      preserveExif: mergedOptions.preserveExif!,
    });

    const originalSize = file.size / 1024 / 1024;
    const compressedSize = compressedFile.size / 1024 / 1024;
    const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(
      `Compressed: ${file.name}\n` +
      `Original: ${originalSize.toFixed(2)}MB → Compressed: ${compressedSize.toFixed(2)}MB\n` +
      `Reduction: ${reduction}%`
    );

    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return file;
  }
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (index: number, progress: number) => void
): Promise<File[]> {
  const results: File[] = [];

  for (let i = 0; i < files.length; i++) {
    if (onProgress) onProgress(i, 0);
    
    const compressedFile = await compressImage(files[i], options);
    results.push(compressedFile);
    
    if (onProgress) onProgress(i, 100);
  }

  return results;
}

/**
 * Generate a thumbnail from an image file
 */
export async function generateThumbnail(
  file: File,
  maxSize: number = 200
): Promise<File> {
  return compressImage(file, {
    maxSizeMB: 0.1,
    maxWidthOrHeight: maxSize,
    quality: 0.7,
    preserveExif: false,
  });
}

/**
 * Check if a file needs compression
 */
export function shouldCompress(file: File, maxSizeMB: number = 1): boolean {
  const fileSizeMB = file.size / 1024 / 1024;
  return fileSizeMB > maxSizeMB;
}

/**
 * Get optimized compression settings based on file size
 */
export function getOptimalCompressionSettings(file: File): CompressionOptions {
  const fileSizeMB = file.size / 1024 / 1024;

  if (fileSizeMB > 10) {
    // Large files: aggressive compression
    return {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      quality: 0.75,
      preserveExif: true,
    };
  } else if (fileSizeMB > 5) {
    // Medium files: moderate compression
    return {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      quality: 0.8,
      preserveExif: true,
    };
  } else if (fileSizeMB > 2) {
    // Small-medium files: light compression
    return {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 2048,
      quality: 0.85,
      preserveExif: true,
    };
  } else {
    // Small files: minimal compression
    return {
      maxSizeMB: 2,
      maxWidthOrHeight: 2048,
      quality: 0.9,
      preserveExif: true,
    };
  }
}
