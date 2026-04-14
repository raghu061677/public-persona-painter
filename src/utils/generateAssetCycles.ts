/**
 * Asset Cycle Billing Generator
 * 
 * Generates 30-day billing cycles per campaign asset using the final negotiated price.
 * This is Phase 1: preview-only, no invoice generation.
 */

import { addDays, differenceInDays, format } from "date-fns";

export interface AssetCycle {
  assetId: string;
  campaignAssetId: string;
  location: string;
  area: string;
  city: string;
  mediaType: string;
  cycleNumber: number;
  cycleStart: Date;
  cycleEnd: Date;
  cycleDays: number;
  totalBookedDays: number;
  /** Final negotiated price (monthly) used as basis */
  finalMonthlyRate: number;
  perDayRate: number;
  cycleAmount: number;
  isPartial: boolean;
}

export interface GroupedCycleBucket {
  cycleNumber: number;
  periodStart: Date;
  periodEnd: Date;
  cycleDays: number;
  assets: AssetCycle[];
  totalAmount: number;
  isPartial: boolean;
}

/**
 * Resolve the authoritative booking window for an asset using the
 * operational source-of-truth hierarchy:
 *   effective_start/end > booking_start/end > start/end
 */
function resolveAssetDates(asset: any): { start: Date; end: Date } {
  const startStr =
    asset.effective_start_date || asset.booking_start_date || asset.start_date;
  const endStr =
    asset.effective_end_date || asset.booking_end_date || asset.end_date;
  return {
    start: new Date(startStr),
    end: new Date(endStr),
  };
}

/**
 * Generate 30-day billing cycles for a single campaign asset.
 * Uses final negotiated price only.
 */
function generateCyclesForAsset(asset: any): AssetCycle[] {
  const { start, end } = resolveAssetDates(asset);
  const totalBookedDays = differenceInDays(end, start) + 1; // inclusive

  if (totalBookedDays <= 0) return [];

  // CRITICAL: Use ONLY negotiated (final) price, fallback to card_rate
  const finalMonthlyRate =
    Number(asset.negotiated_rate) || Number(asset.card_rate) || 0;
  const perDayRate = finalMonthlyRate / 30; // standard 30-day month basis

  const cycles: AssetCycle[] = [];
  let cycleStart = new Date(start);
  let cycleNumber = 1;

  while (cycleStart <= end) {
    // Cycle end = cycleStart + 29 days (30-day window inclusive),
    // but capped at asset end date
    const naturalEnd = addDays(cycleStart, 29);
    const cycleEnd = naturalEnd > end ? end : naturalEnd;
    const cycleDays = differenceInDays(cycleEnd, cycleStart) + 1;
    const isPartial = cycleDays < 30;
    const cycleAmount = perDayRate * cycleDays;

    cycles.push({
      assetId: asset.asset_id,
      campaignAssetId: asset.id,
      location: asset.location || "",
      area: asset.area || "",
      city: asset.city || "",
      mediaType: asset.media_type || "",
      cycleNumber,
      cycleStart: new Date(cycleStart),
      cycleEnd: new Date(cycleEnd),
      cycleDays,
      totalBookedDays,
      finalMonthlyRate,
      perDayRate,
      cycleAmount,
      isPartial,
    });

    cycleStart = addDays(cycleEnd, 1);
    cycleNumber++;
  }

  return cycles;
}

/**
 * Generate cycles for all campaign assets, then group into billing buckets
 * by matching (cycleNumber across assets with same start date, or by
 * exact start+end date windows).
 */
export function generateAssetCycles(campaignAssets: any[]): {
  allCycles: AssetCycle[];
  groupedBuckets: GroupedCycleBucket[];
  totalAmount: number;
  totalCycles: number;
} {
  // Filter out removed assets
  const activeAssets = campaignAssets.filter((a) => !a.is_removed);

  const allCycles: AssetCycle[] = [];
  for (const asset of activeAssets) {
    const cycles = generateCyclesForAsset(asset);
    allCycles.push(...cycles);
  }

  // Group by exact start_date + end_date window
  const bucketMap = new Map<string, GroupedCycleBucket>();

  for (const cycle of allCycles) {
    const key = `${format(cycle.cycleStart, "yyyy-MM-dd")}_${format(cycle.cycleEnd, "yyyy-MM-dd")}`;
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        cycleNumber: 0, // assigned after sorting
        periodStart: cycle.cycleStart,
        periodEnd: cycle.cycleEnd,
        cycleDays: cycle.cycleDays,
        assets: [],
        totalAmount: 0,
        isPartial: cycle.isPartial,
      });
    }
    const bucket = bucketMap.get(key)!;
    bucket.assets.push(cycle);
    bucket.totalAmount += cycle.cycleAmount;
  }

  // Sort buckets by start date, then assign cycle numbers
  const groupedBuckets = Array.from(bucketMap.values()).sort(
    (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
  );
  groupedBuckets.forEach((b, i) => (b.cycleNumber = i + 1));

  const totalAmount = allCycles.reduce((s, c) => s + c.cycleAmount, 0);

  return {
    allCycles,
    groupedBuckets,
    totalAmount,
    totalCycles: groupedBuckets.length,
  };
}
