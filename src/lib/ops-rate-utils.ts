/**
 * Ops Rate Utilities — looks up rates from rate_settings table,
 * falls back to hardcoded defaults if no settings found.
 */

export interface RateSettingRow {
  id: string;
  category: string;
  city: string | null;
  media_type: string | null;
  rate_value: number;
  threshold_days: number | null;
  is_active: boolean;
  effective_from: string;
}

const DEFAULTS: Record<string, number> = {
  vendor_mounting: 700,
  vendor_unmounting: 350,
  vendor_print_nonlit: 6,
  vendor_print_backlit: 14,
  client_mounting_short: 1500,
  client_printing_markup: 0,
  client_unmounting: 0,
};

const DEFAULT_THRESHOLD = 90; // days

/**
 * Find best matching rate: city+media_type > city > media_type > default (null/null)
 * Among matches, pick the one with latest effective_from <= today.
 */
export type RateSource = "Default (Hardcoded)" | "Default" | "City Override" | "Media Override" | "City+Media Override";

export function resolveRate(
  rates: RateSettingRow[],
  category: string,
  city?: string | null,
  mediaType?: string | null,
): { rate: number; thresholdDays: number; source: RateSource } {
  const active = rates.filter(r => r.category === category && r.is_active);
  if (active.length === 0) {
    return { rate: DEFAULTS[category] ?? 0, thresholdDays: DEFAULT_THRESHOLD, source: "Default (Hardcoded)" };
  }

  const today = new Date().toISOString().slice(0, 10);

  // Score: city match +2, media_type match +1
  const scored = active
    .filter(r => r.effective_from <= today)
    .map(r => {
      let score = 0;
      if (r.city && city && r.city.toLowerCase() === city.toLowerCase()) score += 2;
      if (r.media_type && mediaType && r.media_type.toLowerCase() === mediaType.toLowerCase()) score += 1;
      // Penalize if rule specifies city/media but doesn't match
      if (r.city && (!city || r.city.toLowerCase() !== city.toLowerCase())) score -= 10;
      if (r.media_type && (!mediaType || r.media_type.toLowerCase() !== mediaType.toLowerCase())) score -= 10;
      return { ...r, score };
    })
    .filter(r => r.score >= 0)
    .sort((a, b) => b.score - a.score || b.effective_from.localeCompare(a.effective_from));

  const best = scored[0];
  if (!best) {
    return { rate: DEFAULTS[category] ?? 0, thresholdDays: DEFAULT_THRESHOLD, source: "Default (Hardcoded)" };
  }

  let source: RateSource = "Default";
  if (best.city && best.media_type) source = "City+Media Override";
  else if (best.city) source = "City Override";
  else if (best.media_type) source = "Media Override";

  return { rate: best.rate_value, thresholdDays: best.threshold_days ?? DEFAULT_THRESHOLD, source };
}

/**
 * Determine if printing is required for a campaign asset.
 * Infer from printing_cost > 0 if no explicit flag.
 */
export function isPrintingRequired(asset: {
  printing_cost?: number | null;
  printing_charges?: number | null;
}): boolean {
  return (asset.printing_cost ?? 0) > 0 || (asset.printing_charges ?? 0) > 0;
}

/**
 * Determine if illumination is backlit.
 */
export function isBacklit(illuminationType?: string | null): boolean {
  if (!illuminationType) return false;
  const lower = illuminationType.toLowerCase();
  return lower.includes("backlit") || lower.includes("back_lit") || lower === "bl";
}

/**
 * Calculate campaign duration in days.
 */
export function campaignDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

export interface OpsPayableLine {
  campaignId: string;
  campaignName: string;
  clientName: string;
  assetId: string;
  location: string;
  city: string;
  mediaType: string;
  totalSqft: number;
  mountingPayable: number;
  unmountingPayable: number;
  printingPayable: number;
  printingRequired: boolean;
  mountingMonth: string;
  unmountingMonth: string;
  illuminationType: string;
  /** Unmount approval status: NOT_REQUIRED | PENDING | APPROVED */
  unmountStatus: "NOT_REQUIRED" | "PENDING" | "APPROVED";
  /** Whether this line's unmount cost should be included in totals */
  unmountIncludeInTotals: boolean;
}

