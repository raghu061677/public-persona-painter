/**
 * Availability Engine — Public API
 *
 * Import from '@/lib/availability' for all booking/vacancy logic.
 *
 * Two layers:
 *  1. asset_availability_view (SQL) — unified view combining campaigns + holds
 *  2. assetAvailabilityEngine (TS) — application-level wrapper with batch, tooltip, range queries
 *
 * Legacy getAssetAvailability is kept for backward compat but new code should
 * prefer the *FromView variants from assetAvailabilityEngine.
 */

export { datesOverlap, dateInRange, rangeContains, toDateString } from './dateOverlap';
export {
  getAssetAvailability,
  batchGetAssetAvailability,
  getCompanyAvailabilityCounts,
  type BookingAvailability,
  type BookingSource,
  type AssetAvailabilityResult,
} from './getAssetAvailability';
export {
  syncMediaAssetBookingState,
  syncMultipleMediaAssetBookingStates,
  getAssetBookingTooltip,
  type SyncResult,
} from './syncAssetStatus';
export {
  getActiveAssets,
  getDroppedAssets,
  computeCampaignAssetCounts,
  computeAssetBookingWindow,
  type CampaignAssetRecord,
  type CampaignAssetCounts,
} from './campaignAssetHelpers';

// ─── Unified Availability Engine (NEW — powered by asset_availability_view) ───
export {
  getAssetAvailabilityFromView,
  getAssetAvailabilityBatch,
  getAvailableAssetsForRange,
  getAssetBookingTooltipFromView,
  type AvailabilityStatus,
  type BookingType,
  type AssetAvailabilityRow,
  type AssetAvailabilitySummary,
} from './assetAvailabilityEngine';
