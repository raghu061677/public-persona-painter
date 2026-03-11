/**
 * Media Asset Code Audit & Repair Utilities
 * 
 * Provides detection, reporting, and safe repair for media_asset_code quality issues.
 * 
 * Business code field: media_assets.media_asset_code
 * Format: MNS-{CITY_CODE}-{TYPE_CODE}-{0001}
 * 
 * The UUID `id` column is the internal PK — never modified.
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TYPES
// ============================================================

export type IssueType = 
  | 'MISSING' 
  | 'UUID_AS_CODE' 
  | 'DUPLICATE' 
  | 'MALFORMED' 
  | 'CITY_MISMATCH' 
  | 'TYPE_MISMATCH' 
  | 'OK';

export interface AssetCodeAuditRow {
  id: string;
  current_asset_code: string | null;
  city: string;
  area: string;
  location: string;
  media_type: string;
  status: string;
  issue_type: IssueType;
  is_missing: boolean;
  is_uuid_like: boolean;
  is_duplicate: boolean;
  is_malformed: boolean;
  is_city_mismatch: boolean;
  is_type_mismatch: boolean;
  id_is_uuid: boolean;
  duplicate_count: number;
  proposed_code?: string;
}

export interface AuditSummary {
  total: number;
  ok: number;
  missing: number;
  uuid_as_code: number;
  duplicate: number;
  malformed: number;
  city_mismatch: number;
  type_mismatch: number;
}

export interface RepairProposal {
  id: string;
  old_code: string | null;
  new_code: string;
  issue_type: IssueType;
  city: string;
  area: string;
  location: string;
  media_type: string;
}

// ============================================================
// CITY / MEDIA TYPE CODE MAPPINGS
// ============================================================

const CITY_CODE_MAP: Record<string, string> = {
  'hyderabad': 'HYD',
  'karimnagar': 'KAR',
  'warangal': 'WRL',
  'vijayawada': 'VJA',
  'visakhapatnam': 'VSK',
  'bangalore': 'BLR',
  'bengaluru': 'BLR',
  'chennai': 'CHN',
  'mumbai': 'MUM',
  'delhi': 'DEL',
  'pune': 'PUN',
  'kolkata': 'KOL',
};

const MEDIA_TYPE_CODE_MAP: Record<string, string> = {
  'bus shelter': 'BQS',
  'bus queue shelter': 'BQS',
  'cantilever': 'CNT',
  'public utility': 'PUB',
  'unipole': 'UNI',
  'hoarding': 'HMG',
  'digital': 'DIG',
  'billboard': 'BLB',
  'gantry': 'GNT',
  'pole kiosk': 'PLK',
};

const COMPANY_PREFIX = 'MNS';

// ============================================================
// HELPERS
// ============================================================

function getCityCode(city: string): string {
  return CITY_CODE_MAP[city.toLowerCase().trim()] || city.substring(0, 3).toUpperCase();
}

function getMediaTypeCode(mediaType: string): string {
  return MEDIA_TYPE_CODE_MAP[mediaType.toLowerCase().trim()] || mediaType.substring(0, 3).toUpperCase();
}

function isUuidLike(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isValidBusinessCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^[A-Z]+-[A-Z]+-[A-Z]+-[0-9]{4}$/.test(code);
}

// ============================================================
// AUDIT QUERIES
// ============================================================

/**
 * Run full audit using the asset_code_audit_view
 */
export async function runFullAudit(): Promise<{ rows: AssetCodeAuditRow[]; summary: AuditSummary }> {
  const { data, error } = await supabase
    .from('asset_code_audit_view' as any)
    .select('*')
    .order('issue_type')
    .order('city')
    .order('media_type');

  if (error) {
    console.error('Audit view query failed, falling back to direct query:', error);
    return runDirectAudit();
  }

  const rows = (data || []) as unknown as AssetCodeAuditRow[];
  return { rows, summary: computeSummary(rows) };
}

/**
 * Fallback direct audit (if view doesn't exist)
 */
