/**
 * Printing Costing — Defaults & Calculation Helpers
 *
 * Single source of truth for default per-sqft rates and panel-level math.
 * Used only by the Operations → Printing module. Never imported by
 * invoice/quotation/export code (which continues using legacy
 * campaign_assets.printing_charges).
 */

export type IlluminationType = "Non Lit" | "Back Lit";

export type PrintingPanel = {
  id?: string;
  campaign_asset_id?: string;
  panel_name: string;
  width_ft: number;
  height_ft: number;
  sqft: number;
  illumination_type: IlluminationType;
  client_rate_per_sqft: number;
  vendor_rate_per_sqft: number;
  client_amount: number;
  vendor_amount: number;
  margin_amount: number;
  printer_vendor_id?: string | null;
  printer_vendor_name?: string | null;
  printing_status?: string;
  payment_status?: string;
  notes?: string | null;
  sort_order?: number;
};

export const DEFAULT_PRINTING_RATES: Record<
  IlluminationType,
  { client: number; vendor: number }
> = {
  "Non Lit": { client: 10, vendor: 6 },
  "Back Lit": { client: 16, vendor: 14 },
};

export function getDefaultRates(illumination: IlluminationType) {
  return DEFAULT_PRINTING_RATES[illumination];
}

/**
 * Recompute sqft + amounts for a single panel based on its dimensions and rates.
 * Always returns a fully-populated panel (no NaN, all numeric fields rounded to 2 dp).
 */
export function computePanel(panel: Partial<PrintingPanel>): PrintingPanel {
  const w = Number(panel.width_ft) || 0;
  const h = Number(panel.height_ft) || 0;
  const sqft = round2(w * h);
  const illum: IlluminationType =
    panel.illumination_type === "Back Lit" ? "Back Lit" : "Non Lit";
  const defaults = getDefaultRates(illum);
  const clientRate =
    panel.client_rate_per_sqft != null && panel.client_rate_per_sqft !== 0
      ? Number(panel.client_rate_per_sqft)
      : defaults.client;
  const vendorRate =
    panel.vendor_rate_per_sqft != null && panel.vendor_rate_per_sqft !== 0
      ? Number(panel.vendor_rate_per_sqft)
      : defaults.vendor;
  const clientAmt = round2(sqft * clientRate);
  const vendorAmt = round2(sqft * vendorRate);
  return {
    id: panel.id,
    campaign_asset_id: panel.campaign_asset_id,
    panel_name: panel.panel_name || "Panel",
    width_ft: w,
    height_ft: h,
    sqft,
    illumination_type: illum,
    client_rate_per_sqft: clientRate,
    vendor_rate_per_sqft: vendorRate,
    client_amount: clientAmt,
    vendor_amount: vendorAmt,
    margin_amount: round2(clientAmt - vendorAmt),
    printer_vendor_id: panel.printer_vendor_id ?? null,
    printer_vendor_name: panel.printer_vendor_name ?? null,
    printing_status: panel.printing_status ?? "Pending",
    payment_status: panel.payment_status ?? "Unpaid",
    notes: panel.notes ?? null,
    sort_order: panel.sort_order ?? 0,
  };
}

export function sumPanels(panels: PrintingPanel[]) {
  return panels.reduce(
    (acc, p) => ({
      sqft: round2(acc.sqft + (p.sqft || 0)),
      client: round2(acc.client + (p.client_amount || 0)),
      vendor: round2(acc.vendor + (p.vendor_amount || 0)),
      margin: round2(acc.margin + (p.margin_amount || 0)),
    }),
    { sqft: 0, client: 0, vendor: 0, margin: 0 }
  );
}

function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
