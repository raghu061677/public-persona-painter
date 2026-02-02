// Shared utilities for Vacant Media Report exports

export type ExportSortOrder = 'location' | 'area' | 'city-area-location' | 'available-from';

export interface VacantAssetExportData {
  id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string;
  card_rate: number;
  total_sqft: number | null;
  status: string;
  next_available_from?: string;
  available_from?: string; // Added for explicit available from date
  direction?: string;
  illumination_type?: string;
  primary_photo_url?: string;
  latitude?: number;
  longitude?: number;
  qr_code_url?: string;
}

export interface StandardizedAssetRow {
  sNo: number;
  mediaType: string;
  city: string;
  area: string;
  location: string;
  direction: string;
  dimensions: string;
  sqft: number;
  illumination: string;
  cardRate: number;
  availableFrom: string; // Added
  status: string;
  // Original data for PPT image/QR needs
  originalAsset: VacantAssetExportData;
}

/**
 * Normalize string for comparison - handles null/undefined
 */
function normalizeString(val: string | null | undefined): string {
  return (val || '').trim().toLowerCase();
}

/**
 * Generate unique key for asset deduplication
 * Uses asset id as primary key, falls back to composite key
 */
export function getAssetUniqueKey(asset: VacantAssetExportData): string {
  // Primary: use asset ID
  if (asset.id) {
    return asset.id;
  }
  // Fallback: composite key
  return `${normalizeString(asset.city)}|${normalizeString(asset.area)}|${normalizeString(asset.location)}|${normalizeString(asset.direction)}|${normalizeString(asset.dimensions)}|${asset.total_sqft || 0}|${normalizeString(asset.illumination_type)}|${asset.card_rate || 0}`;
}

/**
 * Deduplicate assets by ID (or composite key as fallback)
 * Logs duplicates for debugging
 */
export function deduplicateAssets(assets: VacantAssetExportData[]): VacantAssetExportData[] {
  const seen = new Map<string, VacantAssetExportData>();
  const duplicates: { key: string; count: number; ids: string[] }[] = [];
  
  for (const asset of assets) {
    const key = getAssetUniqueKey(asset);
    if (seen.has(key)) {
      // Track duplicate
      const existing = duplicates.find(d => d.key === key);
      if (existing) {
        existing.count++;
        existing.ids.push(asset.id);
      } else {
        duplicates.push({ key, count: 2, ids: [seen.get(key)!.id, asset.id] });
      }
    } else {
      seen.set(key, asset);
    }
  }
  
  // Log duplicates if found
  if (duplicates.length > 0) {
    console.warn('[vacantMediaExport] Duplicates detected:', {
      totalDuplicateKeys: duplicates.length,
      duplicates: duplicates.slice(0, 10), // First 10
    });
  }
  
  return Array.from(seen.values());
}

/**
 * Sort assets based on selected order
 */
export function sortAssets(
  assets: VacantAssetExportData[],
  sortOrder: ExportSortOrder
): VacantAssetExportData[] {
  const sorted = [...assets];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (sortOrder) {
      case 'location':
        comparison = normalizeString(a.location).localeCompare(normalizeString(b.location));
        break;
        
      case 'area':
        comparison = normalizeString(a.area).localeCompare(normalizeString(b.area));
        break;
        
      case 'city-area-location':
        comparison = normalizeString(a.city).localeCompare(normalizeString(b.city));
        if (comparison === 0) {
          comparison = normalizeString(a.area).localeCompare(normalizeString(b.area));
        }
        if (comparison === 0) {
          comparison = normalizeString(a.location).localeCompare(normalizeString(b.location));
        }
        break;
        
      case 'available-from':
        // Sort by available_from date (earliest first)
        const dateA = a.available_from || a.next_available_from || '';
        const dateB = b.available_from || b.next_available_from || '';
        comparison = dateA.localeCompare(dateB);
        break;
    }
    
    // Tie-breaker: Location, then Media Type
    if (comparison === 0 && sortOrder !== 'location') {
      comparison = normalizeString(a.location).localeCompare(normalizeString(b.location));
    }
    if (comparison === 0) {
      comparison = normalizeString(a.media_type).localeCompare(normalizeString(b.media_type));
    }
    
    return comparison;
  });
  
  return sorted;
}

/**
 * Parse dimensions string to extract all faces (supports multi-face formats)
 * Single face: "20x10", "20 x 10", "20X10"
 * Multi-face: "25X5 - 12X3", "40x20-30x10", "25x5 - 12x3"
 */
function parseAllDimensions(dimensions: string | null | undefined): Array<{ width: number; height: number }> {
  if (!dimensions) return [];
  
  const cleaned = dimensions.trim();
  
  // Split by dash/hyphen to detect multi-face (but not negative numbers)
  const faceStrings = cleaned.split(/\s*[-–—]\s*/).filter(f => f.trim() && /\d/.test(f));
  
  const faces: Array<{ width: number; height: number }> = [];
  
  for (const faceStr of faceStrings) {
    const match = faceStr.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
    if (match) {
      const width = parseFloat(match[1]);
      const height = parseFloat(match[2]);
      if (width > 0 && height > 0) {
        faces.push({ width, height });
      }
    }
  }
  
  return faces;
}

