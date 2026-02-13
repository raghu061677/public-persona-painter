import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a campaign by either campaign_code or id.
 * If the param matches CAM-YYYYMM-NNNN, try campaign_code first.
 * Returns the actual campaign id for all DB operations.
 */
export function useCampaignResolver(param: string | undefined) {
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!param) { setLoading(false); return; }

    const resolve = async () => {
      setLoading(true);
      
      // If param looks like a campaign_code (CAM-YYYYMM-NNNN), try campaign_code first
      const isCodeFormat = /^CAM-\d{6}-\d{4}$/.test(param);
      
      if (isCodeFormat) {
        // Try by campaign_code
        const { data } = await supabase
          .from('campaigns')
          .select('id')
          .eq('campaign_code', param)
          .maybeSingle();
        
        if (data) {
          setResolvedId(data.id);
          setLoading(false);
          return;
        }
      }
      
      // Fallback: use param directly as id
      setResolvedId(param);
      setLoading(false);
    };

    resolve();
  }, [param]);

  return { resolvedId, loading };
}

/**
 * Returns the display code for a campaign.
 * Uses campaign_code if available, falls back to id.
 */
export function getCampaignDisplayCode(campaign: { campaign_code?: string | null; id: string }): string {
  return campaign.campaign_code || campaign.id;
}
