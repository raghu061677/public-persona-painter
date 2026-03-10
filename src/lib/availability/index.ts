/**
 * Availability Engine — Public API
 *
 * Import from '@/lib/availability' for all booking/vacancy logic.
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