async function runDirectAudit(): Promise<{ rows: AssetCodeAuditRow[]; summary: AuditSummary }> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('id, media_asset_code, city, area, location, media_type, status, created_at')
    .order('city')
    .order('media_type');

  if (error) throw new Error(`Audit query failed: ${error.message}`);

  const rows: AssetCodeAuditRow[] = (data || []).map(row => {
    const code = row.media_asset_code;
    const isMissing = !code || code.trim() === '';
    const isUuid = isUuidLike(code);
    const isMalformed = !isMissing && !isUuid && !isValidBusinessCode(code);

    let issueType: IssueType = 'OK';
    if (isMissing) issueType = 'MISSING';
    else if (isUuid) issueType = 'UUID_AS_CODE';
    else if (isMalformed) issueType = 'MALFORMED';

    return {
      id: row.id,
      current_asset_code: code,
      city: row.city,
      area: row.area,
      location: row.location,
      media_type: row.media_type,
      status: row.status,
      issue_type: issueType,
      is_missing: isMissing,
      is_uuid_like: isUuid,
      is_duplicate: false,
      is_malformed: isMalformed,
      is_city_mismatch: false,
      is_type_mismatch: false,
      id_is_uuid: isUuidLike(row.id),
      duplicate_count: 0,
    };
  });

  // Detect duplicates
  const codeCounts = new Map<string, number>();
  rows.forEach(r => {
    if (r.current_asset_code) {
      codeCounts.set(r.current_asset_code, (codeCounts.get(r.current_asset_code) || 0) + 1);
    }
  });
  rows.forEach(r => {
    if (r.current_asset_code && (codeCounts.get(r.current_asset_code) || 0) > 1) {
      r.is_duplicate = true;
      r.duplicate_count = codeCounts.get(r.current_asset_code) || 0;
      if (r.issue_type === 'OK') r.issue_type = 'DUPLICATE';
    }
  });

  return { rows, summary: computeSummary(rows) };
}

function computeSummary(rows: AssetCodeAuditRow[]): AuditSummary {
  return {
    total: rows.length,
    ok: rows.filter(r => r.issue_type === 'OK').length,
    missing: rows.filter(r => r.issue_type === 'MISSING').length,
    uuid_as_code: rows.filter(r => r.issue_type === 'UUID_AS_CODE').length,
    duplicate: rows.filter(r => r.issue_type === 'DUPLICATE').length,
    malformed: rows.filter(r => r.issue_type === 'MALFORMED').length,
    city_mismatch: rows.filter(r => r.issue_type === 'CITY_MISMATCH').length,
    type_mismatch: rows.filter(r => r.issue_type === 'TYPE_MISMATCH').length,
  };
}

// ============================================================
// SEQUENCE GENERATION
// ============================================================

/**
 * Get next available sequence number for a given prefix
 */
