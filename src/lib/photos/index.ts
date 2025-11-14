/**
 * Unified photo management system
 * Central export for all photo-related functionality
 */

// Core functions
export {
  uploadPhoto,
  deletePhoto,
  uploadPhotoBatch,
  detectPhotoTag
} from './core';

// Asset-specific functions
export {
  uploadAssetProof,
  uploadAssetProofBatch,
  deleteAssetProof
} from './assetProofs';

// Operations-specific functions
export {
  uploadOperationsProof,
  uploadOperationsProofBatch,
  deleteOperationsProof
} from './operationsProofs';

// Types
export type {
  PhotoType,
  PhotoTag,
  PhotoValidationResult,
  PhotoMetadata,
  PhotoUploadConfig,
  PhotoUploadResult,
  UploadProgress
} from './types';
