/**
 * Workflow Validation Utilities
 * Validates status transitions using actual database enum values
 */

// Import actual types from database
import type { Database } from "@/integrations/supabase/types";

export type CampaignStatus = Database['public']['Enums']['campaign_status'];
export type AssetStatus = Database['public']['Enums']['asset_installation_status'];

/**
 * Checks if campaign can be started (moved to InProgress)
 */
export function canStartCampaign(campaign: any): { can: boolean; reason?: string } {
  if (campaign.status !== 'Planned') {
    return { can: false, reason: 'Campaign must be Planned to start' };
  }

  const today = new Date();
  const startDate = new Date(campaign.start_date);

  if (startDate > today) {
    return { can: false, reason: `Campaign start date is ${startDate.toLocaleDateString()}` };
  }

  return { can: true };
}

/**
 * Checks if campaign can be completed
 */
export function canCompleteCampaign(campaign: any, assets: any[]): { can: boolean; reason?: string } {
  if (campaign.status !== 'InProgress' && campaign.status !== 'Verified') {
    return { can: false, reason: 'Campaign must be in progress to complete' };
  }

  const allVerified = assets.every(asset => asset.status === 'Verified');
  if (!allVerified) {
    const unverifiedCount = assets.filter(a => a.status !== 'Verified').length;
    return { 
      can: false, 
      reason: `${unverifiedCount} asset(s) not yet verified` 
    };
  }

  return { can: true };
}

/**
 * Checks if asset can have proof uploaded
 */
export function canUploadProof(asset: any): { can: boolean; reason?: string } {
  if (asset.status !== 'Mounted') {
    return { 
      can: false, 
      reason: `Asset must be mounted first (current: ${asset.status})` 
    };
  }

  return { can: true };
}

/**
 * Validates proof completeness (all 4 photos)
 */
export function validateProofCompleteness(photos: any): { valid: boolean; missing?: string[] } {
  const requiredPhotos = ['newspaper', 'geotagged', 'trafficPhoto1', 'trafficPhoto2'];
  const missing = requiredPhotos.filter(type => !photos?.[type]);

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}
