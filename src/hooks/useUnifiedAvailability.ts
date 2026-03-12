/**
 * useUnifiedAvailability — React hook wrapping the unified availability engine.
 *
 * Powered by asset_availability_view for consistent availability across
 * plan pickers, campaign pickers, reports, and tooltips.
 *
 * Usage:
 *   const { availabilityMap, loading, getStatus } = useUnifiedAvailability(assetIds, startDate, endDate);
 *   const summary = getStatus(assetId); // AssetAvailabilitySummary
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  getAssetAvailabilityBatch,
  type AssetAvailabilitySummary,
  type AvailabilityStatus,
} from "@/lib/availability";

interface UseUnifiedAvailabilityOptions {
  excludeCampaignId?: string | null;
  enabled?: boolean;
}

const VACANT_FALLBACK: AssetAvailabilitySummary = {
  asset_id: '',
  media_asset_code: null,
  location: null,
  availability_status: 'AVAILABLE',
  booking_type: null,
  blocking_entity_id: null,
  blocking_entity_name: null,
  client_name: null,
  booking_start: null,
  booking_end: null,
  next_available_date: null,
  is_available_for_range: true,
  all_bookings: [],
};

export function useUnifiedAvailability(
  assetIds: string[],
  rangeStart: string,
  rangeEnd: string,
  options?: UseUnifiedAvailabilityOptions
) {
  const { excludeCampaignId, enabled = true } = options || {};
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, AssetAvailabilitySummary>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchIdRef = useRef(0);

  // Stable key for dependency tracking
  const idsKey = useMemo(() => assetIds.join(','), [assetIds]);

  const fetchData = useCallback(async () => {
    if (!enabled || !rangeStart || !rangeEnd || assetIds.length === 0) {
      setAvailabilityMap(new Map());
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await getAssetAvailabilityBatch(
        assetIds,
        rangeStart,
        rangeEnd,
        excludeCampaignId
      );

      if (fetchId === fetchIdRef.current) {
        setAvailabilityMap(result);
      }
    } catch (err) {
      if (fetchId === fetchIdRef.current) {
        console.error("[useUnifiedAvailability] Error:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [idsKey, rangeStart, rangeEnd, excludeCampaignId, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Get availability for a single asset with safe fallback */
  const getStatus = useCallback(
    (assetId: string): AssetAvailabilitySummary => {
      return availabilityMap.get(assetId) || { ...VACANT_FALLBACK, asset_id: assetId };
    },
    [availabilityMap]
  );

  /** Check if an asset is available for the configured range */
  const isAvailable = useCallback(
    (assetId: string): boolean => {
      const summary = availabilityMap.get(assetId);
      return !summary || summary.is_available_for_range;
    },
    [availabilityMap]
  );

  /** Get badge color for status */
  const getStatusColor = useCallback(
    (assetId: string): string => {
      const summary = getStatus(assetId);
      switch (summary.availability_status) {
        case 'AVAILABLE': return 'green';
        case 'HELD': return 'yellow';
        case 'RUNNING': return 'red';
        case 'BOOKED': return 'red';
        case 'FUTURE_BOOKED': return 'orange';
        default: return 'gray';
      }
    },
    [getStatus]
  );

  return {
    availabilityMap,
    getStatus,
    isAvailable,
    getStatusColor,
    loading,
    error,
    refresh: fetchData,
  };
}
