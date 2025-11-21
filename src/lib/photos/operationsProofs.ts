/**
 * Operations proof photo uploads
 * Specialized wrapper for campaign operations proof photos
 */

import { uploadPhoto, uploadPhotoBatch, deletePhoto } from './core';
import type { PhotoUploadResult, UploadProgress } from './types';

/**
 * Upload a proof photo for campaign operations
 * @param companyId - The company ID for multi-tenant isolation
 * @param campaignId - The campaign ID
 * @param assetId - The asset ID within the campaign
 * @param file - The image file to upload
 * @param onProgress - Optional progress callback
 */
export async function uploadOperationsProof(
  companyId: string,
  campaignId: string,
  assetId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<PhotoUploadResult> {
  return uploadPhoto(
    {
      bucket: 'operations-photos',
      basePath: `${campaignId}/${assetId}`,
      enableValidation: true,
      enableCompression: true,
      maxSizeMB: 10
    },
    file,
    {
      company_id: companyId,
      asset_id: assetId,
      campaign_id: campaignId,
      photo_type: 'operations_proof'
    },
    onProgress
  );
}

/**
 * Upload multiple proof photos for campaign operations
 * @param companyId - The company ID for multi-tenant isolation
 * @param campaignId - The campaign ID
 * @param assetId - The asset ID within the campaign
 * @param files - Array of image files to upload
 * @param onProgress - Optional progress callback with file index
 */
export async function uploadOperationsProofBatch(
  companyId: string,
  campaignId: string,
  assetId: string,
  files: File[],
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<PhotoUploadResult[]> {
  return uploadPhotoBatch(
    {
      bucket: 'operations-photos',
      basePath: `${campaignId}/${assetId}`,
      enableValidation: true,
      enableCompression: true,
      maxSizeMB: 10
    },
    files,
    {
      company_id: companyId,
      asset_id: assetId,
      campaign_id: campaignId,
      photo_type: 'operations_proof'
    },
    onProgress
  );
}

/**
 * Delete an operations proof photo
 * @param photoId - The photo record ID from database
 * @param photoUrl - The photo URL from storage
 */
export async function deleteOperationsProof(
  photoId: string,
  photoUrl: string
): Promise<void> {
  return deletePhoto(photoId, photoUrl, 'operations-photos');
}
