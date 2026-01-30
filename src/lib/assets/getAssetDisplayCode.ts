/**
 * Get the display code for an asset.
 * 
 * Priority:
 * 1. media_asset_code (canonical human-readable code like HYD-BQS-0001)
 * 2. asset_id_readable (legacy readable ID if exists)
 * 3. Fallback: "ASSET-" + last 6 chars of UUID (temporary fallback)
 * 
 * NEVER display raw UUIDs as Asset Codes in the UI.
 */
export function getAssetDisplayCode(
  assetRecord: {
    media_asset_code?: string | null;
    asset_code?: string | null; // Alternative field name
    asset_id_readable?: string | null;
  } | null | undefined,
  fallbackId?: string | null
): string {
  if (!assetRecord && !fallbackId) {
    return 'UNKNOWN';
  }

  // Priority 1: media_asset_code (canonical format like HYD-BQS-0001)
  if (assetRecord?.media_asset_code) {
    return assetRecord.media_asset_code;
  }

  // Priority 1b: asset_code (alternative field name used in some contexts)
  if (assetRecord?.asset_code) {
    return assetRecord.asset_code;
  }

  // Priority 2: asset_id_readable (legacy readable format)
  if (assetRecord?.asset_id_readable) {
    return assetRecord.asset_id_readable;
  }

  // Priority 3: Fallback with last 6 chars of UUID
  if (fallbackId) {
    // Check if fallbackId looks like a readable code already (not a UUID)
    // UUIDs are 36 chars with hyphens in specific positions
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fallbackId);
    
    if (!isUUID) {
      // It's already a readable code, return it
      return fallbackId;
    }
    
    // Extract last 6 chars from UUID for fallback
    const shortId = fallbackId.replace(/-/g, '').slice(-6).toUpperCase();
    return `ASSET-${shortId}`;
  }

  return 'UNKNOWN';
}

/**
 * Resolve asset display code from campaign_asset record.
 * Handles the common case where we have campaign_assets joined with media_assets.
 */
export function resolveAssetDisplayCode(
  campaignAsset: {
    asset_id?: string | null;
    media_assets?: {
      media_asset_code?: string | null;
      asset_code?: string | null;
      asset_id_readable?: string | null;
    } | null;
  } | null | undefined
): string {
  if (!campaignAsset) {
    return 'UNKNOWN';
  }

  // If we have joined media_assets data, use it
  if (campaignAsset.media_assets) {
    return getAssetDisplayCode(campaignAsset.media_assets, campaignAsset.asset_id);
  }

  // Fallback to asset_id (which might be readable or UUID)
  return getAssetDisplayCode(null, campaignAsset.asset_id);
}
