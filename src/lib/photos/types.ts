/**
 * Shared types for photo management across the application
 */

export type PhotoType = 'asset_proof' | 'operations_proof' | 'maintenance' | 'inspection' | 'other';

export type PhotoTag = 'Traffic' | 'Newspaper' | 'Geo-Tagged' | 'Other';

export interface PhotoValidationResult {
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface PhotoMetadata {
  asset_id: string;
  campaign_id?: string;
  client_id?: string;
  photo_type: PhotoType;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

export interface PhotoUploadConfig {
  bucket: 'media-assets' | 'operations-photos';
  basePath: string;
  enableValidation: boolean;
  enableCompression: boolean;
  maxSizeMB?: number;
}

export interface PhotoUploadResult {
  id: string;
  url: string;
  tag: PhotoTag;
  latitude?: number;
  longitude?: number;
  validation?: PhotoValidationResult;
}

export interface UploadProgress {
  stage: 'analyzing' | 'compressing' | 'uploading' | 'validating' | 'saving' | 'complete';
  progress: number; // 0-100
  message?: string;
}
