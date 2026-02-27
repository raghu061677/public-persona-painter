/**
 * Hook: Computes campaign profitability by comparing revenue vs direct costs (expenses).
 * Used for the Profit Summary Box and the Profitability Lock on invoice generation.
 * Delegates to shared utility in src/utils/profitability.ts.
 */
import { useQuery } from "@tanstack/react-query";
import {
  computeCampaignProfitabilitySnapshot,
  getProfitLockSettings,
  setProfitLockSettings,
  type ProfitabilitySnapshot,
} from "@/utils/profitability";

export type CampaignProfitability = ProfitabilitySnapshot;

// Re-export for backward compatibility
export function getMinMarginThreshold(companyId?: string): number {
  return getProfitLockSettings(companyId).minMargin;
}

export function setMinMarginThreshold(companyId: string, percent: number) {
  setProfitLockSettings(companyId, { minMargin: percent });
}

export function isProfitLockEnabled(companyId?: string): boolean {
  return getProfitLockSettings(companyId).enabled;
}

export function useCampaignProfitability(campaignId: string | undefined, companyId: string | undefined, bookingValue: number = 0) {
  return useQuery({
    queryKey: ["campaign-profitability", campaignId, companyId],
    enabled: !!campaignId && !!companyId,
    queryFn: () => computeCampaignProfitabilitySnapshot(campaignId!, companyId!, bookingValue),
  });
}