export async function getNextSequence(prefix: string): Promise<number> {
  const { data } = await supabase
    .from('media_assets')
    .select('media_asset_code')
    .like('media_asset_code', `${prefix}%`)
    .order('media_asset_code', { ascending: false });

  if (!data || data.length === 0) return 1;

  let maxSeq = 0;
  for (const row of data) {
    const code = row.media_asset_code;
    if (!code) continue;
    const match = code.match(/-(\d{4})$/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  return maxSeq + 1;
}

/**
 * Generate a proper business code for an asset
 */
export async function generateAssetCode(
  city: string,
  mediaType: string,
  existingCodes: Set<string>
): Promise<string> {
  const cityCode = getCityCode(city);
  const typeCode = getMediaTypeCode(mediaType);
  const prefix = `${COMPANY_PREFIX}-${cityCode}-${typeCode}-`;

  let seq = await getNextSequence(prefix);
  let code = `${prefix}${String(seq).padStart(4, '0')}`;

  // Avoid collisions with codes we're generating in this batch
  while (existingCodes.has(code)) {
    seq++;
    code = `${prefix}${String(seq).padStart(4, '0')}`;
  }

  return code;
}

// ============================================================
// REPAIR LOGIC
// ============================================================

/**
 * Generate repair proposals (DRY RUN — no writes)
 * Only proposes changes for assets with issues
 */
export async function generateRepairProposals(): Promise<RepairProposal[]> {
  const { rows } = await runFullAudit();
  const badRows = rows.filter(r => r.issue_type !== 'OK');

  if (badRows.length === 0) return [];

  // Collect all existing valid codes to avoid collisions
  const existingCodes = new Set<string>();
  rows.forEach(r => {
    if (r.current_asset_code && r.issue_type === 'OK') {
      existingCodes.add(r.current_asset_code);
    }
  });

  const proposals: RepairProposal[] = [];

  for (const row of badRows) {
    const newCode = await generateAssetCode(row.city, row.media_type, existingCodes);
    existingCodes.add(newCode); // Reserve it for collision avoidance

    proposals.push({
      id: row.id,
      old_code: row.current_asset_code,
      new_code: newCode,
      issue_type: row.issue_type,
      city: row.city,
      area: row.area,
      location: row.location,
      media_type: row.media_type,
    });
  }

  return proposals;
}

/**
 * Apply repair proposals (WRITE MODE)
 * Updates media_asset_code for each proposal
 * Returns list of successfully updated IDs
 */
export async function applyRepairProposals(
  proposals: RepairProposal[]
): Promise<{ updated: string[]; failed: Array<{ id: string; error: string }> }> {
  const updated: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const proposal of proposals) {
    const { error } = await supabase
      .from('media_assets')
      .update({ media_asset_code: proposal.new_code })
      .eq('id', proposal.id);

    if (error) {
      failed.push({ id: proposal.id, error: error.message });
    } else {
      updated.push(proposal.id);
    }
  }

  return { updated, failed };
}

// ============================================================
// STANDALONE SQL QUERIES (for reference / manual use)
// ============================================================

export const AUDIT_SQL_QUERIES = {
  /** 1. Missing/blank asset codes */
  missing: `
SELECT id, media_asset_code, location, city, media_type, created_at
FROM media_assets
WHERE media_asset_code IS NULL
   OR trim(media_asset_code) = ''
ORDER BY city, media_type;`,

  /** 2. UUID-like asset codes */
  uuid_like: `
SELECT id, media_asset_code, location, city, media_type
FROM media_assets
WHERE media_asset_code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ORDER BY city, media_type;`,

  /** 3. Duplicate asset codes */
  duplicates: `
SELECT media_asset_code,
       count(*) AS duplicate_count,
       array_agg(id) AS asset_ids,
       array_agg(location) AS locations,
       array_agg(city) AS cities
FROM media_assets
WHERE media_asset_code IS NOT NULL AND trim(media_asset_code) != ''
GROUP BY media_asset_code
HAVING count(*) > 1
ORDER BY count(*) DESC;`,

  /** 4. Malformed codes (not matching MNS-XXX-XXX-0000) */
  malformed: `
SELECT id, media_asset_code, location, city, media_type
FROM media_assets
WHERE media_asset_code IS NOT NULL
  AND trim(media_asset_code) != ''
  AND media_asset_code !~ '^[0-9a-f]{8}-'  -- exclude UUIDs (separate query)
  AND media_asset_code !~ '^[A-Z]+-[A-Z]+-[A-Z]+-[0-9]{4}$'
ORDER BY media_asset_code;`,

  /** 5. City/type prefix mismatch */
  prefix_mismatch: `
WITH city_map(city_name, city_code) AS (VALUES
  ('Hyderabad','HYD'),('Karimnagar','KRM'),('Warangal','WRL'),
  ('Vijayawada','VJA'),('Visakhapatnam','VSK'),('Bangalore','BLR'),
  ('Chennai','CHN'),('Mumbai','MUM'),('Delhi','DEL')
),
type_map(type_name, type_code) AS (VALUES
  ('Bus Shelter','BQS'),('Bus Queue Shelter','BQS'),
  ('Cantilever','CNT'),('Public Utility','PUB'),
  ('Unipole','UNI'),('Hoarding','HMG'),('Digital','DIG')
)
SELECT m.id, m.media_asset_code, m.city, m.media_type,
       cm.city_code AS expected_city_code,
       tm.type_code AS expected_type_code,
       m.location
FROM media_assets m
LEFT JOIN city_map cm ON lower(m.city) = lower(cm.city_name)
LEFT JOIN type_map tm ON lower(m.media_type) = lower(tm.type_name)
WHERE m.media_asset_code IS NOT NULL
  AND (
    (cm.city_code IS NOT NULL AND m.media_asset_code NOT LIKE '%' || cm.city_code || '%')
    OR
    (tm.type_code IS NOT NULL AND m.media_asset_code NOT LIKE '%' || tm.type_code || '%')
  )
ORDER BY m.city, m.media_type;`,

  /** 6. UI fallback risk (bad code + has location) */
  ui_fallback_risk: `
SELECT id, media_asset_code, city, area, location, media_type
FROM media_assets
WHERE (
  media_asset_code IS NULL
  OR trim(media_asset_code) = ''
  OR media_asset_code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-'
)
AND location IS NOT NULL AND trim(location) != ''
ORDER BY city, area;`,

  /** 7. Dry-run repair preview */
  dry_run_preview: `
SELECT * FROM asset_code_audit_view WHERE issue_type != 'OK' ORDER BY city, media_type;`,

  /** 8. Next available sequence per prefix */
  next_sequence: `
SELECT
  substring(media_asset_code from '^(.+)-[0-9]{4}$') AS prefix,
  max(substring(media_asset_code from '-([0-9]{4})$')::int) AS max_seq,
  max(substring(media_asset_code from '-([0-9]{4})$')::int) + 1 AS next_seq,
  count(*) AS count
FROM media_assets
WHERE media_asset_code ~ '^[A-Z]+-[A-Z]+-[A-Z]+-[0-9]{4}$'
GROUP BY substring(media_asset_code from '^(.+)-[0-9]{4}$')
ORDER BY prefix;`,

  /** Full audit view query */
  full_audit: `SELECT * FROM asset_code_audit_view ORDER BY issue_type, city, media_type;`,
};
