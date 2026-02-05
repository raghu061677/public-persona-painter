import { getAssetDisplayCode } from './getAssetDisplayCode';

export function getCompanyAcronym(companyName?: string | null): string | null {
  const name = (companyName || '').trim();
  if (!name) return null;

  // Take first letter of up to 5 words ("Matrix Network Solutions" => "MNS")
  const parts = name
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean);

  if (parts.length === 0) return null;

  const acronym = parts
    .slice(0, 5)
    .map((p) => p[0]!.toUpperCase())
    .join('');

  return acronym || null;
}

export function formatAssetDisplayCode(params: {
  /** The human asset code from the asset record (e.g., HYD-BQS-0077 or MNS-HYD-BQS-0077) */
  mediaAssetCode?: string | null;
  /** Fallback identifier (UUID or stored asset_id) */
  fallbackId?: string | null;
  /** Explicit prefix if configured (e.g., MNS) */
  companyPrefix?: string | null;
  /** Used only if companyPrefix is missing */
  companyName?: string | null;
}): string {
  // Use getAssetDisplayCode utility to properly handle UUID fallbacks
  const base = getAssetDisplayCode(
    { media_asset_code: params.mediaAssetCode || null, asset_code: null },
    params.fallbackId
  );
  if (!base) return '';

  const prefix = (params.companyPrefix || getCompanyAcronym(params.companyName) || '').trim();
  if (!prefix) return base;

  // Avoid double-prefixing
  if (base.toUpperCase().startsWith(`${prefix.toUpperCase()}-`)) return base;

  return `${prefix}-${base}`;
}
