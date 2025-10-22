// Utility functions for campaigns

/**
 * Generate campaign ID by calling database function
 */
export async function generateCampaignId(supabase: any): Promise<string> {
  const { data, error } = await supabase.rpc('generate_campaign_id');
  
  if (error) {
    console.error('Error generating campaign ID:', error);
    // Fallback to client-side generation
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `CAM-${year}-${month}-${random}`;
  }
  
  return data;
}

/**
 * Get status color for campaign badges
 */
export function getCampaignStatusColor(status: string): string {
  switch (status) {
    case 'Planned':
      return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
    case 'Assigned':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    case 'InProgress':
      return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
    case 'PhotoUploaded':
      return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
    case 'Verified':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'Completed':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Get status color for asset installation
 */
export function getAssetStatusColor(status: string): string {
  switch (status) {
    case 'Pending':
      return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
    case 'Assigned':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    case 'Mounted':
      return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
    case 'PhotoUploaded':
      return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
    case 'Verified':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Calculate campaign progress percentage
 */
export function calculateProgress(totalAssets: number, completedAssets: number): number {
  if (totalAssets === 0) return 0;
  return Math.round((completedAssets / totalAssets) * 100);
}

/**
 * Check if all required photos are uploaded for an asset
 */
export function hasAllPhotos(photos: any): boolean {
  return !!(
    photos?.newspaperPhoto?.url &&
    photos?.geoTaggedPhoto?.url &&
    photos?.trafficPhoto1?.url &&
    photos?.trafficPhoto2?.url
  );
}

/**
 * Validate photo file
 */
export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 8 * 1024 * 1024; // 8MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPG and PNG images are allowed' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'Image size must be less than 8MB' };
  }
  
  return { valid: true };
}
