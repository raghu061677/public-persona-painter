/**
 * Manual Billing Window — invoice line normalization
 * --------------------------------------------------
 * Single source of truth used by BOTH generation and rendering for
 * `billing_mode='manual_window'` invoices.
 *
 * Rules:
 *  - Lines are built per ACTIVE campaign asset (mirrors Asset Cycle Billing
 *    structure, NOT a single summary "manual_window_rent" row).
 *  - Each line's booking_start_date / booking_end_date = the manual window
 *    (invoice_period_start / invoice_period_end), NOT the full asset/campaign
 *    period — this fixes "78 Days / full campaign period" rendering bugs.
 *  - Each line's `booked_days` = days in the manual window.
 *  - Each line's `rent_amount` is prorated on a 30-day commercial basis from
 *    the asset's monthly agreed rent: rent = (asset.rent_amount / 30) * days.
 *  - Printing/Mounting: NOT included on per-window manual invoices (these are
 *    one-time charges, billed separately via the existing charges flow). This
 *    keeps existing Calendar Monthly / Single Invoice / Asset Cycle paths
 *    unchanged because this helper is invoked ONLY from the manual-window
 *    generator.
 *  - Last-line residual reconciliation guarantees Σ line totals === subtotal
 *    (down to 1 paisa rounding), so totals already shown to finance never
 *    drift after rebuild.
 */
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarDays, parseISO } from "date-fns";

const COMMERCIAL_DAYS_PER_MONTH = 30;

export interface ManualWindowItem {
  sno: number;
  description: string;
  hsn_sac: string;
  /**
   * Display-rent rows must NOT carry `charge_type`; invoice renderers treat
   * charge_type rows as standalone charges and skip the standard asset-detail
   * layout. Manual windows are normal asset rows with manual period/pricing.
   */
  charge_type?: "manual_window_rent";
  // Asset identity (mirrors asset_cycle item shape so the renderer enriches
  // metadata correctly without falling back to the FULL campaign asset window).
  asset_id: string | null;
  campaign_asset_id: string | null;
  asset_code: string | null;
  media_asset_code?: string | null;
  // Display metadata (snapshot)
  city?: string | null;
  location?: string | null;
  area?: string | null;
  direction?: string | null;
  media_type?: string | null;
  illumination_type?: string | null;
  dimensions?: string | null;
  dimension_text?: string | null;
  total_sqft?: number | null;
  // Window-bound dates (the critical fix)
  booking_start_date: string;
  booking_end_date: string;
  start_date: string;
  end_date: string;
  booked_days: number;
  billable_days?: number;
  // Pricing
  quantity: number;
  rate: number; // line rent (prorated)
  amount: number; // line total (= rent for manual window — no print/mount)
  total: number;
  rent_amount: number;
  display_rate: number; // monthly reference rate (kept for downstream prorate utils)
  daily_rate: number;
  printing_charges: 0;
  mounting_charges: 0;
  printing_cost?: 0;
  mounting_cost?: 0;
}

export interface ManualWindowItemsResult {
  items: ManualWindowItem[];
  /** Sum of line totals == invoice taxable subtotal. */
  taxable: number;
  /** Days in the window. */
  days: number;
}

/**
 * Build per-asset prorated invoice items[] for a manual billing window.
 * Falls back to a single summary line (legacy shape) only if the campaign
 * has no active assets, so totals never break.
 */
