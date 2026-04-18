/**
 * Derive printing panels from an existing dimensions string.
 *
 * Source of truth: `campaign_assets.dimensions` (fallback to `media_assets.dimensions`).
 * We do NOT ask users to re-enter sizes — we parse the multi-face string the app
 * already supports (e.g., "25x5 - 12x3", "40x20").
 *
 * Per-face illumination defaults to the asset-level illumination_type if present;
 * otherwise "Non Lit". Users can override per face in the editor.
 */
import { parseDimensions } from "@/utils/mediaAssets";
import {
  computePanel,
  getDefaultRates,
  type IlluminationType,
  type PrintingPanel,
} from "./printingDefaults";

export interface DeriveSource {
  dimensions?: string | null;
  illumination_type?: string | null;
}

function normalizeIllumination(raw?: string | null): IlluminationType {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "back lit" || s === "backlit" || s === "back_lit" || s === "lit")
    return "Back Lit";
  return "Non Lit";
}

/**
 * Derive panels from an asset's dimensions string.
 * Returns [] if dimensions are missing/invalid (caller should show legacy fallback).
 */
export function derivePanelsFromAsset(src: DeriveSource): PrintingPanel[] {
  const dims = (src.dimensions || "").trim();
  if (!dims) return [];
  const parsed = parseDimensions(dims);
  if (!parsed.faces.length) return [];

  const defaultIllum = normalizeIllumination(src.illumination_type);

  return parsed.faces.map((face, idx) => {
    const rates = getDefaultRates(defaultIllum);
    return computePanel({
      panel_name: face.label,
      width_ft: face.width,
      height_ft: face.height,
      illumination_type: defaultIllum,
      client_rate_per_sqft: rates.client,
      vendor_rate_per_sqft: rates.vendor,
      sort_order: idx,
    });
  });
}
