/**
 * Status Normalizer — delegates to the canonical campaignAssetStatus config.
 * Kept for backward compatibility; prefer importing from campaignAssetStatus directly.
 */

import { normalizeCampaignAssetStatus } from "@/lib/constants/campaignAssetStatus";

export function normalizeInstallationStatus(status: string | null | undefined): string {
  return normalizeCampaignAssetStatus(status);
}

/**
 * Check if a status represents the "installed/mounted" state.
 * Handles both canonical "Installed" and legacy "Mounted".
 */
export function isInstalledStatus(status: string | null | undefined): boolean {
  return normalizeCampaignAssetStatus(status) === "Installed";
}
