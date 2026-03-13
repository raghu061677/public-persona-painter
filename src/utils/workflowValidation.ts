/**
 * Workflow Validation Utilities
 * Uses canonical campaign asset statuses from shared config.
 *
 * NOTE (2026-03): Campaign lifecycle rules are centralized in
 * src/lib/constants/campaignLifecycle.ts. This file handles
 * operational/asset-level validation only.
 * Invoices are NEVER generated from campaign status transitions.
 */

import type { Database } from "@/integrations/supabase/types";
import { normalizeCampaignAssetStatus, isCampaignAssetStatusAtLeast } from "@/lib/constants/campaignAssetStatus";

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

  const allVerified = assets.every(asset => normalizeCampaignAssetStatus(asset.status) === 'Verified');
  if (!allVerified) {
    const unverifiedCount = assets.filter(a => normalizeCampaignAssetStatus(a.status) !== 'Verified').length;
    return { 
      can: false, 
      reason: `${unverifiedCount} asset(s) not yet verified` 
    };
  }

  return { can: true };
}

/**
 * Checks if asset can have proof uploaded.
 * Asset must be at least at "Installed" status.
 */
export function canUploadProof(asset: any): { can: boolean; reason?: string } {
  const normalized = normalizeCampaignAssetStatus(asset.status);
  if (!isCampaignAssetStatusAtLeast(normalized, 'Installed')) {
    return { 
      can: false, 
      reason: `Asset must be installed first (current: ${normalized})` 
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
