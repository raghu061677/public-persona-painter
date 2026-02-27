/**
 * Standardized Media Asset Excel Export
 * 
 * Fixed column order, deduplication by asset_id/media_asset_code, 
 * and City → MediaType → Location sorting.
 */
import type { ExcelFieldDef, RowStyleRule } from "./exportListExcel";

/** Canonical column order for all media-asset Excel exports */
export const ASSET_EXCEL_FIELDS: ExcelFieldDef[] = [
  { key: "sno",              label: "S.No",           width: 6,  type: "number", value: (_r, i) => i + 1 },
  { key: "media_asset_code", label: "Asset Code",     width: 18, type: "text" },
  { key: "media_type",       label: "Media Type",     width: 16, type: "text" },
  { key: "city",             label: "City",           width: 14, type: "text" },
  { key: "location",         label: "Location",       width: 30, type: "text" },
  { key: "area",             label: "Area / Address",  width: 20, type: "text" },
  { key: "facing",           label: "Facing",         width: 12, type: "text" },
  { key: "dimension",        label: "Size",           width: 14, type: "text" },
  { key: "total_sqft",       label: "Sq.Ft",          width: 10, type: "number" },
  { key: "illumination_type",label: "Lit Type",       width: 12, type: "text" },
  { key: "card_rate",        label: "Rate",           width: 12, type: "currency" },
  { key: "status",           label: "Status",         width: 14, type: "text" },
  { key: "available_from",   label: "Available From", width: 16, type: "text" },
  { key: "available_to",     label: "Available To",   width: 16, type: "text" },
  { key: "latitude",         label: "Latitude",       width: 12, type: "number" },
  { key: "longitude",        label: "Longitude",      width: 12, type: "number" },
];

/** Deduplicate rows by asset code or id */
export function deduplicateAssets<T extends Record<string, any>>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.media_asset_code || row.asset_id || row.id || "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Sort: City → Media Type → Location (A-Z) */
export function sortAssets<T extends Record<string, any>>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const cityA = (a.city || "").toLowerCase();
    const cityB = (b.city || "").toLowerCase();
    if (cityA !== cityB) return cityA.localeCompare(cityB);

    const typeA = (a.media_type || "").toLowerCase();
    const typeB = (b.media_type || "").toLowerCase();
    if (typeA !== typeB) return typeA.localeCompare(typeB);

    const locA = (a.location || "").toLowerCase();
    const locB = (b.location || "").toLowerCase();
    return locA.localeCompare(locB);
  });
}

/** Status-based row colouring for asset exports */
export const ASSET_ROW_STYLE_RULES: RowStyleRule[] = [
  { when: (r: any) => (r.status || "").toLowerCase() === "available", fill: { argb: "FFE8F5E9" } },
  { when: (r: any) => (r.status || "").toLowerCase().includes("soon"), fill: { argb: "FFFFF3E0" } },
  { when: (r: any) => (r.status || "").toLowerCase() === "booked",   fill: { argb: "FFFFEBEE" } },
  { when: (r: any) => (r.status || "").toLowerCase().includes("held") || (r.status || "").toLowerCase().includes("blocked"), fill: { argb: "FFF3E5F5" } },
];

/**
 * Prepare asset rows for export: deduplicate + sort + normalise fields.
 * Pass the raw rows from any source and get back clean, export-ready data.
 */
export function prepareAssetRows<T extends Record<string, any>>(rows: T[]): T[] {
  // Normalise: ensure media_asset_code falls back to id
  const normalised = rows.map((r) => ({
    ...r,
    media_asset_code: r.media_asset_code || r.id || "",
    // Resolve illumination from either column
    illumination_type: r.illumination_type || r.illumination || "",
    // Resolve facing from either column  
    facing: r.facing || r.direction || "",
    // Resolve dimension
    dimension: r.dimension || r.dimensions || "",
  }));

  return sortAssets(deduplicateAssets(normalised));
}