export interface OpsBillableLine extends OpsPayableLine {
  mountingBillable: number;
  printingBillable: number;
  unmountingBillable: number;
  durationDays: number;
}

export interface OpsMarginLine extends OpsBillableLine {
  mountingMargin: number;
  printingMargin: number;
  unmountingMargin: number;
  totalMargin: number;
  mountingRateSource: RateSource;
  printingRateSource: RateSource;
}

/**
 * Compute payable, billable, and margin lines for a set of campaign assets.
 */
export function computeOpsLines(
  campaignAssets: any[],
  campaigns: Map<string, { campaign_name: string; client_name: string; start_date: string; end_date: string }>,
  rates: RateSettingRow[],
): OpsMarginLine[] {
  return campaignAssets.map(ca => {
    const campaign = campaigns.get(ca.campaign_id);
    const campName = campaign?.campaign_name ?? "Unknown";
    const clientName = campaign?.client_name ?? "Unknown";
    const startDate = ca.booking_start_date || campaign?.start_date || "";
    const endDate = ca.booking_end_date || campaign?.end_date || "";
    const durationDays = startDate && endDate ? campaignDurationDays(startDate, endDate) : 0;
    const sqft = ca.total_sqft ?? 0;
    const printReq = isPrintingRequired(ca);
    const backlit = isBacklit(ca.illumination_type);

    // Unmount approval gating
    const unmountRequired: boolean = ca.unmount_required === true;
    const unmountApproved: boolean = ca.unmount_approved === true;
    const unmountStatus: "NOT_REQUIRED" | "PENDING" | "APPROVED" =
      !unmountRequired ? "NOT_REQUIRED" :
      unmountApproved ? "APPROVED" : "PENDING";
    const unmountIncludeInTotals = unmountStatus === "APPROVED";

    // Resolve rates with source tracking
    const mountResolved = resolveRate(rates, "vendor_mounting", ca.city, ca.media_type);
    const unmountRate = resolveRate(rates, "vendor_unmounting", ca.city, ca.media_type).rate;
    const printCategory = backlit ? "vendor_print_backlit" : "vendor_print_nonlit";
    const printResolved = resolveRate(rates, printCategory, ca.city, ca.media_type);

    const clientMount = resolveRate(rates, "client_mounting_short", ca.city, ca.media_type);
    const clientUnmount = resolveRate(rates, "client_unmounting", ca.city, ca.media_type).rate;

    const mountRate = mountResolved.rate;
    const printRate = printResolved.rate;

    // Payables
    const mountingPayable = mountRate;
    // Unmounting payable only generated if unmount is required; amount only counted if approved
    const unmountingPayable = unmountRequired ? unmountRate : 0;
    const printingPayable = printReq ? sqft * printRate : 0;

    // Billables
    const isShort = durationDays <= clientMount.thresholdDays;
    const mountingBillable = isShort ? clientMount.rate : (ca.mounting_charges ?? ca.mounting_cost ?? 0);
    const printingBillable = printReq ? (ca.printing_charges ?? ca.printing_cost ?? 0) : 0;
    const unmountingBillable = unmountRequired ? clientUnmount : 0;

    // Months
    const mountingMonth = startDate ? startDate.slice(0, 7) : "";
    const unmountingMonth = endDate ? endDate.slice(0, 7) : "";

    return {
      campaignId: ca.campaign_id,
      campaignName: campName,
      clientName,
      assetId: ca.asset_id,
      location: ca.location ?? "",
      city: ca.city ?? "",
      mediaType: ca.media_type ?? "",
      totalSqft: sqft,
      mountingPayable,
      unmountingPayable,
      printingPayable,
      printingRequired: printReq,
      mountingMonth,
      unmountingMonth,
      illuminationType: ca.illumination_type ?? "Non-Lit",
      unmountStatus,
      unmountIncludeInTotals,
      mountingBillable,
      printingBillable,
      unmountingBillable,
      durationDays,
      mountingMargin: mountingBillable - mountingPayable,
      printingMargin: printingBillable - printingPayable,
      unmountingMargin: unmountingBillable - unmountingPayable,
      totalMargin: (mountingBillable - mountingPayable) + (printingBillable - printingPayable) + (unmountingBillable - unmountingPayable),
      mountingRateSource: mountResolved.source,
      printingRateSource: printResolved.source,
    };
  });
}