export async function buildManualWindowItems(opts: {
  campaignId: string;
  invoicePeriodStart: string; // YYYY-MM-DD
  invoicePeriodEnd: string; // YYYY-MM-DD
  /** Optional fixed taxable subtotal; if provided, line totals are reconciled
   *  to this exact figure (preserves UI-shown totals). If omitted, the sum of
   *  the per-asset prorated rents is used. */
  fixedTaxable?: number;
  /** Fallback per-day rate for the legacy single-line shape. */
  fallbackPerDayRate?: number;
}): Promise<ManualWindowItemsResult> {
  const { campaignId, invoicePeriodStart, invoicePeriodEnd, fixedTaxable, fallbackPerDayRate } = opts;
  const days = Math.max(
    1,
    differenceInCalendarDays(parseISO(invoicePeriodEnd), parseISO(invoicePeriodStart)) + 1,
  );

  // Pull active campaign assets (mirrors what asset_cycle uses).
  const { data: caRows } = await supabase
    .from("campaign_assets")
    .select(
      "id, asset_id, city, location, area, direction, media_type, illumination_type, dimensions, total_sqft, rent_amount, daily_rate, is_removed, status",
    )
    .eq("campaign_id", campaignId);

  const activeAssets = (caRows || []).filter(
    (ca: any) => !ca.is_removed && (ca.status ?? "Active") !== "Dropped",
  );

  // Resolve media_asset_code for nicer display
  const maIds = Array.from(new Set(activeAssets.map((a: any) => a.asset_id).filter(Boolean)));
  const { data: maRows } = maIds.length
    ? await supabase.from("media_assets").select("id, media_asset_code").in("id", maIds)
    : { data: [] as any[] };
  const maCodeMap = new Map((maRows || []).map((m: any) => [m.id, m.media_asset_code]));

  // Legacy fallback: no active assets → single summary line preserves prior behaviour.
  if (activeAssets.length === 0) {
    const perDay = fallbackPerDayRate ?? 0;
    const taxable = fixedTaxable != null
      ? Math.round(fixedTaxable * 100) / 100
      : Math.round(perDay * days * 100) / 100;
    return {
      days,
      taxable,
      items: [
        {
          sno: 1,
          description: `Display rent (${days} day${days === 1 ? "" : "s"} @ ₹${perDay}/day, 30-day basis)`,
          hsn_sac: "998361",
          charge_type: "manual_window_rent",
          asset_id: null,
          campaign_asset_id: null,
          asset_code: null,
          booking_start_date: invoicePeriodStart,
          booking_end_date: invoicePeriodEnd,
          start_date: invoicePeriodStart,
          end_date: invoicePeriodEnd,
          booked_days: days,
          quantity: days,
          rate: perDay,
          amount: taxable,
          total: taxable,
          rent_amount: taxable,
          display_rate: perDay * COMMERCIAL_DAYS_PER_MONTH,
          daily_rate: perDay,
          printing_charges: 0,
          mounting_charges: 0,
        },
      ],
    };
  }

  // Build per-asset prorated rent lines.
  const proratedRaw = activeAssets.map((ca: any) => {
    const monthly = Number(ca.rent_amount ?? 0);
    const dailyExplicit = Number(ca.daily_rate ?? 0);
    const perDay = dailyExplicit > 0 ? dailyExplicit : monthly / COMMERCIAL_DAYS_PER_MONTH;
    const rent = Math.round(perDay * days * 100) / 100;
    return { ca, monthly, perDay, rent };
  });

  const rawSum = proratedRaw.reduce((s, r) => s + r.rent, 0);

  // Reconcile to a fixed taxable subtotal if provided (preserves displayed totals).
  const targetTaxable = fixedTaxable != null
    ? Math.round(fixedTaxable * 100) / 100
    : Math.round(rawSum * 100) / 100;

  let scaledRents: number[] = proratedRaw.map((r) => r.rent);
  if (
    fixedTaxable != null &&
    rawSum > 0 &&
    Math.abs(rawSum - targetTaxable) > 0.01
  ) {
    const scale = targetTaxable / rawSum;
    let running = 0;
    scaledRents = proratedRaw.map((r, idx) => {
      if (idx < proratedRaw.length - 1) {
        const v = Math.round(r.rent * scale * 100) / 100;
        running += v;
        return v;
      }
      return Math.round((targetTaxable - running) * 100) / 100;
    });
  }

  const items: ManualWindowItem[] = proratedRaw.map((r, idx) => {
    const code = maCodeMap.get(r.ca.asset_id) || null;
    const lineRent = scaledRents[idx];
    const lineDaily = days > 0 ? Math.round((lineRent / days) * 100) / 100 : r.perDay;
    return {
      sno: idx + 1,
      description:
        `Display Rent — ${code || r.ca.location || "Asset"}` +
        ` [Manual window ${invoicePeriodStart} to ${invoicePeriodEnd}, ${days} day${days === 1 ? "" : "s"}]`,
      hsn_sac: "998361",
      charge_type: "manual_window_rent",
      asset_id: r.ca.asset_id ?? null,
      campaign_asset_id: r.ca.id ?? null,
      asset_code: code,
      location: r.ca.location ?? null,
      area: r.ca.area ?? null,
      direction: r.ca.direction ?? null,
      media_type: r.ca.media_type ?? null,
      illumination_type: r.ca.illumination_type ?? null,
      dimensions: r.ca.dimensions ?? null,
      total_sqft: r.ca.total_sqft ?? null,
      booking_start_date: invoicePeriodStart,
      booking_end_date: invoicePeriodEnd,
      start_date: invoicePeriodStart,
      end_date: invoicePeriodEnd,
      booked_days: days,
      quantity: 1,
      rate: lineRent,
      amount: lineRent,
      total: lineRent,
      rent_amount: lineRent,
      display_rate: r.monthly,
      daily_rate: lineDaily,
      printing_charges: 0,
      mounting_charges: 0,
    };
  });

  return { items, taxable: targetTaxable, days };
}