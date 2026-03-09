/**
 * useAssetConflictCheck — Hook for checking asset booking conflicts.
 * Uses the canonical check_asset_conflict RPC (single source of truth).
 * 
 * For batch operations, prefer batchCheckConflicts from bookingEngine.ts directly.
 */

import { useState } from "react";
import { checkAssetConflict, type ConflictCheckResult } from "@/utils/bookingEngine";

export function useAssetConflictCheck() {
  const [checking, setChecking] = useState(false);

  const checkConflict = async (
    assetId: string,
    startDate: string,
    endDate: string,
    excludeCampaignId?: string
  ): Promise<ConflictCheckResult> => {
    setChecking(true);
    try {
      return await checkAssetConflict(assetId, startDate, endDate, excludeCampaignId);
    } finally {
      setChecking(false);
    }
  };

  return { checkConflict, checking };
}
