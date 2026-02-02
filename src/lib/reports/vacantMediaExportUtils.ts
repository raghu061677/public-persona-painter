// Unified export utilities for Vacant Media Report (v2.0)
// Single source of truth for standardization, deduplication, and column ordering

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
  available_from?: string; // YYYY-MM-DD format
  next_available_from?: string; // Legacy alias for available_from
  direction?: string;
  illumination_type?: string;
  primary_photo_url?: string;
  latitude?: number;
  longitude?: number;
  qr_code_url?: string;
  // Original availability status
  availability_status?: 'available' | 'booked';
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
  availableFrom: string; // dd-MM-yyyy format
  availability: string; // "Available" or "Booked"
  status: string; // Legacy alias for availability (backward compat)
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
 * Generate unique key for asset deduplication (STRICT: by asset_id only)
 */
export function getAssetUniqueKey(asset: VacantAssetExportData): string {
  // CRITICAL: Use asset ID as unique key - this is the ONLY dedup method
  return asset.id;
}

/**
 * Deduplicate assets strictly by asset_id
 * Logs duplicates for debugging
 */
export function deduplicateAssets(assets: VacantAssetExportData[]): VacantAssetExportData[] {
  const seen = new Map<string, VacantAssetExportData>();
  const duplicateIds: string[] = [];
  
  for (const asset of assets) {
    const key = asset.id;
    if (!key) {
      console.warn('[deduplicateAssets] Asset missing ID, skipping:', asset);
      continue;
    }
    
    if (seen.has(key)) {
      duplicateIds.push(key);
    } else {
      seen.set(key, asset);
    }
  }
  
  // Log duplicates if found
  if (duplicateIds.length > 0) {
    console.warn(`[deduplicateAssets] Removed ${duplicateIds.length} duplicate assets:`, duplicateIds.slice(0, 10));
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
    
    // Primary sort by availability status (Available first, Booked last)
    const statusA = a.availability_status === 'available' ? 0 : 1;
    const statusB = b.availability_status === 'available' ? 0 : 1;
    if (statusA !== statusB) {
      return statusA - statusB;
    }
    
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
        const dateA = a.available_from || '';
        const dateB = b.available_from || '';
        comparison = dateA.localeCompare(dateB);
        break;
    }
    
    // Tie-breaker: Location, then Area
    if (comparison === 0 && sortOrder !== 'location') {
      comparison = normalizeString(a.location).localeCompare(normalizeString(b.location));
    }
    if (comparison === 0) {
      comparison = normalizeString(a.area).localeCompare(normalizeString(b.area));
    }
    
    return comparison;
  });
  
  return sorted;
}

/**
 * Parse dimensions string to extract all faces (supports multi-face formats)
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
  if (!illum) return 'Non-lit';
  
  // Handle boolean-like values
  if (illum.toLowerCase() === 'yes' || illum.toLowerCase() === 'true') {
    return 'Lit';
  }
  if (illum.toLowerCase() === 'no' || illum.toLowerCase() === 'false') {
    return 'Non-lit';
  }
  
  // Return as-is for Frontlit/Backlit/Non-lit etc.
  return illum;
}

/**
 * Map asset availability status to display label
 */
function mapAvailability(asset: VacantAssetExportData): string {
  if (asset.availability_status === 'available') {
    return 'Available';
  }
  return 'Booked';
}

/**
 * Format date from YYYY-MM-DD to dd-MM-yyyy
 */
function formatAvailableFromDate(dateStr: string | undefined | null): string {
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
 * Includes deduplication and proper Available From handling
 */
export function standardizeAssets(
  assets: VacantAssetExportData[],
  sortOrder: ExportSortOrder,
  defaultAvailableFrom?: string
): StandardizedAssetRow[] {
  // CRITICAL: Deduplicate first by asset_id
  const deduped = deduplicateAssets(assets);
  
  // Log if counts differ
  if (assets.length !== deduped.length) {
    console.warn(`[standardizeAssets] Deduplication reduced ${assets.length} rows to ${deduped.length}`);
  }
  
  // Sort
  const sorted = sortAssets(deduped, sortOrder);
  
  // Map to standardized rows with sequential S.No
  return sorted.map((asset, index) => {
    // Available From logic:
    // - Available assets: use provided available_from or defaultAvailableFrom
    // - Booked assets: blank (no available_from)
    const availableFromRaw = asset.availability_status === 'available' 
      ? (asset.available_from || defaultAvailableFrom)
      : asset.available_from; // For booked assets with future availability
    
    const availabilityValue = mapAvailability(asset);
    return {
      sNo: index + 1,
      mediaType: asset.media_type || 'N/A',
      city: asset.city || 'N/A',
      area: asset.area || 'N/A',
      location: asset.location || 'N/A',
      direction: asset.direction || 'N/A',
      dimensions: formatDimensions(asset),
      sqft: calculateSqft(asset),
      illumination: getIllumination(asset),
      cardRate: asset.card_rate || 0,
      availableFrom: formatAvailableFromDate(availableFromRaw),
      availability: availabilityValue,
      status: availabilityValue, // Legacy alias for backward compat
      originalAsset: asset,
    };
  });
}

/**
 * Export column labels in exact order for "Export All Data" (Available + Booked)
 * Order: S.No, Media Type, City, Area, Location, Direction, Dimensions, Sq.Ft, Illumination, Card Rate, Available From, Availability
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
  'Availability',
] as const;

/**
 * Get column widths for Excel export (12 columns)
 */
export const EXCEL_COLUMN_WIDTHS = [
  6,   // S.No
  15,  // Media Type
  12,  // City
  15,  // Area
  30,  // Location
  12,  // Direction
  14,  // Dimensions
  10,  // Sq.Ft
  12,  // Illumination
  14,  // Card Rate
  14,  // Available From
  12,  // Availability
];