/**
 * Calculate total square feet from dimensions (sum of all faces)
 */
function calculateSqft(asset: VacantAssetExportData): number {
  // If total_sqft is already available, use it
  if (asset.total_sqft && asset.total_sqft > 0) {
    return Math.round(asset.total_sqft * 100) / 100;
  }
  
  // Parse all faces from dimensions
  const faces = parseAllDimensions(asset.dimensions);
  if (faces.length > 0) {
    const totalSqft = faces.reduce((sum, face) => sum + (face.width * face.height), 0);
    return Math.round(totalSqft * 100) / 100;
  }
  
  return 0;
}

/**
 * Format dimensions string - PRESERVE ORIGINAL FORMAT for multi-face
 * Only normalize single-face dimensions
 */
function formatDimensions(asset: VacantAssetExportData): string {
  if (!asset.dimensions) return 'N/A';
  
  const trimmed = asset.dimensions.trim();
  if (!trimmed) return 'N/A';
  
  // Check if it's multi-face (contains a dash with dimensions on both sides)
  const hasDash = /\d\s*[-–—]\s*\d/.test(trimmed);
  
  if (hasDash) {
    // Multi-face: preserve original format, just clean up spacing
    return trimmed.replace(/\s*[-–—]\s*/g, ' - ').replace(/\s*[xX×]\s*/g, 'x');
  }
  
  // Single-face: normalize to "W x H" format
  const faces = parseAllDimensions(trimmed);
  if (faces.length === 1) {
    return `${faces[0].width} x ${faces[0].height}`;
  }
  
  // Fallback: return original
  return trimmed;
}

/**
 * Get illumination display value
 */
function getIllumination(asset: VacantAssetExportData): string {
  const illum = asset.illumination_type;
  if (!illum) return 'N/A';
  
  // Handle boolean-like values
  if (illum.toLowerCase() === 'yes' || illum.toLowerCase() === 'true') {
    return 'Yes';
  }
  if (illum.toLowerCase() === 'no' || illum.toLowerCase() === 'false') {
    return 'No';
  }
  
  // Return as-is for Frontlit/Backlit/Non-lit etc.
  return illum;
}

/**
 * Map asset status to display status
 */
function mapStatus(asset: VacantAssetExportData): string {
  const status = (asset.status || '').toLowerCase();
  
  // Check for "Available Soon" first
  if (asset.next_available_from || asset.available_from) {
    const nextAvailable = new Date(asset.next_available_from || asset.available_from || '');
    if (!isNaN(nextAvailable.getTime()) && nextAvailable > new Date()) {
      return 'Available Soon';
    }
  }
  
  // Standard mappings
  if (status === 'available' || status === 'vacant') {
    return 'Available';
  }
  if (status === 'booked' || status === 'occupied') {
    return 'Booked';
  }
  
  // Fallback to readable status
  return asset.status || 'Available';
}

/**
 * Format date to dd-MM-yyyy
 */
function formatAvailableFromDate(asset: VacantAssetExportData, defaultDate?: string): string {
  const dateStr = asset.available_from || asset.next_available_from || defaultDate;
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return '';
  }
}

/**
 * Standardize asset data for export with consistent fields
 * Now includes deduplication and Available From
 */
export function standardizeAssets(
  assets: VacantAssetExportData[],
  sortOrder: ExportSortOrder,
  defaultAvailableFrom?: string
): StandardizedAssetRow[] {
  // CRITICAL: Deduplicate first
  const deduped = deduplicateAssets(assets);
  
  // Log if counts differ
  if (assets.length !== deduped.length) {
    console.warn(`[standardizeAssets] Deduplication reduced ${assets.length} rows to ${deduped.length}`);
  }
  
  // Sort
  const sorted = sortAssets(deduped, sortOrder);
  
  // Map to standardized rows with sequential S.No
  return sorted.map((asset, index) => ({
    sNo: index + 1, // Reset S.No after dedup
    mediaType: asset.media_type || 'N/A',
    city: asset.city || 'N/A',
    area: asset.area || 'N/A',
    location: asset.location || 'N/A',
    direction: asset.direction || 'N/A',
    dimensions: formatDimensions(asset),
    sqft: calculateSqft(asset),
    illumination: getIllumination(asset),
    cardRate: asset.card_rate || 0,
    availableFrom: formatAvailableFromDate(asset, defaultAvailableFrom),
    status: mapStatus(asset),
    originalAsset: asset,
  }));
}

/**
 * Export column labels in exact order (now includes Available From before Status)
 */
export const EXPORT_COLUMNS = [
  'S.No',
  'Media Type',
  'City',
  'Area',
  'Location',
  'Direction',
  'Dimensions',
  'Sq.Ft',
  'Illumination',
  'Card Rate',
  'Available From',
  'Status',
] as const;

/**
 * Get column widths for Excel export (updated for 12 columns)
 */
export const EXCEL_COLUMN_WIDTHS = [
  6,   // S.No
  15,  // Media Type
  12,  // City
  15,  // Area
  30,  // Location
  12,  // Direction
  12,  // Dimensions
  10,  // Sq.Ft
  12,  // Illumination
  14,  // Card Rate
  14,  // Available From
  12,  // Status
];
