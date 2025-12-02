import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ConflictCheckResult {
  has_conflict: boolean;
  conflicting_campaigns: Array<{
    campaign_id: string;
    campaign_name: string;
    client_name: string;
    start_date: string;
    end_date: string;
    status: string;
  }>;
}

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
      const { data, error } = await supabase.rpc('check_asset_conflict', {
        p_asset_id: assetId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_exclude_campaign_id: excludeCampaignId || null,
      });

      if (error) throw error;

      return (data as any) as ConflictCheckResult;
    } catch (error) {
      console.error('Conflict check error:', error);
      return {
        has_conflict: false,
        conflicting_campaigns: [],
      };
    } finally {
      setChecking(false);
    }
  };

  return { checkConflict, checking };
}