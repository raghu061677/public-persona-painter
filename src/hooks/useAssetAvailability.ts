/**
 * useAssetAvailability — React hook wrapping the shared availability engine.
 *
 * Provides booking/vacancy status for assets using campaign_assets date overlap
 * as the single source of truth. Never uses media_assets.status for booking decisions.
 *
 * Usage:
 *   const { availabilityMap, loading, refresh } = useAssetAvailability(assetIds, startDate, endDate);
 *   const result = availabilityMap.get(assetId); // AssetAvailabilityResult
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  batchGetAssetAvailability,
  type AssetAvailabilityResult,
} from "@/lib/availability";

interface UseAssetAvailabilityOptions {
  /** Campaign ID to exclude from conflict checks (for editing an existing campaign) */
  excludeCampaignId?: string | null;
  /** Whether to auto-fetch on mount / when inputs change */
  enabled?: boolean;
}

export function useAssetAvailability(
  assetIds: string[],
  rangeStart: string,
  rangeEnd: string,
  options?: UseAssetAvailabilityOptions
) {
  const { excludeCampaignId, enabled = true } = options || {};
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, AssetAvailabilityResult>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchIdRef = useRef(0);

  const fetch = useCallback(async () => {
    if (!enabled || !rangeStart || !rangeEnd || assetIds.length === 0) {
      setAvailabilityMap(new Map());
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await batchGetAssetAvailability(
        assetIds,
        rangeStart,
        rangeEnd,
        excludeCampaignId
      );

      // Only update if this is still the latest fetch
      if (fetchId === fetchIdRef.current) {
        setAvailabilityMap(result);
      }
    } catch (err) {
      if (fetchId === fetchIdRef.current) {
        console.error("[useAssetAvailability] Error:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [assetIds.join(","), rangeStart, rangeEnd, excludeCampaignId, enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  /** Get availability for a single asset, with a safe fallback */
  const getAvailability = useCallback(
    (assetId: string): AssetAvailabilityResult => {
      return (
        availabilityMap.get(assetId) || {
          availability: "Vacant" as const,
          hasConflict: false,
          allBookings: [],
        }
      );
    },
    [availabilityMap]
  );

  return {
    availabilityMap,
    getAvailability,
    loading,
    error,
    refresh: fetch,
  };
}
