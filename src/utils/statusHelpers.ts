import type { Database } from "@/integrations/supabase/types";

export type CampaignStatus = Database['public']['Enums']['campaign_status'];
export type AssetInstallationStatus = Database['public']['Enums']['asset_installation_status'];
export type MediaAssetStatus = Database['public']['Enums']['media_asset_status'];

/**
 * Campaign Status Display Configuration
 */
export const campaignStatusConfig: Record<CampaignStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  description: string;
}> = {
  'Draft': {
    label: 'Draft',
    variant: 'secondary',
    description: 'Campaign is being prepared'
  },
  'Upcoming': {
    label: 'Upcoming',
    variant: 'default',
    description: 'Scheduled to start soon'
  },
  'Running': {
    label: 'Running',
    variant: 'default',
    description: 'Currently active'
  },
  'Completed': {
    label: 'Completed',
    variant: 'secondary',
    description: 'Campaign has ended'
  },
  'Cancelled': {
    label: 'Cancelled',
    variant: 'destructive',
    description: 'Campaign was cancelled'
  },
  'Archived': {
    label: 'Archived',
    variant: 'outline',
    description: 'Archived for records'
  },
  // Legacy values (still in DB during migration)
  'Planned': {
    label: 'Planned',
    variant: 'secondary',
    description: 'Being planned'
  },
  'Assigned': {
    label: 'Assigned',
    variant: 'default',
    description: 'Team assigned'
  },
  'InProgress': {
    label: 'In Progress',
    variant: 'default',
    description: 'Work ongoing'
  },
  'PhotoUploaded': {
    label: 'Photo Uploaded',
    variant: 'default',
    description: 'Proof uploaded'
  },
  'Verified': {
    label: 'Verified',
    variant: 'default',
    description: 'Verification complete'
  }
};

/**
 * Asset Installation Status Display Configuration
 */
export const assetInstallationStatusConfig: Record<AssetInstallationStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  description: string;
}> = {
  'Pending': {
    label: 'Pending',
    variant: 'secondary',
    description: 'Awaiting assignment'
  },
  'Assigned': {
    label: 'Assigned',
    variant: 'default',
    description: 'Assigned to team'
  },
  'In Progress': {
    label: 'In Progress',
    variant: 'default',
    description: 'Installation ongoing'
  },
  'Installed': {
    label: 'Installed',
    variant: 'default',
    description: 'Installation complete'
  },
  'QA Pending': {
    label: 'QA Pending',
    variant: 'outline',
    description: 'Awaiting quality check'
  },
  'Completed': {
    label: 'Completed',
    variant: 'default',
    description: 'Fully verified and complete'
  },
  'Failed': {
    label: 'Failed',
    variant: 'destructive',
    description: 'Installation failed'
  },
  // Legacy values
  'Mounted': {
    label: 'Mounted',
    variant: 'default',
    description: 'Mounted on site'
  },
  'PhotoUploaded': {
    label: 'Photo Uploaded',
    variant: 'default',
    description: 'Proof submitted'
  },
  'Verified': {
    label: 'Verified',
    variant: 'default',
    description: 'Verified'
  }
};

/**
 * Media Asset Status Display Configuration
 */
export const mediaAssetStatusConfig: Record<MediaAssetStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  description: string;
}> = {
  'Available': {
    label: 'Available',
    variant: 'default',
    description: 'Ready for booking'
  },
  'Booked': {
    label: 'Booked',
    variant: 'outline',
    description: 'Currently booked'
  },
  'Blocked': {
    label: 'Blocked',
    variant: 'destructive',
    description: 'Temporarily unavailable'
  },
  'Under Maintenance': {
    label: 'Under Maintenance',
    variant: 'secondary',
    description: 'Being repaired'
  },
  'Expired': {
    label: 'Expired',
    variant: 'secondary',
    description: 'No longer in inventory'
  },
  // Legacy value
  'Maintenance': {
    label: 'Maintenance',
    variant: 'secondary',
    description: 'Under maintenance'
  }
};

/**
 * Get status badge configuration
 */
export function getCampaignStatusBadge(status: CampaignStatus) {
  return campaignStatusConfig[status] || campaignStatusConfig['Draft'];
}

export function getAssetInstallationStatusBadge(status: AssetInstallationStatus) {
  return assetInstallationStatusConfig[status] || assetInstallationStatusConfig['Pending'];
}

export function getMediaAssetStatusBadge(status: MediaAssetStatus) {
  return mediaAssetStatusConfig[status] || mediaAssetStatusConfig['Available'];
}