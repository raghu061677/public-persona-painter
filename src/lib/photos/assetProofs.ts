/**
 * Asset proof photo uploads
 * Specialized wrapper for media asset proof photos
 */

import { uploadPhoto, uploadPhotoBatch, deletePhoto } from './core';
import type { PhotoUploadResult, UploadProgress } from './types';

/**
 * Upload a proof photo for a media asset
 * @param companyId - The company ID for multi-tenant isolation
 * @param assetId - The media asset ID
 * @param file - The image file to upload
 * @param onProgress - Optional progress callback
 */
export async function uploadAssetProof(
  companyId: string,
  assetId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<PhotoUploadResult> {
  return uploadPhoto(
    {
      bucket: 'media-assets',
      basePath: `${assetId}/proofs`,
      enableValidation: true,
      enableCompression: true,
      maxSizeMB: 10
    },
    file,
    {
      company_id: companyId,
      asset_id: assetId,
      photo_type: 'asset_proof'
    },
    onProgress
  );
}

/**
 * Upload multiple proof photos for a media asset
 * @param companyId - The company ID for multi-tenant isolation
 * @param assetId - The media asset ID
 * @param files - Array of image files to upload
 * @param onProgress - Optional progress callback with file index
 */
export async function uploadAssetProofBatch(
  companyId: string,
  assetId: string,
  files: File[],
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<PhotoUploadResult[]> {
  return uploadPhotoBatch(
    {
      bucket: 'media-assets',
      basePath: `${assetId}/proofs`,
      enableValidation: true,
      enableCompression: true,
      maxSizeMB: 10
    },
    files,
    {
      company_id: companyId,
      asset_id: assetId,
      photo_type: 'asset_proof'
    },
    onProgress
  );
}

/**
 * Delete an asset proof photo
 * @param photoId - The photo record ID from database
 * @param photoUrl - The photo URL from storage
 */
export async function deleteAssetProof(
  photoId: string,
  photoUrl: string
): Promise<void> {
  return deletePhoto(photoId, photoUrl, 'media-assets');
}
